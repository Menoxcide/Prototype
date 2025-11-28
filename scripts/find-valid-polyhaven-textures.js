/**
 * Find valid Poly Haven texture IDs by searching the API
 */

import https from 'https'

const POLYHAVEN_API = 'https://api.polyhaven.com'

/**
 * Search for textures
 */
function searchTextures(query) {
  return new Promise((resolve, reject) => {
    const url = `${POLYHAVEN_API}/files?t=texture&q=${encodeURIComponent(query)}`
    
    https.get(url, (response) => {
      let data = ''
      
      response.on('data', (chunk) => {
        data += chunk
      })
      
      response.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve(result)
        } catch (error) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`))
        }
      })
    }).on('error', reject)
  })
}

/**
 * Get all textures
 */
async function getAllTextures() {
  const categories = ['metal', 'concrete', 'sci-fi', 'cyberpunk', 'industrial', 'rust', 'panel']
  const allTextures = {}
  
  for (const category of categories) {
    try {
      console.log(`Searching for: ${category}...`)
      const results = await searchTextures(category)
      Object.assign(allTextures, results)
      await new Promise(resolve => setTimeout(resolve, 500)) // Rate limiting
    } catch (error) {
      console.error(`Error searching ${category}:`, error.message)
    }
  }
  
  return allTextures
}

/**
 * Main function
 */
async function findValidTextures() {
  console.log('='.repeat(60))
  console.log('Finding Valid Poly Haven Texture IDs')
  console.log('='.repeat(60))
  console.log('\nSearching Poly Haven API...\n')
  
  try {
    const textures = await getAllTextures()
    const textureIds = Object.keys(textures).slice(0, 30) // Get first 30
    
    console.log(`Found ${Object.keys(textures).length} total textures`)
    console.log(`\nSample texture IDs (first 30):`)
    textureIds.forEach((id, index) => {
      const info = textures[id]
      console.log(`${index + 1}. ${id} - ${info.name || 'Unknown'} (${info.type || 'texture'})`)
    })
    
    // Save to file
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const outputPath = path.join(__dirname, 'valid-polyhaven-textures.json')
    
    fs.writeFileSync(outputPath, JSON.stringify({
      total: Object.keys(textures).length,
      sample: textureIds.map(id => ({
        id,
        name: textures[id].name,
        type: textures[id].type
      }))
    }, null, 2))
    
    console.log(`\n✅ Saved sample IDs to: ${outputPath}`)
    console.log('\nUse these IDs in download scripts or Blender MCP tools')
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  findValidTextures().catch(console.error)
}

export { findValidTextures, searchTextures }

