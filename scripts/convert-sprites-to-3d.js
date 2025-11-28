/**
 * Batch convert PixelLab sprites to 3D models using Blender
 * 
 * Usage: node scripts/convert-sprites-to-3d.js [options]
 * Options:
 *   --type <monsters|npcs|tiles>  - Type of assets to convert
 *   --method <extrude|voxel>      - Conversion method
 *   --depth <number>              - Extrusion depth (0.1-1.0)
 *   --all                         - Convert all assets
 */

import { execSync } from 'child_process'
import { existsSync, readdirSync, mkdirSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname as dirnameUrl } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirnameUrl(__filename)

const BLENDER_SCRIPT = join(process.cwd(), 'scripts', 'blender-sprite-to-3d.py')
const PUBLIC_DIR = join(process.cwd(), 'public')
const ASSETS_DIR = join(PUBLIC_DIR, 'assets')
const MODELS_DIR = join(ASSETS_DIR, 'models')

// Asset directories
// Note: Assets are in public/public/assets (duplicate public folder)
const MONSTERS_DIR = join(PUBLIC_DIR, 'public', 'assets', 'monsters')
const NPCS_DIR = join(PUBLIC_DIR, 'public', 'assets', 'npcs')
const ISOMETRIC_TILES_DIR = join(PUBLIC_DIR, 'public', 'assets', 'isometric-tiles')

// Output directories
const MONSTER_MODELS_DIR = join(MODELS_DIR, 'monsters')
const NPC_MODELS_DIR = join(MODELS_DIR, 'npcs')
const TILE_MODELS_DIR = join(MODELS_DIR, 'tiles')

// Create output directories
mkdirSync(MONSTER_MODELS_DIR, { recursive: true })
mkdirSync(NPC_MODELS_DIR, { recursive: true })
mkdirSync(TILE_MODELS_DIR, { recursive: true })

function findBlender() {
  // Check for BLENDER_PATH environment variable first
  if (process.env.BLENDER_PATH) {
    const path = process.env.BLENDER_PATH
    try {
      execSync(`"${path}" --version`, { stdio: 'ignore' })
      return path
    } catch (e) {
      console.warn(`BLENDER_PATH set but invalid: ${path}`)
    }
  }
  
  // Common Blender installation paths
  const paths = [
    'blender', // In PATH
    'X:\\Blender\\Blender 4.5.3\\blender.exe', // User's Blender installation
  ]
  
  // Add all Blender versions from common locations
  try {
    const fs = require('fs')
    
    // Check Program Files
    const blenderDir = 'C:\\Program Files\\Blender Foundation\\'
    if (fs.existsSync(blenderDir)) {
      const versions = fs.readdirSync(blenderDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => join(blenderDir, d.name, 'blender.exe'))
      paths.push(...versions)
    }
    
    // Check user's custom Blender directory
    const customBlenderDir = 'X:\\Blender\\'
    if (fs.existsSync(customBlenderDir)) {
      // Blender 4.5.3
      const blender453 = join(customBlenderDir, 'Blender 4.5.3', 'blender.exe')
      if (fs.existsSync(blender453)) {
        paths.push(blender453)
      }
      
      // Blender 5.1
      const blender51Dir = join(customBlenderDir, 'blender-5.1.0-alpha+main.61da6403beb1-windows.amd64-release', 'blender-5.1.0-alpha+main.61da6403beb1-windows.amd64-release', 'blender.exe')
      if (fs.existsSync(blender51Dir)) {
        paths.push(blender51Dir)
      }
      
      // Also check for any other blender.exe files in subdirectories
      try {
        const subdirs = fs.readdirSync(customBlenderDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => {
            const exePath = join(customBlenderDir, d.name, 'blender.exe')
            if (fs.existsSync(exePath)) return exePath
            // Check nested directories
            try {
              const nested = fs.readdirSync(join(customBlenderDir, d.name), { withFileTypes: true })
                .filter(nd => nd.isDirectory())
                .map(nd => join(customBlenderDir, d.name, nd.name, 'blender.exe'))
                .find(p => fs.existsSync(p))
              return nested
            } catch {
              return null
            }
          })
          .filter(Boolean)
        paths.push(...subdirs)
      } catch (e) {
        // Ignore
      }
    }
  } catch (e) {
    // Ignore if can't read directory
  }
  
  // Fallback paths
  paths.push(
    'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 3.5\\blender.exe',
    '/usr/bin/blender',
    '/Applications/Blender.app/Contents/MacOS/Blender',
  )
  
  for (const path of paths) {
    try {
      execSync(`"${path}" --version`, { stdio: 'ignore' })
      return path
    } catch (e) {
      // Try next path
    }
  }
  
  throw new Error(
    'Blender not found. Please:\n' +
    '1. Install Blender from https://www.blender.org/\n' +
    '2. Add to PATH, or\n' +
    '3. Set BLENDER_PATH environment variable\n' +
    '   Example: $env:BLENDER_PATH="C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe"'
  )
}

function convertSprite(inputPath, outputPath, depth = 0.5, method = 'extrude') {
  const blenderPath = findBlender()
  
  console.log(`Converting: ${basename(inputPath)} -> ${basename(outputPath)}`)
  
  try {
    execSync(
      `"${blenderPath}" --background --python "${BLENDER_SCRIPT}" -- "${inputPath}" "${outputPath}" ${depth} ${method}`,
      { stdio: 'inherit' }
    )
    return true
  } catch (error) {
    console.error(`Failed to convert ${inputPath}:`, error.message)
    return false
  }
}

function convertMonsters(depth = 0.5, method = 'extrude') {
  console.log('\n=== Converting Monster Sprites to 3D ===\n')
  
  if (!existsSync(MONSTERS_DIR)) {
    console.log('Monsters directory not found. Run asset download first.')
    return
  }
  
  const files = readdirSync(MONSTERS_DIR).filter(f => f.endsWith('.png'))
  let converted = 0
  let failed = 0
  
  for (const file of files) {
    const inputPath = join(MONSTERS_DIR, file)
    const outputName = file.replace('.png', '.glb')
    const outputPath = join(MONSTER_MODELS_DIR, outputName)
    
    if (existsSync(outputPath)) {
      console.log(`  ⏭️  Skipping ${file} (already exists)`)
      continue
    }
    
    if (convertSprite(inputPath, outputPath, depth, method)) {
      converted++
    } else {
      failed++
    }
  }
  
  console.log(`\n✅ Converted: ${converted}, Failed: ${failed}, Total: ${files.length}`)
}

function convertNPCs(depth = 0.5, method = 'extrude') {
  console.log('\n=== Converting NPC Sprites to 3D ===\n')
  
  if (!existsSync(NPCS_DIR)) {
    console.log('NPCs directory not found. Run asset download first.')
    return
  }
  
  const files = readdirSync(NPCS_DIR).filter(f => f.endsWith('.png'))
  let converted = 0
  let failed = 0
  
  for (const file of files) {
    const inputPath = join(NPCS_DIR, file)
    const outputName = file.replace('.png', '.glb')
    const outputPath = join(NPC_MODELS_DIR, outputName)
    
    if (existsSync(outputPath)) {
      console.log(`  ⏭️  Skipping ${file} (already exists)`)
      continue
    }
    
    if (convertSprite(inputPath, outputPath, depth, method)) {
      converted++
    } else {
      failed++
    }
  }
  
  console.log(`\n✅ Converted: ${converted}, Failed: ${failed}, Total: ${files.length}`)
}

function convertTiles(depth = 0.5, method = 'extrude') {
  console.log('\n=== Converting Isometric Tiles to 3D ===\n')
  
  if (!existsSync(ISOMETRIC_TILES_DIR)) {
    console.log('Isometric tiles directory not found. Run asset download first.')
    return
  }
  
  const files = readdirSync(ISOMETRIC_TILES_DIR).filter(f => f.endsWith('.png'))
  let converted = 0
  let failed = 0
  
  for (const file of files) {
    const inputPath = join(ISOMETRIC_TILES_DIR, file)
    const outputName = file.replace('.png', '.glb')
    const outputPath = join(TILE_MODELS_DIR, outputName)
    
    if (existsSync(outputPath)) {
      console.log(`  ⏭️  Skipping ${file} (already exists)`)
      continue
    }
    
    // Determine depth based on tile type (from metadata if available)
    let tileDepth = depth
    if (file.includes('thin')) tileDepth = 0.1
    else if (file.includes('thick')) tileDepth = 0.25
    else if (file.includes('block')) tileDepth = 0.5
    
    if (convertSprite(inputPath, outputPath, tileDepth, method)) {
      converted++
    } else {
      failed++
    }
  }
  
  console.log(`\n✅ Converted: ${converted}, Failed: ${failed}, Total: ${files.length}`)
}

// Parse command line arguments
const args = process.argv.slice(2)
const type = args.find(a => a.startsWith('--type'))?.split('=')[1] || args[args.indexOf('--type') + 1]
const method = args.find(a => a.startsWith('--method'))?.split('=')[1] || args[args.indexOf('--method') + 1] || 'voxel'
const depth = parseFloat(args.find(a => a.startsWith('--depth'))?.split('=')[1] || args[args.indexOf('--depth') + 1] || '0.5')
const all = args.includes('--all')

console.log('Blender Sprite to 3D Converter')
console.log('================================\n')

// Check if Blender is available
try {
  const blenderPath = findBlender()
  console.log(`✅ Blender found: ${blenderPath}\n`)
} catch (error) {
  console.error('❌', error.message)
  process.exit(1)
}

// Convert based on type
if (all || !type) {
  convertMonsters(depth, method)
  convertNPCs(depth, method)
  convertTiles(depth, method)
} else {
  switch (type) {
    case 'monsters':
      convertMonsters(depth, method)
      break
    case 'npcs':
      convertNPCs(depth, method)
      break
    case 'tiles':
      convertTiles(depth, method)
      break
    default:
      console.error(`Unknown type: ${type}. Use: monsters, npcs, or tiles`)
      process.exit(1)
  }
}

console.log('\n✅ Conversion complete!')

