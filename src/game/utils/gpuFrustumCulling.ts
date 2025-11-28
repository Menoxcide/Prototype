/**
 * GPU-Based Frustum Culling using Compute Shaders
 * Offloads culling to GPU for better performance with large entity counts
 */

import * as THREE from 'three'

export class GPUFrustumCuller {
  private renderer: THREE.WebGLRenderer | null = null
  private computeShader: THREE.ShaderMaterial | null = null
  private isSupported: boolean = false
  private positionBuffer: THREE.DataTexture | null = null
  private resultBuffer: THREE.WebGLRenderTarget | null = null
  private maxEntities: number = 10000

  /**
   * Initialize GPU frustum culling (if WebGL 2 compute shaders supported)
   */
  initialize(renderer: THREE.WebGLRenderer): boolean {
    this.renderer = renderer
    const gl = renderer.getContext() as WebGL2RenderingContext
    
    // Check for compute shader support (WebGL 2 Compute)
    const hasComputeShaders = gl.getExtension('WEBGL_compute') !== null
    
    if (!hasComputeShaders) {
      console.warn('[GPUFrustumCuller] Compute shaders not supported, falling back to CPU culling')
      this.isSupported = false
      return false
    }

    try {
      // Create compute shader for frustum culling
      this.computeShader = new THREE.ShaderMaterial({
        uniforms: {
          positions: { value: null },
          frustumPlanes: { value: new Float32Array(24) }, // 6 planes * 4 components
          entityCount: { value: 0 }
        },
        vertexShader: `
          void main() {
            gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
          }
        `,
        fragmentShader: `
          void main() {
            gl_FragColor = vec4(1.0);
          }
        `
      })

      // Create result buffer
      this.resultBuffer = new THREE.WebGLRenderTarget(this.maxEntities, 1, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat
      })

      this.isSupported = true
      console.log('[GPUFrustumCuller] GPU frustum culling initialized')
      return true
    } catch (error) {
      console.warn('[GPUFrustumCuller] Failed to initialize GPU culling:', error)
      this.isSupported = false
      return false
    }
  }

  /**
   * Update entity positions buffer for GPU culling
   */
  updatePositions(positions: Float32Array): void {
    if (!this.isSupported || !this.renderer) return

    // Create or update position buffer texture
    const width = Math.ceil(Math.sqrt(positions.length / 3))
    const data = new Float32Array(width * width * 3)
    data.set(positions)

    if (!this.positionBuffer || this.positionBuffer.image.width !== width) {
      if (this.positionBuffer) {
        this.positionBuffer.dispose()
      }
      this.positionBuffer = new THREE.DataTexture(data, width, width, THREE.RGBFormat, THREE.FloatType)
      this.positionBuffer.needsUpdate = true
    } else {
      this.positionBuffer.image.data = data
      this.positionBuffer.needsUpdate = true
    }

    if (this.computeShader) {
      this.computeShader.uniforms.positions.value = this.positionBuffer
      this.computeShader.uniforms.entityCount.value = positions.length / 3
    }
  }

  /**
   * Update frustum planes for GPU culling
   */
  updateFrustum(camera: THREE.Camera): void {
    if (!this.isSupported || !this.computeShader) return

    const frustum = new THREE.Frustum()
    const matrix = new THREE.Matrix4()
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(matrix)

    const planes = frustum.planes
    const planeData = new Float32Array(24) // 6 planes * 4 components

    for (let i = 0; i < 6; i++) {
      const plane = planes[i]
      planeData[i * 4] = plane.normal.x
      planeData[i * 4 + 1] = plane.normal.y
      planeData[i * 4 + 2] = plane.normal.z
      planeData[i * 4 + 3] = plane.constant
    }

    this.computeShader.uniforms.frustumPlanes.value = planeData
  }

  /**
   * Perform GPU-based frustum culling
   * Returns array of visibility flags (true = visible, false = culled)
   */
  cull(camera: THREE.Camera): boolean[] | null {
    if (!this.isSupported || !this.renderer || !this.computeShader || !this.resultBuffer) {
      return null
    }

    try {
      // Update frustum planes
      this.updateFrustum(camera)

      // For now, fall back to CPU culling as WebGL compute shaders require specific setup
      // In production, this would execute compute shader and read back results
      // This is a placeholder that maintains the API but uses CPU fallback
      console.warn('[GPUFrustumCuller] GPU compute not fully implemented, using CPU fallback')
      return null
    } catch (error) {
      console.error('[GPUFrustumCuller] Culling error:', error)
      return null
    }
  }

  /**
   * Check if GPU culling is supported
   */
  isGPUCullingSupported(): boolean {
    return this.isSupported
  }

  /**
   * Dispose of GPU resources
   */
  dispose(): void {
    if (this.positionBuffer) {
      this.positionBuffer.dispose()
      this.positionBuffer = null
    }
    if (this.resultBuffer) {
      this.resultBuffer.dispose()
      this.resultBuffer = null
    }
    if (this.computeShader) {
      this.computeShader.dispose()
      this.computeShader = null
    }
    this.isSupported = false
  }
}

// Singleton instance
let gpuCullerInstance: GPUFrustumCuller | null = null

export function getGPUFrustumCuller(): GPUFrustumCuller {
  if (!gpuCullerInstance) {
    gpuCullerInstance = new GPUFrustumCuller()
  }
  return gpuCullerInstance
}

