import { execSync } from 'child_process'
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs'
import { join, basename } from 'path'
import AdmZip from 'adm-zip'
import fetch from 'node-fetch'

// All race characters that need complete animation sets
const CHARACTERS_WITH_ANIMATIONS = [
  { id: '6f5e80b8-417c-4960-84a6-31adb96bc5f9', name: 'DarkKnight_Player', priority: 1 },
  { id: 'd8cc9856-9a12-47f2-84e2-70f533bf4846', name: 'Lunari_Male_Idle_128px', priority: 2 },
  { id: '2ac79bab-b877-4f64-9001-6ef39de81c27', name: 'Aetherborn_Male', priority: 3 },
  { id: 'f28518bf-a35e-4b49-bfeb-effd64958c55', name: 'Aetherborn_Male_Idle', priority: 4 },
]

const PUBLIC_DIR = join(process.cwd(), 'public', 'characters')
const TEMP_DIR = join(process.cwd(), 'temp', 'character-zips')

function downloadFile(url, outputPath) {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.statusText}`)
      }
      return response.buffer()
    })
    .then(buffer => {
      writeFileSync(outputPath, buffer)
      return true
    })
}

function organizeAnimations(characterId, extractedDir, targetDir) {
  // The ZIP structure from Pixellab can be either:
  // 1. {characterId}/rotations/... and {characterId}/animations/...
  // 2. rotations/... and animations/... (directly in extractedDir)
  
  const targetCharDir = join(targetDir, characterId)
  mkdirSync(targetCharDir, { recursive: true })
  
  // Try nested structure first
  let sourceCharDir = join(extractedDir, characterId)
  let sourceRotations = join(sourceCharDir, 'rotations')
  let sourceAnimations = join(sourceCharDir, 'animations')
  
  // If nested structure doesn't exist, try direct structure
  if (!existsSync(sourceCharDir)) {
    sourceCharDir = extractedDir
    sourceRotations = join(extractedDir, 'rotations')
    sourceAnimations = join(extractedDir, 'animations')
  }
  
  // Copy rotations
  const targetRotations = join(targetCharDir, 'rotations')
  if (existsSync(sourceRotations)) {
    mkdirSync(targetRotations, { recursive: true })
    execSync(`xcopy /E /I /Y "${sourceRotations}\\*" "${targetRotations}\\"`, { stdio: 'inherit' })
    console.log(`    Copied rotations`)
  }
  
  // Copy animations
  const targetAnimations = join(targetCharDir, 'animations')
  if (existsSync(sourceAnimations)) {
    mkdirSync(targetAnimations, { recursive: true })
    execSync(`xcopy /E /I /Y "${sourceAnimations}\\*" "${targetAnimations}\\"`, { stdio: 'inherit' })
    console.log(`    Copied animations`)
  }
  
  return true
}

async function downloadCharacterZip(character) {
  console.log(`\nDownloading ${character.name} (${character.id})...`)
  
  const zipUrl = `https://api.pixellab.ai/mcp/characters/${character.id}/download`
  const zipPath = join(TEMP_DIR, `${character.id}.zip`)
  const extractedDir = join(TEMP_DIR, character.id)
  
  mkdirSync(TEMP_DIR, { recursive: true })
  
  // Download ZIP
  console.log(`  Downloading ZIP...`)
  try {
    await downloadFile(zipUrl, zipPath)
  } catch (error) {
    if (error.message.includes('423')) {
      console.log(`  ⏳ Animations still processing, skipping for now`)
      return false
    }
    console.error(`  Error downloading ZIP for ${character.name}: ${error.message}`)
    return false
  }

  // Extract ZIP
  console.log(`  Extracting ZIP (${(readFileSync(zipPath).length / 1024).toFixed(1)} KB)...`)
  try {
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(extractedDir, true)
  } catch (error) {
    console.error(`  Error extracting ZIP for ${character.name}: ${error.message}`)
    return false
  }

  // Organize files
  console.log(`  Organizing files...`)
  const organized = organizeAnimations(character.id, extractedDir, PUBLIC_DIR)
  if (organized) {
    console.log(`  ✓ ${character.name} downloaded and organized!`)
  } else {
    console.warn(`  ✗ Failed to organize files for ${character.name}.`)
  }

  // Clean up extracted files
  rmSync(extractedDir, { recursive: true, force: true })
  rmSync(zipPath, { force: true })

  return organized
}

async function main() {
  console.log('Downloading character animation ZIPs from Pixellab...')
  console.log(`Output directory: ${PUBLIC_DIR}`)
  
  mkdirSync(PUBLIC_DIR, { recursive: true })
  
  let downloadedCount = 0
  for (const character of CHARACTERS_WITH_ANIMATIONS) {
    if (await downloadCharacterZip(character)) {
      downloadedCount++
    }
  }
  
  console.log(`\n✓ Download complete! ${downloadedCount}/${CHARACTERS_WITH_ANIMATIONS.length} characters downloaded.`)

  console.log('Cleaning up temp files...')
  rmSync(TEMP_DIR, { recursive: true, force: true })
}

main().catch(console.error)

