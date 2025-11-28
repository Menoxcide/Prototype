/**
 * Organize converted GLB assets into biome-specific directories
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const CONVERTED_DIR = path.join(rootDir, 'temp', 'converted-glb')
const OUTPUT_BASE = path.join(rootDir, 'public', 'assets', 'models')

// Asset categorization rules
const CATEGORY_RULES = {
  // Floor tiles
  floor: {
    keywords: ['floortile', 'floor_tile', 'floor'],
    destination: 'biomes/sci-fi/floor'
  },
  // Walls
  walls: {
    keywords: ['wall', 'wall_'],
    destination: 'biomes/sci-fi/walls'
  },
  // Props
  props: {
    keywords: ['props_', 'prop_'],
    destination: 'props/sci-fi'
  },
  // Details
  details: {
    keywords: ['details_', 'detail_'],
    destination: 'props/details'
  },
  // Columns
  columns: {
    keywords: ['column'],
    destination: 'biomes/sci-fi/columns'
  },
  // Roof tiles
  roof: {
    keywords: ['rooftile', 'roof_tile', 'roof'],
    destination: 'biomes/sci-fi/roof'
  },
  // Doors
  doors: {
    keywords: ['door'],
    destination: 'biomes/sci-fi/doors'
  },
  // Stairs
  stairs: {
    keywords: ['stair', 'staircase'],
    destination: 'biomes/sci-fi/stairs'
  },
  // Pipes
  pipes: {
    keywords: ['pipe'],
    destination: 'props/pipes'
  }
}

/**
 * Categorize asset based on filename
 */
function categorizeAsset(filename) {
  const lowerName = filename.toLowerCase()
  
  for (const [category, rule] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of rule.keywords) {
      if (lowerName.includes(keyword)) {
        return {
          category,
          destination: rule.destination
        }
      }
    }
  }
  
  // Default to props if no match
  return {
    category: 'props',
    destination: 'props/sci-fi'
  }
}

/**
 * Organize all GLB files
 */
function organizeAssets() {
  console.log('Organizing converted assets...\n')

  if (!fs.existsSync(CONVERTED_DIR)) {
    console.error(`ERROR: Converted directory not found: ${CONVERTED_DIR}`)
    return
  }

  // Find all GLB files
  const glbFiles = []
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) {
        glbFiles.push(fullPath)
      }
    }
  }
  
  scanDirectory(CONVERTED_DIR)
  console.log(`Found ${glbFiles.length} GLB files\n`)

  if (glbFiles.length === 0) {
    console.log('No GLB files found to organize.')
    return
  }

  const organized = []
  const errors = []

  for (const filePath of glbFiles) {
    const fileName = path.basename(filePath)
    const relativePath = path.relative(CONVERTED_DIR, filePath)
    const { destination } = categorizeAsset(fileName)
    
    const destDir = path.join(OUTPUT_BASE, destination)
    const destPath = path.join(destDir, fileName)

    try {
      // Create destination directory
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }

      // Copy file (don't move, keep original)
      fs.copyFileSync(filePath, destPath)
      
      organized.push({
        source: relativePath,
        destination: path.join(destination, fileName),
        category: categorizeAsset(fileName).category
      })
      
      console.log(`  ✓ ${fileName} → ${destination}`)
    } catch (error) {
      errors.push({
        file: fileName,
        error: error.message
      })
      console.error(`  ✗ Failed to organize ${fileName}: ${error.message}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Organization Summary')
  console.log('='.repeat(60))
  console.log(`Total files:  ${glbFiles.length}`)
  console.log(`Organized:    ${organized.length}`)
  console.log(`Errors:       ${errors.length}`)
  
  // Group by category
  const byCategory = {}
  for (const item of organized) {
    if (!byCategory[item.category]) {
      byCategory[item.category] = 0
    }
    byCategory[item.category]++
  }
  
  console.log('\nBy category:')
  for (const [category, count] of Object.entries(byCategory)) {
    console.log(`  ${category}: ${count}`)
  }
  
  if (errors.length > 0) {
    console.log('\nErrors:')
    for (const err of errors) {
      console.log(`  ${err.file}: ${err.error}`)
    }
  }
  
  console.log('='.repeat(60))

  return { organized, errors }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  organizeAssets()
}

export { organizeAssets, categorizeAsset }

