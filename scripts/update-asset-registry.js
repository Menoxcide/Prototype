/**
 * Update ASSET_REGISTRY.json with converted assets
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const REGISTRY_PATH = path.join(rootDir, 'public', 'assets', 'models', 'ASSET_REGISTRY.json')
const MODELS_BASE = path.join(rootDir, 'public', 'assets', 'models')

/**
 * Scan directory for GLB files and get metadata
 */
function scanAssets(baseDir, relativePath = '') {
  const assets = []
  const fullPath = path.join(baseDir, relativePath)
  
  if (!fs.existsSync(fullPath)) {
    return assets
  }

  const entries = fs.readdirSync(fullPath, { withFileTypes: true })
  
  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name)
    const entryRelative = path.join(relativePath, entry.name)
    
    if (entry.isDirectory()) {
      assets.push(...scanAssets(baseDir, entryRelative))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) {
      const stats = fs.statSync(entryPath)
      const assetPath = path.join(relativePath, entry.name).replace(/\\/g, '/')
      
      // Determine biome and category from path
      let biome = 'sci-fi'
      let category = 'props'
      
      if (assetPath.includes('/biomes/')) {
        const biomeMatch = assetPath.match(/biomes\/([^/]+)/)
        if (biomeMatch) biome = biomeMatch[1]
      }
      
      if (assetPath.includes('/floor/')) category = 'floor'
      else if (assetPath.includes('/walls/')) category = 'walls'
      else if (assetPath.includes('/columns/')) category = 'columns'
      else if (assetPath.includes('/roof/')) category = 'roof'
      else if (assetPath.includes('/doors/')) category = 'doors'
      else if (assetPath.includes('/stairs/')) category = 'stairs'
      else if (assetPath.includes('/details/')) category = 'details'
      else if (assetPath.includes('/pipes/')) category = 'pipes'
      else if (assetPath.includes('/props/')) category = 'props'
      
      assets.push({
        name: entry.name.replace('.glb', ''),
        path: assetPath,
        biome,
        category,
        license: 'CC0',
        source: 'OpenGameArt.org - LowPoly Modular Sci-Fi',
        fileSize: stats.size,
        fileSizeKB: Math.round(stats.size / 1024),
        convertedDate: stats.mtime.toISOString(),
        format: 'GLB'
      })
    }
  }
  
  return assets
}

/**
 * Update registry
 */
function updateRegistry() {
  console.log('Updating asset registry...\n')

  // Load existing registry
  let registry = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    assets: [],
    statistics: {
      totalAssets: 0,
      byBiome: {},
      byCategory: {},
      totalSize: 0
    },
    sources: {
      'sci-fi-modular': {
        name: 'LowPoly Modular Sci-Fi Environments',
        license: 'CC0',
        source: 'OpenGameArt.org',
        url: 'https://opengameart.org/content/lowpoly-modular-sci-fi-environments',
        originalFormat: 'FBX',
        convertedFormat: 'GLB'
      }
    }
  }

  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'))
    } catch (error) {
      console.warn('Could not load existing registry, creating new one')
    }
  }

  // Scan for assets
  const assets = scanAssets(MODELS_BASE)
  console.log(`Found ${assets.length} assets\n`)

  // Update registry
  registry.assets = assets
  registry.lastUpdated = new Date().toISOString()

  // Calculate statistics
  const stats = {
    totalAssets: assets.length,
    byBiome: {},
    byCategory: {},
    totalSize: 0
  }

  for (const asset of assets) {
    stats.totalSize += asset.fileSize
    
    if (!stats.byBiome[asset.biome]) {
      stats.byBiome[asset.biome] = 0
    }
    stats.byBiome[asset.biome]++
    
    if (!stats.byCategory[asset.category]) {
      stats.byCategory[asset.category] = 0
    }
    stats.byCategory[asset.category]++
  }

  registry.statistics = stats

  // Save registry
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2))

  console.log('='.repeat(60))
  console.log('Asset Registry Updated')
  console.log('='.repeat(60))
  console.log(`Total assets: ${stats.totalAssets}`)
  console.log(`Total size:   ${Math.round(stats.totalSize / 1024 / 1024 * 100) / 100} MB`)
  console.log('\nBy biome:')
  for (const [biome, count] of Object.entries(stats.byBiome)) {
    console.log(`  ${biome}: ${count}`)
  }
  console.log('\nBy category:')
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`  ${category}: ${count}`)
  }
  console.log('='.repeat(60))
  console.log(`\nRegistry saved to: ${REGISTRY_PATH}`)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateRegistry()
}

export { updateRegistry, scanAssets }

