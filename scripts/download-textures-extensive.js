/**
 * Extensive texture download script
 * Downloads textures from Poly Haven using direct URLs
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Known working Poly Haven texture IDs (verified)
const TEXTURE_SETS = {
  'sci-fi': [
    {
      id: 'metal_plate_01',
      name: 'Metal Plate 01',
      maps: ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    },
    {
      id: 'metal_plate_02',
      name: 'Metal Plate 02',
      maps: ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    },
    {
      id: 'metal_grate_01',
      name: 'Metal Grate 01',
      maps: ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    },
    {
      id: 'concrete_floor_01',
      name: 'Concrete Floor 01',
      maps: ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    }
  ],
  'cyberpunk': [
    {
      id: 'metal_rusty_01',
      name: 'Rusty Metal 01',
      maps: ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    },
    {
      id: 'concrete_damaged_01',
      name: 'Damaged Concrete 01',
      maps: ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    }
  ],
  'industrial': [
    {
      id: 'metal_plate_01',
      name: 'Metal Plate 01',
      maps: ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    },
    {
      id: 'concrete_floor_01',
      name: 'Concrete Floor 01',
      maps: ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    }
  ]
}

/**
 * Download file from URL
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close()
        fs.unlinkSync(destPath)
        return downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject)
      }
      
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(destPath)
        reject(new Error(`Failed: ${response.statusCode}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve(destPath)
      })
    }).on('error', (err) => {
      file.close()
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath)
      }
      reject(err)
    })
  })
}

/**
 * Get texture file info from Poly Haven API
 */
async function getTextureInfo(textureId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.polyhaven.com/files/${textureId}`
    
    https.get(url, (response) => {
      let data = ''
      
      response.on('data', (chunk) => {
        data += chunk
      })
      
      response.on('end', () => {
        try {
          const info = JSON.parse(data)
          resolve(info)
        } catch (error) {
          reject(new Error(`Parse error: ${data.substring(0, 100)}`))
        }
      })
    }).on('error', reject)
  })
}

/**
 * Download texture set
 */
async function downloadTextureSet(texture, category, resolution = '2k') {
  console.log(`\nDownloading: ${texture.name} (${texture.id})...`)
  
  try {
    const info = await getTextureInfo(texture.id)
    
    if (!info || !info[resolution]) {
      console.log(`  ⚠ Resolution ${resolution} not available, trying 1k...`)
      if (!info || !info['1k']) {
        console.log(`  ✗ Texture not found or unavailable`)
        return false
      }
      resolution = '1k'
    }
    
    const textureDir = path.join(rootDir, 'public', 'assets', 'textures', category, texture.id)
    if (!fs.existsSync(textureDir)) {
      fs.mkdirSync(textureDir, { recursive: true })
    }
    
    let downloaded = 0
    const maps = ['diffuse', 'normal_gl', 'roughness', 'metallic', 'ao']
    
    for (const mapType of maps) {
      const fileInfo = info[resolution]?.[mapType]
      if (!fileInfo) continue
      
      const url = fileInfo.jpg?.url || fileInfo.gl?.url
      if (!url) continue
      
      const ext = mapType === 'normal_gl' ? '.jpg' : '.jpg'
      const mapName = mapType === 'normal_gl' ? 'normal' : mapType
      const filename = `${texture.id}_${mapName}${ext}`
      const destPath = path.join(textureDir, filename)
      
      try {
        await downloadFile(url, destPath)
        downloaded++
        console.log(`  ✓ ${mapName}`)
      } catch (error) {
        console.log(`  ✗ ${mapName}: ${error.message}`)
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    return downloaded > 0
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`)
    return false
  }
}

/**
 * Download all textures
 */
async function downloadAllTextures() {
  console.log('='.repeat(60))
  console.log('Extensive Texture Download')
  console.log('='.repeat(60))
  
  let totalSuccess = 0
  let totalFail = 0
  
  for (const [category, textures] of Object.entries(TEXTURE_SETS)) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Category: ${category.toUpperCase()}`)
    console.log(`${'='.repeat(60)}`)
    
    for (const texture of textures) {
      const success = await downloadTextureSet(texture, category)
      if (success) {
        totalSuccess++
      } else {
        totalFail++
      }
      
      // Delay between textures
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('Download Summary')
  console.log('='.repeat(60))
  console.log(`Successful: ${totalSuccess}`)
  console.log(`Failed:    ${totalFail}`)
  console.log('='.repeat(60))
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllTextures().catch(console.error)
}

export { downloadAllTextures, downloadTextureSet }

