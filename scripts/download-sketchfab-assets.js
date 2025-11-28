/**
 * Download free models from Sketchfab
 * Note: Sketchfab requires authentication for downloads
 * This script provides structure for manual download workflow
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { downloadFile } from './download-free-assets.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Sketchfab models to download (requires manual download links)
const SKETCHFAB_MODELS = [
  {
    name: 'cyberpunk-city',
    id: '3f24e5c5bf924f46b30d9a392afa9624',
    category: 'cyberpunk',
    url: null, // Requires manual download from Sketchfab
    license: 'CC0',
    source: 'Sketchfab - golukumar'
  },
  {
    name: 'sci-fi-computer-room',
    id: 'a149d5bfcef6496c9a0606b5ce5ebf27',
    category: 'sci-fi',
    url: null, // Requires manual download from Sketchfab
    license: 'CC0',
    source: 'Sketchfab - Michael V'
  }
]

/**
 * Download Sketchfab model if direct URL is provided
 */
async function downloadSketchfabModel(model) {
  if (!model.url) {
    console.log(`  ⚠ Manual download required: ${model.name}`)
    console.log(`    Visit: https://sketchfab.com/3d-models/${model.name}-${model.id}`)
    return false
  }

  const modelDir = path.join(rootDir, 'public', 'assets', 'models', 'biomes', model.category)
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true })
  }

  const filename = `${model.name}.glb`
  const destPath = path.join(modelDir, filename)

  try {
    await downloadFile(model.url, destPath)
    console.log(`  ✓ Downloaded ${filename}`)
    return true
  } catch (error) {
    console.error(`  ✗ Failed to download ${model.name}: ${error.message}`)
    return false
  }
}

/**
 * Generate download instructions
 */
function generateDownloadInstructions() {
  console.log('='.repeat(60))
  console.log('Sketchfab Download Instructions')
  console.log('='.repeat(60))
  console.log('\nSketchfab requires manual downloads or API authentication.')
  console.log('To download models:\n')
  
  for (const model of SKETCHFAB_MODELS) {
    console.log(`1. ${model.name}`)
    console.log(`   URL: https://sketchfab.com/3d-models/${model.name}-${model.id}`)
    console.log(`   Category: ${model.category}`)
    console.log(`   License: ${model.license}`)
    console.log(`   Source: ${model.source}\n`)
  }
  
  console.log('Steps:')
  console.log('1. Visit each model page')
  console.log('2. Click "Download" button')
  console.log('3. Select GLB format')
  console.log('4. Save to appropriate biome folder')
  console.log('5. Update SKETCHFAB_MODELS array with file paths\n')
}

/**
 * Main function
 */
async function downloadSketchfabAssets() {
  console.log('Sketchfab Asset Downloader\n')
  
  generateDownloadInstructions()
  
  let successCount = 0
  let manualCount = 0
  
  for (const model of SKETCHFAB_MODELS) {
    if (model.url) {
      const success = await downloadSketchfabModel(model)
      if (success) successCount++
    } else {
      manualCount++
    }
  }
  
  if (manualCount > 0) {
    console.log(`\n⚠ ${manualCount} models require manual download`)
  }
  
  console.log(`\n✓ Processed ${SKETCHFAB_MODELS.length} models`)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadSketchfabAssets().catch(console.error)
}

export { downloadSketchfabAssets, SKETCHFAB_MODELS }

