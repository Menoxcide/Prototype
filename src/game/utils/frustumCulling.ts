/**
 * Frustum Culling - Determines which objects are visible in camera frustum
 * Reduces rendering overhead by skipping off-screen objects
 */

import * as THREE from 'three'

export interface FrustumCuller {
  isInFrustum(position: { x: number; y: number; z: number }, radius: number, camera: THREE.Camera): boolean
  updateFrustum(camera: THREE.Camera): void
}

export function createFrustumCuller(): FrustumCuller {
  const frustum = new THREE.Frustum()
  const matrix = new THREE.Matrix4()

  return {
    updateFrustum(camera: THREE.Camera): void {
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.setFromProjectionMatrix(matrix)
    },

    isInFrustum(position: { x: number; y: number; z: number }, radius: number, camera: THREE.Camera): boolean {
      this.updateFrustum(camera)
      
      // Create bounding sphere
      const sphere = new THREE.Sphere(
        new THREE.Vector3(position.x, position.y, position.z),
        radius
      )

      return frustum.intersectsSphere(sphere)
    }
  }
}

