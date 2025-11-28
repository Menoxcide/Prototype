/**
 * Download all completed Pixellab assets (isometric tiles, topdown tilesets, map objects)
 * Organizes assets into proper directory structure
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'

const PUBLIC_DIR = join(process.cwd(), 'public')
const ASSETS_DIR = join(PUBLIC_DIR, 'assets')
const ISOMETRIC_TILES_DIR = join(ASSETS_DIR, 'isometric-tiles')
const TILESETS_DIR = join(ASSETS_DIR, 'tilesets')
const MONSTERS_DIR = join(ASSETS_DIR, 'monsters')
const NPCS_DIR = join(ASSETS_DIR, 'npcs')

// Create directory structure
mkdirSync(ISOMETRIC_TILES_DIR, { recursive: true })
mkdirSync(TILESETS_DIR, { recursive: true })
mkdirSync(MONSTERS_DIR, { recursive: true })
mkdirSync(NPCS_DIR, { recursive: true })

async function downloadFile(url, outputPath) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 423) {
        return { success: false, error: 'Still processing' }
      }
      throw new Error(`Failed to download ${url}: ${response.statusText}`)
    }
    const buffer = await response.buffer()
    writeFileSync(outputPath, buffer)
    return { success: true, size: buffer.length }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function downloadIsometricTile(tileId, description) {
  const url = `https://api.pixellab.ai/mcp/isometric-tile/${tileId}/download`
  const filename = `${tileId}.png`
  const outputPath = join(ISOMETRIC_TILES_DIR, filename)
  
  if (existsSync(outputPath)) {
    console.log(`  ✓ Already exists: ${description}`)
    return { success: true, skipped: true }
  }
  
  console.log(`  Downloading: ${description}...`)
  const result = await downloadFile(url, outputPath)
  
  if (result.success) {
    console.log(`  ✓ Downloaded (${(result.size / 1024).toFixed(1)} KB)`)
    // Save metadata
    const metadataPath = join(ISOMETRIC_TILES_DIR, `${tileId}.json`)
    writeFileSync(metadataPath, JSON.stringify({
      id: tileId,
      description,
      url,
      downloaded: new Date().toISOString()
    }, null, 2))
    return { success: true }
  } else if (result.error === 'Still processing') {
    console.log(`  ⏳ Still processing, skipping for now`)
    return { success: false, processing: true }
  } else {
    console.log(`  ✗ Failed: ${result.error}`)
    return { success: false }
  }
}

async function downloadTopdownTileset(tilesetId, name) {
  const url = `https://api.pixellab.ai/mcp/tilesets/${tilesetId}/image`
  const filename = `${tilesetId}.png`
  const outputPath = join(TILESETS_DIR, filename)
  
  if (existsSync(outputPath)) {
    console.log(`  ✓ Already exists: ${name}`)
    return { success: true, skipped: true }
  }
  
  console.log(`  Downloading: ${name}...`)
  const result = await downloadFile(url, outputPath)
  
  if (result.success) {
    console.log(`  ✓ Downloaded (${(result.size / 1024).toFixed(1)} KB)`)
    // Save metadata
    const metadataPath = join(TILESETS_DIR, `${tilesetId}.json`)
    writeFileSync(metadataPath, JSON.stringify({
      id: tilesetId,
      name,
      url,
      downloaded: new Date().toISOString()
    }, null, 2))
    return { success: true }
  } else {
    console.log(`  ✗ Failed: ${result.error}`)
    return { success: false }
  }
}

async function downloadMapObject(objectId, name, category = 'monsters') {
  const url = `https://api.pixellab.ai/mcp/map-object/${objectId}/download`
  const dir = category === 'npcs' ? NPCS_DIR : MONSTERS_DIR
  const filename = `${objectId}.png`
  const outputPath = join(dir, filename)
  
  if (existsSync(outputPath)) {
    console.log(`  ✓ Already exists: ${name}`)
    return { success: true, skipped: true }
  }
  
  console.log(`  Downloading: ${name}...`)
  const result = await downloadFile(url, outputPath)
  
  if (result.success) {
    console.log(`  ✓ Downloaded (${(result.size / 1024).toFixed(1)} KB)`)
    // Save metadata
    const metadataPath = join(dir, `${objectId}.json`)
    writeFileSync(metadataPath, JSON.stringify({
      id: objectId,
      name,
      category,
      url,
      downloaded: new Date().toISOString()
    }, null, 2))
    return { success: true }
  } else if (result.error === 'Still processing') {
    console.log(`  ⏳ Still processing, skipping for now`)
    return { success: false, processing: true }
  } else {
    console.log(`  ✗ Failed: ${result.error}`)
    return { success: false }
  }
}

async function downloadAllIsometricTiles() {
  console.log('\n=== Downloading Isometric Tiles ===')
  
  // Get all isometric tiles (we'll fetch in batches)
  const tiles = []
  let offset = 0
  const limit = 50
  
  while (true) {
    // We'll need to use the MCP tool to list tiles, but for now we'll use known tiles
    // This will be called from the main script that has MCP access
    break
  }
  
  return tiles
}

async function downloadAllTopdownTilesets() {
  console.log('\n=== Downloading Topdown Tilesets ===')
  
  // Known tilesets from the codebase
  const tilesets = [
    { id: 'ff25a566-d0f0-4c30-bed8-61e8cba689f2', name: 'Cyberpunk Roads' },
    { id: 'cf165ce0-165e-4a96-9aff-bc0e2f06010b', name: 'Cyberpunk Grass' },
    { id: 'b4e2f611-9d12-44ea-8d62-a0519637b3c8', name: 'Cyberpunk Pavement' },
    { id: '40b8bc42-eb26-4b55-9265-5da20238c992', name: 'Nexus City' },
    { id: 'a513db54-6bd9-464f-8670-cf40b0632f1f', name: 'Quantum Peak' },
    { id: 'b719057f-c055-4e6d-933b-5137d1cfa987', name: 'Void Depths' },
    { id: '7ee11e2a-e4c5-405d-892d-ab0c831b2745', name: 'Neon District' },
    { id: '08604457-a55d-462f-b247-7b02365e0a6a', name: 'Data Stream' },
  ]
  
  let downloaded = 0
  let skipped = 0
  let failed = 0
  
  for (const tileset of tilesets) {
    const result = await downloadTopdownTileset(tileset.id, tileset.name)
    if (result.success && !result.skipped) downloaded++
    else if (result.skipped) skipped++
    else failed++
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`\nTilesets: ${downloaded} downloaded, ${skipped} already existed, ${failed} failed`)
  return { downloaded, skipped, failed }
}

export { downloadIsometricTile, downloadTopdownTileset, downloadMapObject, downloadAllTopdownTilesets }

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllTopdownTilesets().catch(console.error)
}

