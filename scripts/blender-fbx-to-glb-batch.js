/**
 * Blender FBX to GLB Batch Converter
 * Automates conversion of all FBX files to GLB format using Blender
 */

import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Blender path (provided by user)
const BLENDER_PATH = process.env.BLENDER_PATH || 'X:\\Blender\\Blender-5.1.0\\blender.exe'

// Source directory
const SOURCE_DIR = path.join(rootDir, 'temp', 'sci-fi-modular-extracted', 'Ultimate Modular Sci-Fi - Feb 2021', 'FBX')

// Output directory (temporary, will be organized later)
const OUTPUT_DIR = path.join(rootDir, 'temp', 'converted-glb')

// Batch size for processing
const BATCH_SIZE = 10

// Conversion log
const CONVERSION_LOG = []

/**
 * Find all FBX files recursively
 */
function findFBXFiles(dir) {
  const files = []
  
  if (!fs.existsSync(dir)) {
    console.error(`ERROR: Source directory not found: ${dir}`)
    return files
  }

  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.fbx')) {
        files.push(fullPath)
      }
    }
  }
  
  scanDirectory(dir)
  return files
}

/**
 * Get relative path from source directory
 */
function getRelativePath(fullPath, baseDir) {
  return path.relative(baseDir, fullPath)
}

/**
 * Convert single FBX to GLB
 */
function convertFBXToGLB(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const pythonScript = path.join(__dirname, 'blender-fbx-to-glb.py')
    
    // Build command
    const command = `"${BLENDER_PATH}"`
    const args = [
      '--background',
      '--python',
      pythonScript,
      '--',
      inputPath,
      outputPath
    ]

    console.log(`  Converting: ${path.basename(inputPath)}`)

    const process = spawn(command, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      // Check if output file was actually created (addon errors may not prevent export)
      const fileExists = fs.existsSync(outputPath)
      
      if (fileExists || code === 0) {
        const logEntry = {
          input: inputPath,
          output: outputPath,
          success: true,
          timestamp: new Date().toISOString()
        }
        CONVERSION_LOG.push(logEntry)
        console.log(`    ✓ Success`)
        resolve(logEntry)
      } else {
        const logEntry = {
          input: inputPath,
          output: outputPath,
          success: false,
          error: stderr || stdout,
          timestamp: new Date().toISOString()
        }
        CONVERSION_LOG.push(logEntry)
        console.log(`    ✗ Failed: ${stderr || 'Unknown error'}`)
        reject(logEntry)
      }
    })

    process.on('error', (error) => {
      const logEntry = {
        input: inputPath,
        output: outputPath,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
      CONVERSION_LOG.push(logEntry)
      console.log(`    ✗ Error: ${error.message}`)
      reject(logEntry)
    })
  })
}

/**
 * Process files in batches
 */
async function processBatch(files, startIndex, batchSize) {
  const batch = files.slice(startIndex, startIndex + batchSize)
  const promises = []

  for (const file of batch) {
    const relativePath = getRelativePath(file, SOURCE_DIR)
    const outputPath = path.join(OUTPUT_DIR, relativePath.replace(/\.fbx$/i, '.glb'))
    
    promises.push(
      convertFBXToGLB(file, outputPath).catch(err => err)
    )
  }

  return Promise.all(promises)
}

/**
 * Main conversion function
 */
async function convertAllFBX() {
  console.log('='.repeat(60))
  console.log('FBX to GLB Batch Converter')
  console.log('='.repeat(60))
  console.log(`Blender: ${BLENDER_PATH}`)
  console.log(`Source:  ${SOURCE_DIR}`)
  console.log(`Output:  ${OUTPUT_DIR}\n`)

  // Check Blender exists
  if (!fs.existsSync(BLENDER_PATH)) {
    console.error(`ERROR: Blender not found at: ${BLENDER_PATH}`)
    console.error('Please set BLENDER_PATH environment variable or update the script')
    process.exit(1)
  }

  // Find all FBX files
  console.log('Scanning for FBX files...')
  const fbxFiles = findFBXFiles(SOURCE_DIR)
  console.log(`Found ${fbxFiles.length} FBX files\n`)

  if (fbxFiles.length === 0) {
    console.log('No FBX files found. Exiting.')
    return
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // Process in batches
  const totalBatches = Math.ceil(fbxFiles.length / BATCH_SIZE)
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < fbxFiles.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    console.log(`\nBatch ${batchNum}/${totalBatches} (${Math.min(BATCH_SIZE, fbxFiles.length - i)} files)`)
    console.log('-'.repeat(60))

    try {
      const results = await processBatch(fbxFiles, i, BATCH_SIZE)
      
      for (const result of results) {
        if (result.success) {
          successCount++
        } else {
          failCount++
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < fbxFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error(`Error processing batch:`, error)
      failCount += Math.min(BATCH_SIZE, fbxFiles.length - i)
    }
  }

  // Save conversion log
  const logPath = path.join(rootDir, 'temp', 'conversion-log.json')
  fs.writeFileSync(logPath, JSON.stringify(CONVERSION_LOG, null, 2))

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Conversion Summary')
  console.log('='.repeat(60))
  console.log(`Total files:  ${fbxFiles.length}`)
  console.log(`Successful:   ${successCount}`)
  console.log(`Failed:       ${failCount}`)
  console.log(`Log saved to: ${logPath}`)
  console.log('='.repeat(60))
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  convertAllFBX().catch(console.error)
}

export { convertAllFBX, convertFBXToGLB, findFBXFiles }

