/**
 * Verify Translation Keys Script
 * 
 * Extracts all translation keys used in the codebase and verifies
 * they exist in all locale files.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'game', 'data', 'locales')
const SRC_DIR = path.join(__dirname, '..', 'src')
const LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'ru']

/**
 * Recursively get all TypeScript/TSX/JS/JSX files
 */
function getAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      // Skip node_modules and dist directories
      if (file === 'node_modules' || file === 'dist' || file === '.git') {
        continue
      }
      getAllSourceFiles(filePath, fileList)
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath)
    }
  }
  
  return fileList
}

/**
 * Check if a string looks like a valid translation key
 */
function isValidTranslationKey(key) {
  // Must contain a dot (section.key format)
  if (!key.includes('.')) {
    return false
  }
  
  // Must not contain path separators
  if (key.includes('/') || key.includes('\\')) {
    return false
  }
  
  // Must not be just a single character or special chars
  if (key.length < 3 || key === '.' || key.startsWith('.') || key.endsWith('.')) {
    return false
  }
  
  // Must not contain template literal syntax
  if (key.includes('${') || key.includes('`')) {
    return false
  }
  
  // Must not be HTML tags or common variable names
  const invalidPatterns = [
    /^(div|span|p|h1|h2|h3|button|input|canvas|textarea)$/i,
    /^(attack|cast|death|hit|idle|run|walk|south|high|low|medium|grass|roads|pavement)$/i,
    /^(en|es|fr|de|ja|zh|ar|ru)$/i,
    /^(phase1|phase2|phase3|entity1|nipplejs|three)$/i,
  ]
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(key)) {
      return false
    }
  }
  
  // Must match pattern: section.key (e.g., common.close, settings.title)
  const validPattern = /^[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9]+$/
  return validPattern.test(key)
}

/**
 * Extract translation keys from a file
 */
function extractKeysFromFile(filePath) {
  const keys = new Set()
  
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Match t('key') or t("key") patterns
    const pattern = /t\(['"]([^'"]+)['"]/g
    
    let match
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1]
      // Only add if it's a valid translation key
      if (isValidTranslationKey(key)) {
        keys.add(key)
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
  
  return Array.from(keys)
}

/**
 * Extract translation keys from codebase
 */
function extractTranslationKeys() {
  const keys = new Set()
  const files = getAllSourceFiles(SRC_DIR)
  
  console.log(`   Scanning ${files.length} source files...`)
  
  for (const file of files) {
    const fileKeys = extractKeysFromFile(file)
    fileKeys.forEach(key => keys.add(key))
  }
  
  return Array.from(keys).sort()
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, keyPath) {
  const keys = keyPath.split('.')
  let current = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return undefined
    }
  }
  return current
}

/**
 * Verify keys exist in locale file
 */
function verifyKeysInLocale(locale, keys) {
  const localeFile = path.join(LOCALES_DIR, `${locale}.json`)
  let localeContent
  try {
    localeContent = JSON.parse(fs.readFileSync(localeFile, 'utf8'))
  } catch (error) {
    console.error(`Error reading ${localeFile}:`, error.message)
    return { missing: keys, total: keys.length }
  }
  
  const missing = []
  for (const key of keys) {
    const value = getNestedValue(localeContent, key)
    if (value === undefined || typeof value !== 'string') {
      missing.push(key)
    }
  }
  
  return { missing, total: keys.length }
}

/**
 * Main verification function
 */
function verifyTranslationKeys() {
  console.log('🔍 Extracting translation keys from codebase...\n')
  
  const keys = extractTranslationKeys()
  console.log(`📋 Found ${keys.length} unique translation keys in codebase\n`)
  
  if (keys.length === 0) {
    console.log('⚠️  No translation keys found. This might indicate an issue with the extraction.')
    return
  }
  
  console.log('Translation keys found:')
  keys.forEach(key => console.log(`  - ${key}`))
  console.log('\n')
  
  console.log('🔍 Verifying keys in locale files...\n')
  
  const report = {
    allKeys: keys,
    missingByLocale: {},
    totalMissing: 0
  }
  
  for (const locale of LOCALES) {
    const { missing, total } = verifyKeysInLocale(locale, keys)
    if (missing.length > 0) {
      report.missingByLocale[locale] = missing
      report.totalMissing += missing.length
      console.log(`❌ ${locale}.json: ${missing.length}/${total} keys missing`)
      missing.forEach(key => console.log(`   - ${key}`))
    } else {
      console.log(`✅ ${locale}.json: All ${total} keys present`)
    }
    console.log('')
  }
  
  // Print summary
  console.log('='.repeat(60))
  console.log('📊 VERIFICATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total keys in codebase: ${keys.length}`)
  console.log(`Total missing keys: ${report.totalMissing}\n`)
  
  if (report.totalMissing === 0) {
    console.log('✅ All translation keys used in codebase exist in all locale files!')
  } else {
    console.log('⚠️  Some translation keys are missing from locale files:')
    for (const [locale, missing] of Object.entries(report.missingByLocale)) {
      console.log(`\n  ${locale}.json (${missing.length} missing):`)
      missing.forEach(key => console.log(`    - ${key}`))
    }
  }
  
  console.log('\n')
}

// Run verification
verifyTranslationKeys()

