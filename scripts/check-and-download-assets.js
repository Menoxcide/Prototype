/**
 * Check status of Pixellab assets and download completed ones
 * Run this script periodically to download assets as they complete
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'

const PUBLIC_DIR = join(process.cwd(), 'public')
const ASSETS_DIR = join(PUBLIC_DIR, 'assets')
const ISOMETRIC_TILES_DIR = join(ASSETS_DIR, 'isometric-tiles')
const TILESETS_DIR = join(ASSETS_DIR, 'tilesets')

// Create directories
mkdirSync(ISOMETRIC_TILES_DIR, { recursive: true })
mkdirSync(TILESETS_DIR, { recursive: true })

// Biome tilesets to check
const BIOME_TILESETS = [
  { id: '6e6bbf1e-02e5-491f-9bd5-c22280bac46a', name: 'Sunflower Meadows' },
  { id: '41a31faf-818a-4f35-b4a8-ac3cce90d2df', name: 'Crystal Forest' },
  { id: '9724bde1-b8fb-4510-8c3c-226088baec84', name: 'Rainbow Hills' },
  { id: '8ed98795-2bf6-4346-975d-209f23f368db', name: 'Candy Canyon' },
  { id: '345e398d-01e3-4566-b0a2-57d328da77b5', name: 'Ocean Reef' },
  { id: '8fe47e9a-8b7d-4f80-825c-ae2622c6cf1e', name: 'Starlight Desert' },
  { id: 'c4bf17d0-b169-4c06-93da-50c34b8e3077', name: 'Frosty Peaks' },
  { id: 'fd70fdbe-fe0d-4f44-a3d5-8acbd29d66c4', name: 'Volcano Islands' },
  { id: '5df2a8a8-301e-48df-986a-6b2364a897aa', name: 'Cloud Kingdom' },
  { id: '9a6b1c23-8973-4586-8f37-4f4593bdc41a', name: 'Enchanted Grove' },
]

async function checkTilesetStatus(tilesetId, name) {
  const url = `https://api.pixellab.ai/mcp/tilesets/${tilesetId}/image`
  const outputPath = join(TILESETS_DIR, `${tilesetId}.png`)
  
  if (existsSync(outputPath)) {
    console.log(`  ✓ ${name}: Already downloaded`)
    return { status: 'downloaded', tilesetId, name }
  }
  
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (response.ok) {
      // Download it
      const downloadResponse = await fetch(url)
      const buffer = await downloadResponse.buffer()
      writeFileSync(outputPath, buffer)
      console.log(`  ✅ ${name}: Downloaded (${(buffer.length / 1024).toFixed(1)} KB)`)
      return { status: 'downloaded', tilesetId, name }
    } else if (response.status === 423) {
      const retryAfter = response.headers.get('Retry-After') || 'unknown'
      console.log(`  ⏳ ${name}: Still processing (retry after ${retryAfter}s)`)
      return { status: 'processing', tilesetId, name, retryAfter }
    } else {
      console.log(`  ✗ ${name}: Error ${response.status}`)
      return { status: 'error', tilesetId, name, error: response.status }
    }
  } catch (error) {
    console.log(`  ✗ ${name}: ${error.message}`)
    return { status: 'error', tilesetId, name, error: error.message }
  }
}

async function main() {
  console.log('Checking biome tileset status...\n')
  
  const results = []
  for (const tileset of BIOME_TILESETS) {
    const result = await checkTilesetStatus(tileset.id, tileset.name)
    results.push(result)
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log('\n=== Summary ===')
  const downloaded = results.filter(r => r.status === 'downloaded').length
  const processing = results.filter(r => r.status === 'processing').length
  const errors = results.filter(r => r.status === 'error').length
  
  console.log(`Downloaded: ${downloaded}/${BIOME_TILESETS.length}`)
  console.log(`Processing: ${processing}`)
  console.log(`Errors: ${errors}`)
  
  if (downloaded > 0) {
    console.log('\n✅ Some tilesets are ready! Update the game to use them.')
  }
  if (processing > 0) {
    console.log('\n⏳ Some tilesets are still processing. Run this script again later.')
  }
}

main().catch(console.error)

