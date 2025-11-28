#!/usr/bin/env node
/**
 * Asset Manifest Generator
 * Generates a manifest file listing all available assets with metadata
 * This eliminates the need for individual HEAD requests
 */

const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const modelsDir = path.join(rootDir, 'public', 'assets', 'models')
const texturesDir = path.join(rootDir, 'public', 'assets', 'textures')
const manifestPath = path.join(rootDir, 'public', 'assets', 'models', 'ASSET_MANIFEST.json')

// Find all files recursively
function findFiles(dir, extensions, baseDir = dir) {
  const files = []
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, extensions, baseDir))
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (extensions.includes(ext)) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/')
        const stats = fs.statSync(fullPath)
        files.push({
          path: relativePath,
          fullPath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: ext
        })
      }
    }
  }
  return files
}

// Generate manifest
function generateManifest() {
  console.log('📦 Generating asset manifest...\n')

  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    models: {},
    textures: {},
    compressed: {
      models: {},
      textures: {}
    }
  }

  // Find all GLB models
  console.log('Scanning models...')
  const modelFiles = findFiles(modelsDir, ['.glb'])
  for (const file of modelFiles) {
    const key = file.path.replace(/\.glb$/, '').replace(/\.drc$/, '')
    const isCompressed = file.path.endsWith('.drc.glb')
    
    if (isCompressed) {
      manifest.compressed.models[key] = {
        path: `/assets/models/${file.path}`,
        size: file.size,
        modified: file.modified
      }
    } else {
      manifest.models[key] = {
        path: `/assets/models/${file.path}`,
        size: file.size,
        modified: file.modified,
        compressed: fs.existsSync(file.fullPath.replace(/\.glb$/, '.drc.glb'))
      }
    }
  }
  console.log(`  Found ${modelFiles.length} model files`)

  // Find all textures
  console.log('Scanning textures...')
  const textureFiles = findFiles(texturesDir, ['.png', '.jpg', '.jpeg', '.webp'])
  for (const file of textureFiles) {
    const key = file.path.replace(/\.(png|jpg|jpeg|webp)$/i, '')
    const isCompressed = file.path.includes('/compressed/') || file.path.endsWith('.ktx2')
    
    if (isCompressed) {
      manifest.compressed.textures[key] = {
        path: `/assets/textures/${file.path}`,
        size: file.size,
        modified: file.modified
      }
    } else {
      // Check for compressed version
      const compressedPath = file.fullPath.replace(/\.(png|jpg|jpeg|webp)$/i, '.ktx2')
      const compressedDir = path.join(path.dirname(compressedPath), 'compressed')
      const compressedFile = path.join(compressedDir, path.basename(compressedPath))
      
      manifest.textures[key] = {
        path: `/assets/textures/${file.path}`,
        size: file.size,
        modified: file.modified,
        compressed: fs.existsSync(compressedFile)
      }
    }
  }
  console.log(`  Found ${textureFiles.length} texture files`)

  // Write manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\n✅ Manifest generated: ${manifestPath}`)
  console.log(`   Models: ${Object.keys(manifest.models).length}`)
  console.log(`   Textures: ${Object.keys(manifest.textures).length}`)
  console.log(`   Compressed models: ${Object.keys(manifest.compressed.models).length}`)
  console.log(`   Compressed textures: ${Object.keys(manifest.compressed.textures).length}`)
}

generateManifest()

