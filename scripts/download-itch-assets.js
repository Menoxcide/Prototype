/**
 * Download free assets from itch.io
 * Note: itch.io downloads may require browser interaction
 * This script provides structure for manual download workflow
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { downloadFile } from './download-free-assets.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// itch.io assets to download
const ITCH_ASSETS = [
  {
    name: 'kaykit-space-base-bits',
    url: 'https://kaylousberg.itch.io/space-base-bits',
    category: 'sci-fi',
    directDownload: null, // Requires manual download
    license: 'CC0',
    description: 'Low poly 3D game assets for building space bases'
  },
  {
    name: 'retro-cybercity-streets',
    url: 'https://everlywritesgames.itch.io/retro-cyberpunk-streets-tileset',
    category: 'cyberpunk',
    directDownload: null,
    license: 'CC0',
    description: '16x16 Tiles and Game Assets'
  },
  {
    name: 'cyberpunk-character-pack',
    url: 'https://oco.itch.io/cyberpunk-character-pack',
    category: 'cyberpunk',
    directDownload: null,
    license: 'CC0',
    description: 'Asset pack with main character and 4 enemy types'
  }
]

/**
 * Download itch.io asset if direct URL is provided
 */
async function downloadItchAsset(asset) {
  if (!asset.directDownload) {
    console.log(`  ⚠ Manual download required: ${asset.name}`)
    console.log(`    Visit: ${asset.url}`)
    return false
  }

  const assetDir = path.join(rootDir, 'public', 'assets', 'models', 'biomes', asset.category)
  if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, { recursive: true })
  }

  // Extract filename from URL or use asset name
  const filename = asset.directDownload.split('/').pop() || `${asset.name}.zip`
  const destPath = path.join(assetDir, filename)

  try {
    await downloadFile(asset.directDownload, destPath)
    console.log(`  ✓ Downloaded ${filename}`)
    return true
  } catch (error) {
    console.error(`  ✗ Failed to download ${asset.name}: ${error.message}`)
    return false
  }
}

/**
 * Generate download instructions
 */
function generateDownloadInstructions() {
  console.log('='.repeat(60))
  console.log('itch.io Download Instructions')
  console.log('='.repeat(60))
  console.log('\nitch.io assets require manual downloads.\n')
  
  for (const asset of ITCH_ASSETS) {
    console.log(`• ${asset.name}`)
    console.log(`  URL: ${asset.url}`)
    console.log(`  Category: ${asset.category}`)
    console.log(`  Description: ${asset.description}`)
    console.log(`  License: ${asset.license}\n`)
  }
  
  console.log('Steps:')
  console.log('1. Visit each asset page')
  console.log('2. Click "Download" or "Download Now" (free assets)')
  console.log('3. Extract ZIP files if needed')
  console.log('4. Convert to GLB format if needed')
  console.log('5. Organize into appropriate biome folders\n')
}

/**
 * Main function
 */
async function downloadItchAssets() {
  console.log('itch.io Asset Downloader\n')
  
  generateDownloadInstructions()
  
  let successCount = 0
  let manualCount = 0
  
  for (const asset of ITCH_ASSETS) {
    if (asset.directDownload) {
      const success = await downloadItchAsset(asset)
      if (success) successCount++
    } else {
      manualCount++
    }
  }
  
  if (manualCount > 0) {
    console.log(`\n⚠ ${manualCount} assets require manual download`)
  }
  
  console.log(`\n✓ Processed ${ITCH_ASSETS.length} assets`)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadItchAssets().catch(console.error)
}

export { downloadItchAssets, ITCH_ASSETS }

