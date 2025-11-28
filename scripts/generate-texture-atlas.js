#!/usr/bin/env node
/**
 * Build-Time Texture Atlas Generator
 * Generates texture atlases at build time to reduce runtime overhead
 * Outputs atlas images and UV mapping data
 */

const fs = require('fs')
const path = require('path')
const { createCanvas, loadImage } = require('canvas')

const rootDir = path.resolve(__dirname, '..')
const texturesDir = path.join(rootDir, 'public', 'assets', 'textures')
const outputDir = path.join(rootDir, 'public', 'assets', 'atlases')

// Atlas configurations
const ATLAS_CONFIGS = [
  {
    id: 'common',
    size: 2048,
    textures: ['grass', 'ground', 'sky', 'wall', 'floor', 'ceiling']
  },
  {
    id: 'ui',
    size: 1024,
    textures: ['icon', 'button', 'panel', 'border']
  },
  {
    id: 'entities',
    size: 1024,
    textures: ['enemy', 'npc', 'loot', 'projectile']
  }
]

/**
 * Find texture files
 */
function findTextureFile(textureName, texturesDir) {
  const extensions = ['.png', '.jpg', '.jpeg', '.webp']
  for (const ext of extensions) {
    const texturePath = path.join(texturesDir, `${textureName}${ext}`)
    if (fs.existsSync(texturePath)) {
      return texturePath
    }
    // Also check in subdirectories
    const subdirPath = path.join(texturesDir, '**', `${textureName}${ext}`)
    // Use glob pattern matching
    const glob = require('glob')
    const matches = glob.sync(subdirPath, { cwd: texturesDir })
    if (matches.length > 0) {
      return path.join(texturesDir, matches[0])
    }
  }
  return null
}

/**
 * Generate texture atlas
 */
async function generateAtlas(config) {
  console.log(`\n📦 Generating atlas: ${config.id} (${config.size}x${config.size})`)
  
  const canvas = createCanvas(config.size, config.size)
  const ctx = canvas.getContext('2d')
  
  const entries = {}
  let currentX = 0
  let currentY = 0
  let rowHeight = 0
  
  for (const textureName of config.textures) {
    const texturePath = findTextureFile(textureName, texturesDir)
    if (!texturePath) {
      console.log(`  ⚠️  Texture not found: ${textureName}, skipping`)
      continue
    }
    
    try {
      const image = await loadImage(texturePath)
      const { width, height } = image
      
      // Check if texture fits in current row
      if (currentX + width > config.size) {
        // Move to next row
        currentY += rowHeight
        currentX = 0
        rowHeight = 0
        
        // Check if fits in atlas
        if (currentY + height > config.size) {
          console.log(`  ⚠️  Texture ${textureName} does not fit in atlas, skipping`)
          continue
        }
      }
      
      // Draw texture to atlas
      ctx.drawImage(image, currentX, currentY, width, height)
      
      // Calculate UV coordinates
      const u1 = currentX / config.size
      const v1 = currentY / config.size
      const u2 = (currentX + width) / config.size
      const v2 = (currentY + height) / config.size
      
      entries[textureName] = {
        x: currentX,
        y: currentY,
        width,
        height,
        uvs: { u1, v1, u2, v2 }
      }
      
      // Update position
      currentX += width
      rowHeight = Math.max(rowHeight, height)
      
      console.log(`  ✓ Packed: ${textureName} (${width}x${height})`)
    } catch (error) {
      console.error(`  ✗ Failed to load ${textureName}:`, error.message)
    }
  }
  
  // Save atlas image
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  const atlasImagePath = path.join(outputDir, `${config.id}-atlas.png`)
  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(atlasImagePath, buffer)
  
  // Save atlas metadata (UV coordinates)
  const metadataPath = path.join(outputDir, `${config.id}-atlas.json`)
  const metadata = {
    id: config.id,
    size: config.size,
    image: `/assets/atlases/${config.id}-atlas.png`,
    entries,
    generated: new Date().toISOString()
  }
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
  
  console.log(`  ✅ Atlas saved: ${atlasImagePath}`)
  console.log(`  📄 Metadata saved: ${metadataPath}`)
  
  return metadata
}

/**
 * Main function
 */
async function main() {
  console.log('🎨 Build-Time Texture Atlas Generator\n')
  
  if (!fs.existsSync(texturesDir)) {
    console.error(`❌ Textures directory not found: ${texturesDir}`)
    process.exit(1)
  }
  
  const atlases = []
  
  for (const config of ATLAS_CONFIGS) {
    const metadata = await generateAtlas(config)
    if (metadata) {
      atlases.push(metadata)
    }
  }
  
  // Generate master atlas manifest
  const manifestPath = path.join(outputDir, 'atlas-manifest.json')
  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    atlases: atlases.reduce((acc, atlas) => {
      acc[atlas.id] = {
        size: atlas.size,
        image: atlas.image,
        entryCount: Object.keys(atlas.entries).length
      }
      return acc
    }, {})
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  
  console.log('\n✅ Texture atlas generation complete!')
  console.log(`   Generated ${atlases.length} atlases`)
  console.log(`   Manifest: ${manifestPath}`)
}

main().catch(error => {
  console.error('❌ Atlas generation failed:', error)
  process.exit(1)
})

