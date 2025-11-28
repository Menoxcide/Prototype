/**
 * Script to download free 3D models and textures from various sources
 * Supports direct downloads and organizes assets by biome/type
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

// Poly Haven API base URL
const POLYHAVEN_API = 'https://api.polyhaven.com'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Asset sources with direct download links
const ASSET_SOURCES = {
  // Poly Haven textures (direct download)
  textures: [
    {
      name: 'sci-fi-panel-01',
      url: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sci_fi_panel_01/sci_fi_panel_01_diff_1k.jpg',
      type: 'texture',
      category: 'sci-fi',
      files: {
        diffuse: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sci_fi_panel_01/sci_fi_panel_01_diff_1k.jpg',
        normal: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sci_fi_panel_01/sci_fi_panel_01_nor_gl_1k.jpg',
        roughness: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sci_fi_panel_01/sci_fi_panel_01_rough_1k.jpg',
        metallic: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sci_fi_panel_01/sci_fi_panel_01_metal_1k.jpg'
      }
    }
  ],
  
  // OpenGameArt and other free sources
  models: [
    // Add model URLs here as we find them
  ]
}

/**
 * Download a file from URL
 */
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = createWriteStream(destPath)
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        return downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject)
      }
      
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(destPath)
        reject(new Error(`Failed to download: ${response.statusCode}`))
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
 * Download texture set (diffuse, normal, roughness, metallic)
 */
async function downloadTextureSet(name, files, category) {
  const textureDir = path.join(rootDir, 'public', 'assets', 'textures', category, name)
  
  if (!fs.existsSync(textureDir)) {
    fs.mkdirSync(textureDir, { recursive: true })
  }
  
  console.log(`Downloading texture set: ${name}...`)
  
  for (const [type, url] of Object.entries(files)) {
    if (!url) continue
    
    const ext = path.extname(url) || '.jpg'
    const filename = `${name}_${type}${ext}`
    const destPath = path.join(textureDir, filename)
    
    try {
      await downloadFile(url, destPath)
      console.log(`  ✓ Downloaded ${type}`)
    } catch (error) {
      console.error(`  ✗ Failed to download ${type}:`, error.message)
    }
  }
}

/**
 * Download 3D model
 */
async function downloadModel(name, url, category, format = 'glb') {
  const modelDir = path.join(rootDir, 'public', 'assets', 'models', 'biomes', category)
  
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true })
  }
  
  const filename = `${name}.${format}`
  const destPath = path.join(modelDir, filename)
  
  console.log(`Downloading model: ${name}...`)
  
  try {
    await downloadFile(url, destPath)
    console.log(`  ✓ Downloaded ${filename}`)
    return destPath
  } catch (error) {
    console.error(`  ✗ Failed to download:`, error.message)
    return null
  }
}

/**
 * Fetch texture info from Poly Haven API
 */
async function fetchPolyHavenTextureInfo(textureId) {
  return new Promise((resolve, reject) => {
    const url = `${POLYHAVEN_API}/files/${textureId}`
    
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
          reject(new Error(`Failed to parse API response: ${error.message}`))
        }
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Download Poly Haven texture set using API
 */
async function downloadPolyHavenTexture(textureId, category, resolution = '2k') {
  console.log(`Fetching texture info: ${textureId}...`)
  
  try {
    const info = await fetchPolyHavenTextureInfo(textureId)
    
    if (!info || !info[resolution]) {
      console.error(`  ✗ Resolution ${resolution} not available`)
      return false
    }
    
    const textureDir = path.join(rootDir, 'public', 'assets', 'textures', category, textureId)
    if (!fs.existsSync(textureDir)) {
      fs.mkdirSync(textureDir, { recursive: true })
    }
    
    const maps = ['diffuse', 'normal', 'roughness', 'metallic', 'ao']
    const downloaded = []
    
    for (const mapType of maps) {
      const mapKey = mapType === 'normal' ? 'normal_gl' : mapType
      const fileInfo = info[resolution][mapKey]
      
      if (fileInfo && fileInfo[mapType === 'normal' ? 'gl' : 'jpg']) {
        const url = fileInfo[mapType === 'normal' ? 'gl' : 'jpg'].url
        const ext = mapType === 'normal' ? '.jpg' : '.jpg'
        const filename = `${textureId}_${mapType}${ext}`
        const destPath = path.join(textureDir, filename)
        
        try {
          await downloadFile(url, destPath)
          downloaded.push(mapType)
          console.log(`  ✓ Downloaded ${mapType}`)
        } catch (error) {
          console.error(`  ✗ Failed to download ${mapType}: ${error.message}`)
        }
      }
    }
    
    return downloaded.length > 0
  } catch (error) {
    console.error(`  ✗ Failed to fetch texture info: ${error.message}`)
    return false
  }
}

/**
 * Download textures from Poly Haven texture list
 */
async function downloadPolyHavenTextures(textureIds, category, resolution = '2k') {
  console.log(`Downloading ${textureIds.length} textures from Poly Haven...\n`)
  
  let successCount = 0
  let failCount = 0
  
  for (const textureId of textureIds) {
    const success = await downloadPolyHavenTexture(textureId, category, resolution)
    if (success) {
      successCount++
    } else {
      failCount++
    }
    
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`\nPoly Haven download summary: ${successCount} successful, ${failCount} failed`)
  return { successCount, failCount }
}

/**
 * Main download function
 */
async function downloadAssets() {
  console.log('Starting asset downloads...\n')
  
  // Download textures from ASSET_SOURCES
  for (const texture of ASSET_SOURCES.textures) {
    if (texture.files) {
      await downloadTextureSet(texture.name, texture.files, texture.category)
    }
  }
  
  // Download models
  for (const model of ASSET_SOURCES.models) {
    await downloadModel(model.name, model.url, model.category, model.format)
  }
  
  console.log('\n✓ Asset download complete!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAssets().catch(console.error)
}

export { 
  downloadAssets, 
  downloadFile, 
  downloadTextureSet, 
  downloadModel,
  downloadPolyHavenTexture,
  downloadPolyHavenTextures,
  fetchPolyHavenTextureInfo
}

