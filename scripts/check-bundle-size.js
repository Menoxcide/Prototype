/**
 * Bundle Size Checker Script
 * Checks bundle sizes against budgets and reports results
 */

import { readFileSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BUNDLE_SIZE_BUDGETS = {
  'index': 500 * 1024, // 500KB
  'react-vendor': 300 * 1024, // 300KB
  'three-vendor': 300 * 1024, // 300KB
  'network-vendor': 200 * 1024, // 200KB
}

const distDir = join(__dirname, '..', 'dist', 'assets')

function getFileSize(filePath) {
  try {
    const stats = statSync(filePath)
    return stats.size
  } catch {
    return 0
  }
}

function findBundleFiles() {
  const bundles = {}
  
  // Try to find bundle files by pattern
  const patterns = [
    /^index-[a-zA-Z0-9]+\.js$/,
    /^react-vendor-[a-zA-Z0-9]+\.js$/,
    /^three-vendor-[a-zA-Z0-9]+\.js$/,
    /^network-vendor-[a-zA-Z0-9]+\.js$/,
  ]
  
  try {
    const files = readFileSync(join(__dirname, '..', 'dist', 'index.html'), 'utf-8')
    const scriptMatches = files.matchAll(/src="\/assets\/([^"]+\.js)"/g)
    
    for (const match of scriptMatches) {
      const fileName = match[1]
      const filePath = join(distDir, fileName)
      const size = getFileSize(filePath)
      
      // Match bundle name
      for (const [budgetName, pattern] of Object.entries(BUNDLE_SIZE_BUDGETS)) {
        if (fileName.includes(budgetName.replace('-vendor', ''))) {
          bundles[budgetName] = { fileName, size }
          break
        }
      }
    }
  } catch (error) {
    console.error('Error reading dist files:', error.message)
  }
  
  return bundles
}

function checkBundleSizes() {
  console.log('📦 Checking bundle sizes...\n')
  
  const bundles = findBundleFiles()
  let hasErrors = false
  let hasWarnings = false
  
  for (const [budgetName, budget] of Object.entries(BUNDLE_SIZE_BUDGETS)) {
    const bundle = bundles[budgetName]
    
    if (!bundle) {
      console.warn(`⚠️  Bundle not found: ${budgetName}`)
      continue
    }
    
    const sizeKB = (bundle.size / 1024).toFixed(2)
    const budgetKB = (budget / 1024).toFixed(2)
    const percentage = ((bundle.size / budget) * 100).toFixed(1)
    
    if (bundle.size > budget) {
      console.error(`❌ ${budgetName}: ${sizeKB}KB (budget: ${budgetKB}KB, ${percentage}%)`)
      hasErrors = true
    } else if (bundle.size > budget * 0.9) {
      console.warn(`⚠️  ${budgetName}: ${sizeKB}KB (budget: ${budgetKB}KB, ${percentage}%)`)
      hasWarnings = true
    } else {
      console.log(`✅ ${budgetName}: ${sizeKB}KB (budget: ${budgetKB}KB, ${percentage}%)`)
    }
  }
  
  console.log('')
  
  if (hasErrors) {
    console.error('❌ Bundle size budgets exceeded!')
    process.exit(1)
  } else if (hasWarnings) {
    console.warn('⚠️  Some bundles are approaching size limits')
    process.exit(0)
  } else {
    console.log('✅ All bundle sizes are within budget')
    process.exit(0)
  }
}

checkBundleSizes()

