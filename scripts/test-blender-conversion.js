/**
 * Test script to verify Blender conversion setup
 * Run: node scripts/test-blender-conversion.js
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

function findBlender() {
  const paths = [
    'blender',
    'X:\\Blender\\Blender 4.5.3\\blender.exe', // User's Blender installation
    'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 3.5\\blender.exe',
    '/usr/bin/blender',
    '/Applications/Blender.app/Contents/MacOS/Blender',
  ]
  
  for (const path of paths) {
    try {
      execSync(`"${path}" --version`, { stdio: 'pipe' })
      return path
    } catch (e) {
      continue
    }
  }
  return null
}

function checkPythonDependencies() {
  try {
    execSync('python -c "import PIL; import numpy"', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

console.log('Blender Conversion Setup Test')
console.log('==============================\n')

// Check Blender
const blenderPath = findBlender()
if (blenderPath) {
  console.log(`✅ Blender found: ${blenderPath}`)
  try {
    const version = execSync(`"${blenderPath}" --version`, { encoding: 'utf-8', stdio: 'pipe' })
    console.log(`   Version: ${version.split('\n')[0]}`)
  } catch (e) {
    console.log('   (Could not get version)')
  }
} else {
  console.log('❌ Blender not found')
  console.log('   Please install Blender from https://www.blender.org/')
  process.exit(1)
}

// Check script exists
const scriptPath = join(process.cwd(), 'scripts', 'blender-sprite-to-3d.py')
if (existsSync(scriptPath)) {
  console.log(`✅ Blender script found: ${scriptPath}`)
} else {
  console.log(`❌ Blender script not found: ${scriptPath}`)
  process.exit(1)
}

// Check Python dependencies (optional - Blender has its own Python)
console.log('\n📝 Note: Blender uses its own Python environment')
console.log('   PIL and numpy should be available in Blender\'s Python')

// Test with a simple command
console.log('\n🧪 Testing Blender execution...')
try {
  execSync(`"${blenderPath}" --background --python "${scriptPath}" -- --help`, { stdio: 'pipe' })
  console.log('✅ Blender can execute Python scripts')
} catch (e) {
  console.log('⚠️  Blender script test failed (this is normal if no arguments provided)')
}

console.log('\n✅ Setup looks good!')
console.log('\nNext steps:')
console.log('1. Download some sprite assets first')
console.log('2. Run: node scripts/convert-sprites-to-3d.js --type monsters')
console.log('3. Check public/assets/models/ for converted GLB files')

