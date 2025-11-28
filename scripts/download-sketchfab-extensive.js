/**
 * Extensive Sketchfab model download script
 * Uses Blender MCP tools or provides instructions for manual download
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { downloadFile } from './download-free-assets.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Sketchfab models to download
const SKETCHFAB_MODELS = [
  {
    name: 'cyberpunk-city',
    id: '3f24e5c5bf924f46b30d9a392afa9624',
    category: 'cyberpunk',
    url: null, // Requires Blender MCP or manual download
    license: 'CC0',
    source: 'Sketchfab - golukumar',
    description: 'Low poly cyberpunk city environment'
  },
  {
    name: 'sci-fi-computer-room',
    id: 'a149d5bfcef6496c9a0606b5ce5ebf27',
    category: 'sci-fi',
    url: null,
    license: 'CC0',
    source: 'Sketchfab',
    description: 'Sci-fi computer room interior'
  },
  {
    name: 'modular-sci-fi-corridor',
    id: null, // To be found
    category: 'sci-fi',
    url: null,
    license: 'CC0',
    source: 'Sketchfab',
    description: 'Modular sci-fi corridor pieces'
  }
]

/**
 * Generate download instructions
 */
function generateInstructions() {
  console.log('='.repeat(60))
  console.log('Sketchfab Model Download Instructions')
  console.log('='.repeat(60))
  console.log('\nUse Blender MCP tools to download models:\n')
  
  for (const model of SKETCHFAB_MODELS) {
    if (model.id) {
      console.log(`Model: ${model.name}`)
      console.log(`  ID: ${model.id}`)
      console.log(`  URL: https://sketchfab.com/3d-models/${model.name}-${model.id}`)
      console.log(`  Category: ${model.category}`)
      console.log(`  License: ${model.license}`)
      console.log(`  Description: ${model.description}`)
      console.log(`\n  Blender MCP Command:`)
      console.log(`    download_sketchfab_model({`)
      console.log(`      modelId: '${model.id}',`)
      console.log(`      format: 'glb'`)
      console.log(`    })`)
      console.log('')
    }
  }
  
  console.log('\nAlternative: Manual Download')
  console.log('1. Visit each model page')
  console.log('2. Click "Download" button')
  console.log('3. Select GLB format')
  console.log('4. Save to: public/assets/models/biomes/{category}/')
  console.log('='.repeat(60))
}

/**
 * Main function
 */
async function downloadSketchfabModels() {
  console.log('Sketchfab Extensive Download\n')
  
  generateInstructions()
  
  // If direct URLs are provided, download them
  let downloaded = 0
  for (const model of SKETCHFAB_MODELS) {
    if (model.url) {
      const modelDir = path.join(rootDir, 'public', 'assets', 'models', 'biomes', model.category)
      if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true })
      }
      
      const filename = `${model.name}.glb`
      const destPath = path.join(modelDir, filename)
      
      try {
        await downloadFile(model.url, destPath)
        console.log(`✓ Downloaded: ${filename}`)
        downloaded++
      } catch (error) {
        console.error(`✗ Failed: ${model.name} - ${error.message}`)
      }
    }
  }
  
  if (downloaded === 0) {
    console.log('\n⚠ No direct download URLs available.')
    console.log('Use Blender MCP tools or manual download as shown above.')
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadSketchfabModels().catch(console.error)
}

export { downloadSketchfabModels, SKETCHFAB_MODELS }

