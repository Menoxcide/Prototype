/**
 * Download textures from Poly Haven using API
 */

import { downloadPolyHavenTextures } from './download-free-assets.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const CONFIG_PATH = path.join(__dirname, 'polyhaven-textures.json')

async function downloadAllTextures() {
  console.log('='.repeat(60))
  console.log('Poly Haven Texture Downloader')
  console.log('='.repeat(60) + '\n')

  // Load configuration
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`ERROR: Configuration file not found: ${CONFIG_PATH}`)
    return
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  const resolution = config.resolution || '2k'

  let totalSuccess = 0
  let totalFail = 0

  // Download by category
  for (const [category, textureIds] of Object.entries(config)) {
    if (category === 'resolution' || category === 'note') continue
    
    if (Array.isArray(textureIds) && textureIds.length > 0) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Category: ${category.toUpperCase()}`)
      console.log(`${'='.repeat(60)}\n`)
      
      const { successCount, failCount } = await downloadPolyHavenTextures(
        textureIds,
        category,
        resolution
      )
      
      totalSuccess += successCount
      totalFail += failCount
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Download Summary')
  console.log('='.repeat(60))
  console.log(`Total successful: ${totalSuccess}`)
  console.log(`Total failed:     ${totalFail}`)
  console.log('='.repeat(60))
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllTextures().catch(console.error)
}

export { downloadAllTextures }

