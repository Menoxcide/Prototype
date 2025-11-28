/**
 * Download textures using verified texture IDs
 * Uses actual Poly Haven texture IDs found via API search
 */

import { downloadPolyHavenTexture, downloadPolyHavenTextures } from './download-free-assets.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try to load verified texture IDs
let VERIFIED_TEXTURES = {
  'sci-fi': [],
  'cyberpunk': [],
  'industrial': []
}

const verifiedPath = path.join(__dirname, 'valid-polyhaven-textures.json')
if (fs.existsSync(verifiedPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(verifiedPath, 'utf8'))
    // Use sample IDs if available
    if (data.sample && Array.isArray(data.sample)) {
      VERIFIED_TEXTURES['sci-fi'] = data.sample.slice(0, 5).map(t => t.id)
      VERIFIED_TEXTURES['cyberpunk'] = data.sample.slice(5, 10).map(t => t.id)
      VERIFIED_TEXTURES['industrial'] = data.sample.slice(10, 15).map(t => t.id)
    }
  } catch (error) {
    console.warn('Could not load verified textures, using fallback')
  }
}

/**
 * Download verified textures
 */
async function downloadVerifiedTextures() {
  console.log('='.repeat(60))
  console.log('Downloading Verified Poly Haven Textures')
  console.log('='.repeat(60))
  
  let totalSuccess = 0
  let totalFail = 0
  
  for (const [category, textureIds] of Object.entries(VERIFIED_TEXTURES)) {
    if (textureIds.length === 0) {
      console.log(`\n⚠ No verified textures for ${category}`)
      continue
    }
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Category: ${category.toUpperCase()}`)
    console.log(`Textures: ${textureIds.length}`)
    console.log(`${'='.repeat(60)}\n`)
    
    const { successCount, failCount } = await downloadPolyHavenTextures(
      textureIds,
      category,
      '2k'
    )
    
    totalSuccess += successCount
    totalFail += failCount
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('Download Summary')
  console.log('='.repeat(60))
  console.log(`Successful: ${totalSuccess}`)
  console.log(`Failed:    ${totalFail}`)
  console.log('='.repeat(60))
  
  if (totalSuccess > 0) {
    console.log('\n✅ Textures downloaded successfully!')
    console.log('Run: node scripts/update-asset-registry.js to update registry')
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadVerifiedTextures().catch(console.error)
}

export { downloadVerifiedTextures }

