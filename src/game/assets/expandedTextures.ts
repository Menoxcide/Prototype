/**
 * Expanded Texture Generation
 * Zone-specific and environment textures
 */

import * as THREE from 'three'
import { assetManager } from './assetManager'

/**
 * Generate zone-specific ground texture
 */
export function generateZoneGroundTexture(zoneId: string): THREE.Texture {
  const existing = assetManager.getTexture(`ground-${zoneId}`)
  if (existing) return existing

  return assetManager.generateTexture(`ground-${zoneId}`, 512, 512, (ctx) => {
    const zoneConfig: Record<string, { base: string; grid: string; accent: string }> = {
      nexus_city: {
        base: '#0a0a0a',
        grid: '#00ffff',
        accent: '#0099ff'
      },
      quantum_peak: {
        base: '#001122',
        grid: '#0099ff',
        accent: '#00ffff'
      },
      void_depths: {
        base: '#050010',
        grid: '#9d00ff',
        accent: '#ff00ff'
      },
      neon_district: {
        base: '#0a000a',
        grid: '#ff00ff',
        accent: '#ff00aa'
      },
      data_stream: {
        base: '#000a0a',
        grid: '#00ff00',
        accent: '#00ff88'
      }
    }

    const config = zoneConfig[zoneId] || zoneConfig.nexus_city

    // Base color
    ctx.fillStyle = config.base
    ctx.fillRect(0, 0, 512, 512)

    // Grid pattern
    ctx.strokeStyle = config.grid
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 32; i++) {
      ctx.beginPath()
      ctx.moveTo(i * 16, 0)
      ctx.lineTo(i * 16, 512)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * 16)
      ctx.lineTo(512, i * 16)
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0

    // Accent highlights
    ctx.fillStyle = config.accent
    ctx.globalAlpha = 0.2
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const size = 5 + Math.random() * 10
      ctx.fillRect(x, y, size, size)
    }
    ctx.globalAlpha = 1.0

    // Zone-specific details
    if (zoneId === 'void_depths') {
      // Void cracks
      ctx.strokeStyle = config.accent
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.4
      for (let i = 0; i < 10; i++) {
        ctx.beginPath()
        ctx.moveTo(Math.random() * 512, Math.random() * 512)
        ctx.lineTo(Math.random() * 512, Math.random() * 512)
        ctx.stroke()
      }
      ctx.globalAlpha = 1.0
    } else if (zoneId === 'data_stream') {
      // Data flow lines
      ctx.strokeStyle = config.accent
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      for (let i = 0; i < 15; i++) {
        ctx.beginPath()
        ctx.moveTo(0, Math.random() * 512)
        ctx.lineTo(512, Math.random() * 512)
        ctx.stroke()
      }
      ctx.globalAlpha = 1.0
    }
  })
}

/**
 * Generate wall texture
 */
export function generateWallTexture(): THREE.Texture {
  const existing = assetManager.getTexture('wall')
  if (existing) return existing

  return assetManager.generateTexture('wall', 512, 512, (ctx) => {
    // Base metal color
    const gradient = ctx.createLinearGradient(0, 0, 512, 512)
    gradient.addColorStop(0, '#1a1a1a')
    gradient.addColorStop(0.5, '#2a2a2a')
    gradient.addColorStop(1, '#1a1a1a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)

    // Metal panels
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.strokeRect(i * 64 + 2, j * 64 + 2, 60, 60)
      }
    }
    ctx.globalAlpha = 1.0

    // Rivets
    ctx.fillStyle = '#00ffff'
    ctx.globalAlpha = 0.5
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const x = i * 64 + 32
        const y = j * 64 + 32
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1.0

    // Wear and scratches
    ctx.strokeStyle = '#0a0a0a'
    ctx.lineWidth = 1
    for (let i = 0; i < 30; i++) {
      ctx.beginPath()
      ctx.moveTo(Math.random() * 512, Math.random() * 512)
      ctx.lineTo(Math.random() * 512, Math.random() * 512)
      ctx.stroke()
    }
  })
}

/**
 * Generate energy texture for effects
 */
export function generateEnergyTexture(color: string = '#00ffff'): THREE.Texture {
  const existing = assetManager.getTexture(`energy-${color}`)
  if (existing) return existing

  return assetManager.generateTexture(`energy-${color}`, 256, 256, (ctx) => {
    // Radial gradient
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, color)
    gradient.addColorStop(0.5, color + '80')
    gradient.addColorStop(1, color + '00')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    // Energy waves
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.6
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.arc(128, 128, 20 + i * 20, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0
  })
}

/**
 * Generate particle texture
 */
export function generateParticleTexture(): THREE.Texture {
  const existing = assetManager.getTexture('particle')
  if (existing) return existing

  return assetManager.generateTexture('particle', 64, 64, (ctx) => {
    // Radial gradient for soft particle
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.3, '#ffffff80')
    gradient.addColorStop(1, '#ffffff00')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
  })
}

/**
 * Generate hologram texture
 */
export function generateHologramTexture(): THREE.Texture {
  const existing = assetManager.getTexture('hologram')
  if (existing) return existing

  return assetManager.generateTexture('hologram', 512, 512, (ctx) => {
    // Base with transparency
    ctx.fillStyle = '#00ffff20'
    ctx.fillRect(0, 0, 512, 512)

    // Scan lines
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 20; i++) {
      ctx.beginPath()
      ctx.moveTo(0, i * 25.6)
      ctx.lineTo(512, i * 25.6)
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0

    // Grid overlay
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.2
    for (let i = 0; i < 16; i++) {
      ctx.beginPath()
      ctx.moveTo(i * 32, 0)
      ctx.lineTo(i * 32, 512)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * 32)
      ctx.lineTo(512, i * 32)
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0
  })
}

/**
 * Generate damage number texture
 */
export function generateDamageNumberTexture(): THREE.Texture {
  const existing = assetManager.getTexture('damage-number')
  if (existing) return existing

  return assetManager.generateTexture('damage-number', 128, 128, (ctx) => {
    // Glowing background
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, '#ff0000')
    gradient.addColorStop(0.5, '#ff000080')
    gradient.addColorStop(1, '#ff000000')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  })
}

/**
 * Preload all expanded textures
 */
export function preloadExpandedTextures(): void {
  // Zone ground textures
  generateZoneGroundTexture('nexus_city')
  generateZoneGroundTexture('quantum_peak')
  generateZoneGroundTexture('void_depths')
  generateZoneGroundTexture('neon_district')
  generateZoneGroundTexture('data_stream')

  // Environment textures
  generateWallTexture()
  generateEnergyTexture('#00ffff')
  generateEnergyTexture('#ff00ff')
  generateEnergyTexture('#9d00ff')
  generateParticleTexture()
  generateHologramTexture()
  generateDamageNumberTexture()
}

