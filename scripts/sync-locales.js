/**
 * Localization Files Sync Script
 * 
 * Syncs all locale files with en.json as the master template.
 * - Identifies missing keys in each locale file
 * - Adds missing keys with English text as placeholder (marked with [TODO])
 * - Preserves existing translations
 * - Maintains consistent key ordering
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'game', 'data', 'locales')
const MASTER_LOCALE = 'en.json'
const LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'ru']

/**
 * Get all keys from an object recursively
 */
function getAllKeys(obj, prefix = '') {
  const keys = []
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey))
      } else {
        keys.push(fullKey)
      }
    }
  }
  return keys
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
 * Set nested value in object using dot notation
 */
function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

/**
 * Build object structure from master keys, preserving existing translations
 */
function buildSyncedObject(masterKeys, masterObj, existingObj) {
  const result = {}
  
  // Process keys in order to maintain structure
  const sortedKeys = masterKeys.sort()
  
  for (const keyPath of sortedKeys) {
    const keys = keyPath.split('.')
    const section = keys[0]
    
    // Initialize section if needed
    if (!result[section]) {
      result[section] = {}
    }
    
    // Get value from existing translation or use master with [TODO] marker
    const existingValue = getNestedValue(existingObj, keyPath)
    const masterValue = getNestedValue(masterObj, keyPath)
    
    if (existingValue !== undefined && typeof existingValue === 'string') {
      // Preserve existing translation
      setNestedValue(result, keyPath, existingValue)
    } else if (masterValue !== undefined && typeof masterValue === 'string') {
      // Add missing key with English text and [TODO] marker
      setNestedValue(result, keyPath, `[TODO] ${masterValue}`)
    }
  }
  
  return result
}

/**
 * Sort object keys recursively to match master structure
 * Preserves the original order from master object
 */
function sortObjectKeys(obj, masterObj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj
  }
  
  const sorted = {}
  
  // Preserve master's key order (don't sort alphabetically)
  const masterKeys = Object.keys(masterObj || {})
  
  // First, add keys in master order
  for (const key of masterKeys) {
    if (key in obj) {
      if (typeof masterObj[key] === 'object' && masterObj[key] !== null && !Array.isArray(masterObj[key])) {
        sorted[key] = sortObjectKeys(obj[key], masterObj[key])
      } else {
        sorted[key] = obj[key]
      }
    }
  }
  
  // Then add any extra keys not in master (in their original order)
  for (const key in obj) {
    if (!(key in sorted)) {
      sorted[key] = obj[key]
    }
  }
  
  return sorted
}

/**
 * Main sync function
 */
function syncLocales() {
  console.log('🔄 Starting locale files sync...\n')
  
  // Read master locale (en.json)
  const masterPath = path.join(LOCALES_DIR, MASTER_LOCALE)
  let masterContent
  try {
    masterContent = JSON.parse(fs.readFileSync(masterPath, 'utf8'))
  } catch (error) {
    console.error(`❌ Error reading master locale (${MASTER_LOCALE}):`, error.message)
    process.exit(1)
  }
  
  const masterKeys = getAllKeys(masterContent)
  console.log(`📋 Master locale (${MASTER_LOCALE}) has ${masterKeys.length} keys\n`)
  
  const report = {
    missingKeys: {},
    addedKeys: {},
    totalMissing: 0,
    totalAdded: 0
  }
  
  // Process each locale file
  for (const locale of LOCALES) {
    if (locale === 'en') continue // Skip master
    
    const localeFile = `${locale}.json`
    const localePath = path.join(LOCALES_DIR, localeFile)
    
    console.log(`📝 Processing ${localeFile}...`)
    
    let existingContent
    try {
      existingContent = JSON.parse(fs.readFileSync(localePath, 'utf8'))
    } catch (error) {
      console.error(`   ⚠️  Error reading ${localeFile}:`, error.message)
      console.log(`   📝 Creating new file from master...`)
      existingContent = {}
    }
    
    const existingKeys = getAllKeys(existingContent)
    const missingKeys = masterKeys.filter(key => !existingKeys.includes(key))
    
    if (missingKeys.length > 0) {
      console.log(`   ⚠️  Found ${missingKeys.length} missing keys`)
      report.missingKeys[locale] = missingKeys
      report.totalMissing += missingKeys.length
    } else {
      console.log(`   ✅ All keys present`)
    }
    
    // Build synced object
    const syncedContent = buildSyncedObject(masterKeys, masterContent, existingContent)
    
    // Sort to match master structure
    const sortedContent = sortObjectKeys(syncedContent, masterContent)
    
    // Count added keys (those with [TODO] marker)
    const addedCount = Object.values(sortedContent)
      .flatMap(section => Object.values(section))
      .filter(value => typeof value === 'string' && value.startsWith('[TODO]'))
      .length
    
    if (addedCount > 0) {
      report.addedKeys[locale] = addedCount
      report.totalAdded += addedCount
      console.log(`   ➕ Added ${addedCount} missing keys with [TODO] markers`)
    }
    
    // Write synced content
    try {
      fs.writeFileSync(
        localePath,
        JSON.stringify(sortedContent, null, 2) + '\n',
        'utf8'
      )
      console.log(`   ✅ Updated ${localeFile}\n`)
    } catch (error) {
      console.error(`   ❌ Error writing ${localeFile}:`, error.message)
    }
  }
  
  // Print summary report
  console.log('\n' + '='.repeat(60))
  console.log('📊 SYNC SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total missing keys found: ${report.totalMissing}`)
  console.log(`Total keys added: ${report.totalAdded}\n`)
  
  if (Object.keys(report.missingKeys).length > 0) {
    console.log('Missing keys by locale:')
    for (const [locale, keys] of Object.entries(report.missingKeys)) {
      console.log(`  ${locale}: ${keys.length} keys`)
      if (keys.length <= 10) {
        keys.forEach(key => console.log(`    - ${key}`))
      } else {
        keys.slice(0, 5).forEach(key => console.log(`    - ${key}`))
        console.log(`    ... and ${keys.length - 5} more`)
      }
    }
  }
  
  if (report.totalMissing === 0 && report.totalAdded === 0) {
    console.log('\n✅ All locale files are in sync!')
  } else {
    console.log('\n⚠️  Some locale files had missing keys. They have been added with [TODO] markers.')
    console.log('   Please translate the [TODO] entries in each locale file.')
  }
  
  console.log('\n')
}

// Run the sync
syncLocales()

