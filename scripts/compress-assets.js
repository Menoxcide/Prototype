#!/usr/bin/env node
/**
 * Asset Compression Script
 * Compresses GLB models with Draco and textures with KTX2/Basis Universal
 * Run: node scripts/compress-assets.js
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const modelsDir = path.join(rootDir, 'public', 'assets', 'models')
const texturesDir = path.join(rootDir, 'public', 'assets', 'textures')

// Check if required tools are installed
function checkTools() {
  const tools = {
    gltfPipeline: false,
    basisu: false
  }

  try {
    execSync('gltf-pipeline --version', { stdio: 'ignore' })
    tools.gltfPipeline = true
    console.log('✓ gltf-pipeline found')
  } catch {
    console.warn('⚠ gltf-pipeline not found. Install with: npm install -g gltf-pipeline')
  }

  try {
    execSync('basisu -version', { stdio: 'ignore' })
    tools.basisu = true
    console.log('✓ basisu found')
  } catch {
    console.warn('⚠ basisu not found. Download from: https://github.com/BinomialLLC/basis_universal/releases')
  }

  return tools
}

// Compress a single GLB model with Draco
function compressModel(inputPath, outputPath) {
  try {
    execSync(`gltf-pipeline -i "${inputPath}" -o "${outputPath}" -d`, {
      stdio: 'inherit'
    })
    const originalSize = fs.statSync(inputPath).size
    const compressedSize = fs.statSync(outputPath).size
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1)
    console.log(`  ✓ Compressed: ${path.basename(inputPath)} (${reduction}% reduction)`)
    return true
  } catch (error) {
    console.error(`  ✗ Failed to compress ${inputPath}:`, error.message)
    return false
  }
}

// Compress a texture with KTX2
function compressTexture(inputPath, outputPath) {
  try {
    execSync(`basisu -ktx2 "${inputPath}" "${outputPath}"`, {
      stdio: 'inherit'
    })
    const originalSize = fs.statSync(inputPath).size
    const compressedSize = fs.statSync(outputPath).size
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1)
    console.log(`  ✓ Compressed: ${path.basename(inputPath)} (${reduction}% reduction)`)
    return true
  } catch (error) {
    console.error(`  ✗ Failed to compress ${inputPath}:`, error.message)
    return false
  }
}

// Find all GLB files recursively
function findGLBFiles(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findGLBFiles(fullPath))
    } else if (entry.name.endsWith('.glb') && !entry.name.endsWith('.drc.glb')) {
      files.push(fullPath)
    }
  }
  return files
}

// Find all texture files recursively
function findTextureFiles(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findTextureFiles(fullPath))
    } else if (/\.(png|jpg|jpeg)$/i.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

// Compress texture to WebP format (for browsers without KTX2 support)
function compressToWebP(inputPath, outputPath) {
  try {
    // Use sharp if available, otherwise skip
    try {
      const sharp = require('sharp')
      return sharp(inputPath)
        .webp({ quality: 85, effort: 6 })
        .toFile(outputPath)
        .then(() => {
          const originalSize = fs.statSync(inputPath).size
          const compressedSize = fs.statSync(outputPath).size
          const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1)
          console.log(`  ✓ WebP: ${path.basename(inputPath)} (${reduction}% reduction)`)
          return true
        })
    } catch {
      console.warn(`  ⚠ Sharp not available, skipping WebP conversion for ${path.basename(inputPath)}`)
      return false
    }
  } catch (error) {
    console.error(`  ✗ Failed to compress ${inputPath} to WebP:`, error.message)
    return false
  }
}

// Generate compression metadata manifest
function generateCompressionManifest(compressedFiles) {
  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    compression: {
      textures: {},
      models: {}
    },
    sizes: {
      original: 0,
      compressed: 0,
      savings: 0
    }
  }

  let totalOriginal = 0
  let totalCompressed = 0

  for (const file of compressedFiles) {
    if (file.type === 'texture') {
      manifest.compression.textures[file.key] = {
        original: file.originalPath,
        compressed: file.compressedPath,
        originalSize: file.originalSize,
        compressedSize: file.compressedSize,
        format: file.format,
        reduction: ((1 - file.compressedSize / file.originalSize) * 100).toFixed(1) + '%'
      }
      totalOriginal += file.originalSize
      totalCompressed += file.compressedSize
    } else if (file.type === 'model') {
      manifest.compression.models[file.key] = {
        original: file.originalPath,
        compressed: file.compressedPath,
        originalSize: file.originalSize,
        compressedSize: file.compressedSize,
        format: 'draco',
        reduction: ((1 - file.compressedSize / file.originalSize) * 100).toFixed(1) + '%'
      }
      totalOriginal += file.originalSize
      totalCompressed += file.compressedSize
    }
  }

  manifest.sizes.original = totalOriginal
  manifest.sizes.compressed = totalCompressed
  manifest.sizes.savings = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1) + '%'

  return manifest
}

// Main compression function
async function main() {
  console.log('🔧 Asset Compression Script (Enhanced Build-Time Pipeline)\n')
  console.log('Checking for required tools...\n')
  
  const tools = checkTools()
  
  if (!tools.gltfPipeline && !tools.basisu) {
    console.error('\n❌ No compression tools found. Please install at least one:')
    console.error('  - gltf-pipeline: npm install -g gltf-pipeline')
    console.error('  - basisu: Download from https://github.com/BinomialLLC/basis_universal/releases')
    process.exit(1)
  }

  let compressedModels = 0
  let compressedTextures = 0
  const compressionMetadata = []

  // Compress models
  if (tools.gltfPipeline) {
    console.log('\n📦 Compressing GLB models with Draco...\n')
    const modelFiles = findGLBFiles(modelsDir)
    
    for (const modelPath of modelFiles) {
      const compressedPath = modelPath.replace(/\.glb$/, '.drc.glb')
      
      // Skip if already compressed and newer
      if (fs.existsSync(compressedPath)) {
        const originalTime = fs.statSync(modelPath).mtime
        const compressedTime = fs.statSync(compressedPath).mtime
        if (compressedTime > originalTime) {
          console.log(`  ⊘ Skipping ${path.basename(modelPath)} (already compressed)`)
          continue
        }
      }
      
      if (compressModel(modelPath, compressedPath)) {
        compressedModels++
        const originalSize = fs.statSync(modelPath).size
        const compressedSize = fs.statSync(compressedPath).size
        const key = path.basename(modelPath, '.glb')
        compressionMetadata.push({
          type: 'model',
          key,
          originalPath: path.relative(rootDir, modelPath),
          compressedPath: path.relative(rootDir, compressedPath),
          originalSize,
          compressedSize,
          format: 'draco'
        })
      }
    }
    
    console.log(`\n✓ Compressed ${compressedModels} models`)
  }

  // Compress textures
  if (tools.basisu) {
    console.log('\n🖼️  Compressing textures with KTX2...\n')
    const textureFiles = findTextureFiles(texturesDir)
    
    // Create compressed directory
    const compressedTexturesDir = path.join(texturesDir, 'compressed')
    if (!fs.existsSync(compressedTexturesDir)) {
      fs.mkdirSync(compressedTexturesDir, { recursive: true })
    }
    
    for (const texturePath of textureFiles) {
      const relativePath = path.relative(texturesDir, texturePath)
      const compressedPath = path.join(compressedTexturesDir, relativePath.replace(/\.(png|jpg|jpeg)$/i, '.ktx2'))
      
      // Create subdirectories if needed
      const compressedDir = path.dirname(compressedPath)
      if (!fs.existsSync(compressedDir)) {
        fs.mkdirSync(compressedDir, { recursive: true })
      }
      
      // Skip if already compressed and newer
      if (fs.existsSync(compressedPath)) {
        const originalTime = fs.statSync(texturePath).mtime
        const compressedTime = fs.statSync(compressedPath).mtime
        if (compressedTime > originalTime) {
          console.log(`  ⊘ Skipping ${path.basename(texturePath)} (already compressed)`)
          continue
        }
      }
      
      if (compressTexture(texturePath, compressedPath)) {
        compressedTextures++
        const originalSize = fs.statSync(texturePath).size
        const compressedSize = fs.statSync(compressedPath).size
        const key = path.basename(texturePath).replace(/\.(png|jpg|jpeg)$/i, '')
        compressionMetadata.push({
          type: 'texture',
          key,
          originalPath: path.relative(rootDir, texturePath),
          compressedPath: path.relative(rootDir, compressedPath),
          originalSize,
          compressedSize,
          format: 'ktx2'
        })

        // Also create WebP fallback for browsers without KTX2 support
        const webpPath = compressedPath.replace(/\.ktx2$/, '.webp')
        await compressToWebP(texturePath, webpPath)
      }
    }
    
    console.log(`\n✓ Compressed ${compressedTextures} textures`)
  }

  // Generate compression metadata manifest
  const compressionManifest = generateCompressionManifest(compressionMetadata)
  const manifestPath = path.join(rootDir, 'public', 'assets', 'compression-manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(compressionManifest, null, 2))
  console.log(`\n📄 Compression metadata saved: ${manifestPath}`)

  console.log('\n✅ Compression complete!')
  console.log(`   Models: ${compressedModels}`)
  console.log(`   Textures: ${compressedTextures}`)
  console.log(`   Total savings: ${compressionManifest.sizes.savings}`)
  console.log(`   Original size: ${(compressionManifest.sizes.original / 1024 / 1024).toFixed(2)} MB`)
  console.log(`   Compressed size: ${(compressionManifest.sizes.compressed / 1024 / 1024).toFixed(2)} MB`)
}

main().catch(console.error)

