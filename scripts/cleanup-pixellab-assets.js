/**
 * Cleanup Pixellab 2D/2.5D Assets
 * Removes all isometric, 2D, and 2.5D assets downloaded from Pixellab
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Directories to remove
const DIRECTORIES_TO_REMOVE = [
  'public/public/assets/isometric-tiles',
  'public/public/assets/tilesets',
  'public/assets/models/tiles'
]

// Archive directory (optional)
const ARCHIVE_DIR = path.join(rootDir, 'temp', 'archived-pixellab-assets')

/**
 * Remove directory recursively
 */
function removeDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`  ⚠ Directory doesn't exist: ${dirPath}`)
    return false
  }

  try {
    fs.rmSync(dirPath, { recursive: true, force: true })
    console.log(`  ✓ Removed: ${dirPath}`)
    return true
  } catch (error) {
    console.error(`  ✗ Failed to remove ${dirPath}:`, error.message)
    return false
  }
}

/**
 * Archive directory before removal
 */
function archiveDirectory(sourcePath, archivePath) {
  if (!fs.existsSync(sourcePath)) {
    return false
  }

  try {
    const archiveParent = path.dirname(archivePath)
    if (!fs.existsSync(archiveParent)) {
      fs.mkdirSync(archiveParent, { recursive: true })
    }

    // Copy directory
    fs.cpSync(sourcePath, archivePath, { recursive: true })
    console.log(`  ✓ Archived to: ${archivePath}`)
    return true
  } catch (error) {
    console.error(`  ✗ Failed to archive ${sourcePath}:`, error.message)
    return false
  }
}

/**
 * Main cleanup function
 */
function cleanupPixellabAssets(archive = true) {
  console.log('Cleaning up Pixellab 2D/2.5D assets...\n')

  let removedCount = 0
  let archivedCount = 0

  for (const dir of DIRECTORIES_TO_REMOVE) {
    const fullPath = path.join(rootDir, dir)
    const dirName = path.basename(dir)

    console.log(`Processing: ${dir}`)

    if (archive) {
      const archivePath = path.join(ARCHIVE_DIR, dirName)
      if (archiveDirectory(fullPath, archivePath)) {
        archivedCount++
      }
    }

    if (removeDirectory(fullPath)) {
      removedCount++
    }

    console.log('')
  }

  console.log('='.repeat(50))
  console.log(`Cleanup complete!`)
  console.log(`  Removed: ${removedCount} directories`)
  if (archive) {
    console.log(`  Archived: ${archivedCount} directories`)
    console.log(`  Archive location: ${ARCHIVE_DIR}`)
  }
  console.log('='.repeat(50))
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const archive = process.argv.includes('--no-archive') ? false : true
  cleanupPixellabAssets(archive)
}

export { cleanupPixellabAssets }

