/**
 * Test FBX to GLB conversion with 2-3 sample files
 */

import { convertFBXToGLB, findFBXFiles } from './blender-fbx-to-glb-batch.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const SOURCE_DIR = path.join(rootDir, 'temp', 'sci-fi-modular-extracted', 'Ultimate Modular Sci-Fi - Feb 2021', 'FBX')
const TEST_OUTPUT_DIR = path.join(rootDir, 'temp', 'test-converted-glb')

async function testConversion() {
  console.log('Testing FBX to GLB conversion...\n')

  // Find sample files
  const allFiles = findFBXFiles(SOURCE_DIR)
  const testFiles = allFiles.slice(0, 3) // Test first 3 files

  if (testFiles.length === 0) {
    console.error('No FBX files found for testing')
    return
  }

  console.log(`Testing with ${testFiles.length} files:`)
  testFiles.forEach(f => console.log(`  - ${path.basename(f)}`))
  console.log('')

  // Create test output directory
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true })
  }

  let successCount = 0
  let failCount = 0

  for (const file of testFiles) {
    const fileName = path.basename(file, '.fbx')
    const outputPath = path.join(TEST_OUTPUT_DIR, `${fileName}.glb`)

    try {
      await convertFBXToGLB(file, outputPath)
      successCount++

      // Check if file was created
      if (fs.existsSync(outputPath)) {
        const size = fs.statSync(outputPath).size
        console.log(`  ✓ File created: ${(size / 1024).toFixed(2)} KB`)
      }
    } catch (error) {
      failCount++
      console.error(`  ✗ Failed: ${error.message || error}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('Test Results')
  console.log('='.repeat(50))
  console.log(`Successful: ${successCount}/${testFiles.length}`)
  console.log(`Failed:     ${failCount}/${testFiles.length}`)
  console.log(`Output:     ${TEST_OUTPUT_DIR}`)
  console.log('='.repeat(50))

  if (successCount === testFiles.length) {
    console.log('\n✓ All test conversions successful! Ready for full batch conversion.')
  } else {
    console.log('\n⚠ Some conversions failed. Check errors above.')
  }
}

testConversion().catch(console.error)

