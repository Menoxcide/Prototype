/**
 * Compression Support Detection
 * Detects browser support for various compression formats
 */

import { getDeviceCapabilities } from './mobileOptimizations'

export interface CompressionSupport {
  ktx2: boolean
  basis: boolean
  draco: boolean
  webp: boolean
  avif: boolean
}

/**
 * Detect compression format support
 */
export function detectCompressionSupport(): CompressionSupport {
  const canvas = document.createElement('canvas')
  
  // Check WebP support
  const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  
  // Check AVIF support (newer format)
  let avifSupported = false
  try {
    const avifTest = new Image()
    avifTest.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
    avifSupported = true // If no error, assume supported (simplified check)
  } catch {
    avifSupported = false
  }
  
  // KTX2 and Basis require WebGL 2 and specific extensions
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  let ktx2Supported = false
  let basisSupported = false
  
  if (gl) {
    // Check for KTX2 support (via extension)
    const ktx2Ext = gl.getExtension('WEBGL_compressed_texture_ktx2')
    ktx2Supported = !!ktx2Ext
    
    // Basis Universal support (often bundled with KTX2)
    basisSupported = ktx2Supported || !!gl.getExtension('WEBGL_compressed_texture_s3tc')
  }
  
  // Draco compression is handled at load time, assume supported if WebGL available
  const dracoSupported = !!gl
  
  return {
    ktx2: ktx2Supported,
    basis: basisSupported,
    draco: dracoSupported,
    webp: webpSupported,
    avif: avifSupported
  }
}

/**
 * Get optimal compression format based on device capabilities
 */
export function getOptimalCompressionFormat(): {
  texture: 'ktx2' | 'basis' | 'webp' | 'png'
  model: 'draco' | 'glb'
  image: 'webp' | 'avif' | 'png'
} {
  const support = detectCompressionSupport()
  const deviceCapabilities = getDeviceCapabilities()
  
  // Texture compression priority: KTX2 > Basis > WebP > PNG
  let texture: 'ktx2' | 'basis' | 'webp' | 'png' = 'png'
  if (support.ktx2 && deviceCapabilities.webglVersion === 'webgl2') {
    texture = 'ktx2'
  } else if (support.basis) {
    texture = 'basis'
  } else if (support.webp) {
    texture = 'webp'
  }
  
  // Model compression: Draco if supported, otherwise GLB
  const model: 'draco' | 'glb' = support.draco ? 'draco' : 'glb'
  
  // Image format: AVIF > WebP > PNG
  let image: 'webp' | 'avif' | 'png' = 'png'
  if (support.avif) {
    image = 'avif'
  } else if (support.webp) {
    image = 'webp'
  }
  
  return { texture, model, image }
}

// Cache compression support
let cachedSupport: CompressionSupport | null = null

/**
 * Get compression support (cached)
 */
export function getCompressionSupport(): CompressionSupport {
  if (cachedSupport) {
    return cachedSupport
  }
  
  cachedSupport = detectCompressionSupport()
  
  // Store in localStorage
  try {
    localStorage.setItem('compressionSupport', JSON.stringify(cachedSupport))
  } catch {
    // Ignore localStorage errors
  }
  
  return cachedSupport
}

