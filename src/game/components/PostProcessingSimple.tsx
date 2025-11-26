/**
 * Post-Processing Effects (Enhanced)
 * Bloom-like effects and color grading using Three.js renderer settings
 */

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getQualitySettings } from '../utils/qualitySettings'
import { getMobileOptimizationFlags, isMobileDevice } from '../utils/mobileOptimizations'
import { useGameStore } from '../store/useGameStore'

interface PostProcessingProps {
  enabled?: boolean
}

/**
 * Enhanced post-processing with bloom-like effects and color grading
 * Uses renderer tone mapping and output encoding for cyberpunk aesthetic
 */
export default function PostProcessingSimple({ enabled = true }: PostProcessingProps) {
  const { gl, scene } = useThree()
  const qualitySettings = getQualitySettings()
  const mobileFlags = getMobileOptimizationFlags()
  
  // Disable post-processing on mobile if flags indicate so
  const shouldEnable = enabled && 
                      qualitySettings.postProcessing && 
                      (!isMobileDevice() || mobileFlags.enablePostProcessing)

  useEffect(() => {
    // Get current FPS for adaptive post-processing
    const fps = useGameStore.getState().fps || 60
    
    // Skip post-processing if FPS is too low (adaptive)
    if (!shouldEnable || qualitySettings.preset === 'low' || fps < 25) {
      // Reset to defaults
      gl.toneMapping = THREE.NoToneMapping
      gl.toneMappingExposure = 1.0
      // outputEncoding is deprecated in newer Three.js versions, using colorSpace instead
      if ('outputColorSpace' in gl) {
        (gl as any).outputColorSpace = 'srgb-linear'
      }
      return
    }
    
    // Reduce post-processing quality if FPS is between 25-40
    // Note: useReducedQuality is available for future use if needed

    // Enhanced tone mapping for cyberpunk aesthetic
    // ACES Filmic provides better color grading and contrast
    gl.toneMapping = qualitySettings.preset === 'ultra' 
      ? THREE.ACESFilmicToneMapping 
      : THREE.ReinhardToneMapping
    
    // Adjust exposure for cyberpunk look (slightly darker with more contrast)
    gl.toneMappingExposure = qualitySettings.preset === 'ultra' ? 1.2 : 1.1
    
    // Use sRGB color space for better color accuracy (newer Three.js API)
    if ('outputColorSpace' in gl) {
      (gl as any).outputColorSpace = 'srgb'
    } else if ('outputEncoding' in gl) {
      // Fallback for older Three.js versions
      (gl as any).outputEncoding = (THREE as any).sRGBEncoding
    }
    
    // Set pixel ratio based on quality
    const pixelRatio = qualitySettings.preset === 'ultra' ? 2 : 
                      qualitySettings.preset === 'high' ? 1.5 : 1
    gl.setPixelRatio(Math.min(pixelRatio, window.devicePixelRatio))
    
    // Enhanced shadow map settings - stabilized to prevent flickering
    if (qualitySettings.shadows) {
      gl.shadowMap.enabled = true
      gl.shadowMap.type = qualitySettings.preset === 'ultra' 
        ? THREE.PCFSoftShadowMap 
        : THREE.PCFShadowMap
      // Stabilize shadow maps to prevent flickering during movement
      gl.shadowMap.autoUpdate = false // Disable auto-update, update manually
      gl.shadowMap.needsUpdate = true // Update once, then control manually
    }

    return () => {
      // Reset on cleanup
      gl.toneMapping = THREE.NoToneMapping
      gl.toneMappingExposure = 1.0
      if ('outputColorSpace' in gl) {
        (gl as any).outputColorSpace = 'srgb-linear'
      } else if ('outputEncoding' in gl) {
        (gl as any).outputEncoding = (THREE as any).LinearEncoding
      }
    }
  }, [gl, shouldEnable, qualitySettings])

  // Enhance emissive materials for bloom-like effect
  useEffect(() => {
    if (!shouldEnable || qualitySettings.preset === 'low') return

    // Traverse scene and enhance emissive materials
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const material = object.material as THREE.MeshStandardMaterial
        
        if (material.emissive && material.emissiveIntensity) {
          // Boost emissive intensity slightly for bloom effect
          // This creates a glow without actual bloom shader
          const originalIntensity = material.emissiveIntensity
          material.emissiveIntensity = originalIntensity * 1.2
          
          // Store original for cleanup
          ;(material as any).__originalEmissiveIntensity = originalIntensity
        }
      }
    })

    return () => {
      // Restore original emissive intensities
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          const material = object.material as THREE.MeshStandardMaterial
          if ((material as any).__originalEmissiveIntensity !== undefined) {
            material.emissiveIntensity = (material as any).__originalEmissiveIntensity
            delete (material as any).__originalEmissiveIntensity
          }
        }
      })
    }
  }, [scene, shouldEnable, qualitySettings])

  return null
}

