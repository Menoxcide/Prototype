/**
 * Simple script to generate placeholder PWA icons
 * Run with: node scripts/generate-icons.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create a simple SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <rect x="50" y="50" width="412" height="412" fill="#00ffff" opacity="0.2"/>
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="#00ffff" text-anchor="middle">N</text>
</svg>`

// Convert SVG to PNG using canvas (requires canvas package)
// For now, we'll create a simple solution using a data URI approach
// or create the SVG files and let the browser handle them

const publicDir = path.join(__dirname, '..', 'public')

// Create SVG icons (browsers can use SVG in manifest)
const icon192Svg = svgIcon.replace('width="512" height="512"', 'width="192" height="192"')
const icon512Svg = svgIcon

// Write SVG files
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), icon192Svg)
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), icon512Svg)

console.log('✅ Generated SVG icons in public/ directory')
console.log('Note: For production, convert these to PNG format')

