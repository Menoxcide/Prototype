/**
 * Find Blender installation path
 * Run: node scripts/find-blender-path.js
 */

import { execSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

console.log('Searching for Blender installation...\n')

const searchPaths = [
  // User's Blender installation
  'X:\\Blender\\Blender 4.5.3\\',
  // Windows common paths
  'C:\\Program Files\\Blender Foundation\\',
  'C:\\Program Files (x86)\\Blender Foundation\\',
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'Blender Foundation', '') : null,
  // Check if in PATH
  'blender',
].filter(Boolean)

const found = []

// Check standard locations
for (const basePath of searchPaths) {
  if (basePath === 'blender') {
    try {
      const version = execSync('blender --version', { encoding: 'utf-8', stdio: 'pipe' })
      found.push({ path: 'blender', version: version.split('\n')[0] })
      break
    } catch (e) {
      continue
    }
  }
  
  if (!existsSync(basePath)) {
    continue
  }
  
  try {
    const dirs = readdirSync(basePath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
    
    for (const dir of dirs) {
      // Check direct blender.exe
      const blenderExe = join(basePath, dir, 'blender.exe')
      if (existsSync(blenderExe)) {
        try {
          const version = execSync(`"${blenderExe}" --version`, { encoding: 'utf-8', stdio: 'pipe' })
          found.push({
            path: blenderExe,
            version: version.split('\n')[0],
            directory: dir
          })
        } catch (e) {
          // Exe exists but can't run
        }
      }
      
      // Check nested directories (for Blender 5.1 structure)
      try {
        const nestedDirs = readdirSync(join(basePath, dir), { withFileTypes: true })
          .filter(nd => nd.isDirectory())
          .map(nd => nd.name)
        
        for (const nestedDir of nestedDirs) {
          const nestedExe = join(basePath, dir, nestedDir, 'blender.exe')
          if (existsSync(nestedExe)) {
            try {
              const version = execSync(`"${nestedExe}" --version`, { encoding: 'utf-8', stdio: 'pipe' })
              found.push({
                path: nestedExe,
                version: version.split('\n')[0],
                directory: `${dir}/${nestedDir}`
              })
            } catch (e) {
              // Exe exists but can't run
            }
          }
        }
      } catch (e) {
        // Not a directory or can't read
      }
    }
  } catch (e) {
    // Can't read directory
  }
}

if (found.length > 0) {
  console.log('✅ Found Blender installation(s):\n')
  found.forEach((install, i) => {
    console.log(`${i + 1}. ${install.path}`)
    if (install.version) console.log(`   Version: ${install.version}`)
    if (install.directory) console.log(`   Directory: ${install.directory}`)
    console.log('')
  })
  
  const latest = found[0]
  console.log('To use this installation, set:')
  console.log(`$env:BLENDER_PATH="${latest.path}"`)
  console.log('\nOr add to your script:')
  console.log(`process.env.BLENDER_PATH = "${latest.path}"`)
} else {
  console.log('❌ Blender not found in common locations')
  console.log('\nPlease:')
  console.log('1. Install Blender from https://www.blender.org/')
  console.log('2. Or set BLENDER_PATH environment variable:')
  console.log('   $env:BLENDER_PATH="C:\\Path\\To\\Blender\\blender.exe"')
}

