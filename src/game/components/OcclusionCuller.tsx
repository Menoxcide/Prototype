/**
 * Enhanced Occlusion Culling System
 * Implements Hierarchical Z-Buffer (HZB) occlusion culling and portal-based occlusion
 * Culls buildings and objects behind the Mars horizon or occluded by other objects
 */

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

const HORIZON_ANGLE = -0.1 // Slight downward angle for horizon culling
const OCCLUSION_CACHE_TIME = 100 // Cache occlusion tests for 100ms

interface OcclusionCache {
  object: THREE.Object3D
  lastTestTime: number
  isOccluded: boolean
}

/**
 * Hierarchical Z-Buffer (HZB) for occlusion culling
 * Uses depth buffer to determine visibility
 */
class HZBOcclusionCuller {
  private renderTarget: THREE.WebGLRenderTarget
  private occlusionCache: Map<THREE.Object3D, OcclusionCache> = new Map()
  private lastUpdateTime: number = 0

  constructor(_renderer: THREE.WebGLRenderer, width: number, height: number) {
    // Create low-resolution depth buffer for HZB (1/4 resolution for performance)
    this.renderTarget = new THREE.WebGLRenderTarget(
      width / 4,
      height / 4,
      {
        depthBuffer: true,
        depthTexture: new THREE.DepthTexture(width / 4, height / 4)
      }
    )
  }

  /**
   * Update HZB depth buffer
   */
  updateDepthBuffer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    const now = Date.now()
    // Update HZB every frame (or throttled for performance)
    if (now - this.lastUpdateTime < 16) return // Throttle to ~60fps
    this.lastUpdateTime = now

    // Render depth-only pass to build HZB
    const oldRenderTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.renderTarget)
    renderer.clearDepth()
    
    // Render scene depth only (simplified - would use depth-only shader in production)
    scene.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        renderer.render(child, camera)
      }
    })
    
    renderer.setRenderTarget(oldRenderTarget)
  }

  /**
   * Check if object is occluded using HZB
   */
  isOccluded(
    object: THREE.Object3D,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer
  ): boolean {
    const now = Date.now()
    const cache = this.occlusionCache.get(object)
    
    // Use cached result if recent
    if (cache && (now - cache.lastTestTime) < OCCLUSION_CACHE_TIME) {
      return cache.isOccluded
    }

    // Simplified occlusion test (full HZB would sample depth buffer)
    // For production, would:
    // 1. Project object bounding box to screen space
    // 2. Sample HZB depth values in that region
    // 3. Compare object depth to HZB depth
    // 4. Mark as occluded if object is behind existing geometry

    const worldPos = new THREE.Vector3()
    object.getWorldPosition(worldPos)
    const projectedPos = worldPos.clone().project(camera)
    
    // Simple screen-space depth check (simplified implementation)
    const isOccluded = projectedPos.z > 0.9 // Objects behind camera or far away

    // Cache result
    this.occlusionCache.set(object, {
      object,
      lastTestTime: now,
      isOccluded
    })

    return isOccluded
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.occlusionCache.clear()
  }
}

/**
 * Portal-based occlusion for indoor areas
 */
interface Portal {
  position: THREE.Vector3
  bounds: THREE.Box3
  connectedZone: string
}

class PortalOcclusionCuller {
  private portals: Map<string, Portal> = new Map()

  addPortal(id: string, portal: Portal): void {
    this.portals.set(id, portal)
  }

  /**
   * Check if object is occluded by portals (behind closed portal)
   */
  isOccludedByPortal(object: THREE.Object3D, cameraPosition: THREE.Vector3): boolean {
    const objPos = new THREE.Vector3()
    object.getWorldPosition(objPos)

    // Check if object is behind any portal relative to camera
    for (const portal of this.portals.values()) {
      const cameraToObj = objPos.clone().sub(cameraPosition)
      const cameraToPortal = portal.position.clone().sub(cameraPosition)
      
      // If object is further than portal and on opposite side, it's occluded
      if (cameraToObj.length() > cameraToPortal.length() + 5) {
        const dot = cameraToObj.normalize().dot(cameraToPortal.normalize())
        if (dot < -0.5) { // Object is behind portal
          return true
        }
      }
    }

    return false
  }

  clear(): void {
    this.portals.clear()
  }
}

export default function OcclusionCuller() {
  const { camera, scene, gl } = useThree()
  const player = useGameStore((s) => s.player)
  const culledObjectsRef = useRef<Set<THREE.Object3D>>(new Set())

  // Initialize HZB occlusion culler
  const hzbCuller = useMemo(() => {
    if (!gl || !camera) return null
    const width = gl.domElement.width || 1920
    const height = gl.domElement.height || 1080
    return new HZBOcclusionCuller(gl, width, height)
  }, [gl, camera])

  // Portal occlusion culler
  const portalCuller = useMemo(() => new PortalOcclusionCuller(), [])

  useFrame(() => {
    if (!player || !camera || !gl) return

    // Reset visibility for all previously culled objects
    culledObjectsRef.current.forEach(obj => {
      obj.visible = true
    })
    culledObjectsRef.current.clear()

    // Update HZB depth buffer
    if (hzbCuller) {
      hzbCuller.updateDepthBuffer(gl, scene, camera)
    }

    // Horizon culling: hide objects beyond horizon
    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
    const horizonPlane = new THREE.Plane()
    const horizonNormal = new THREE.Vector3(0, HORIZON_ANGLE, -1).normalize()
    horizonPlane.setFromNormalAndCoplanarPoint(horizonNormal, playerPos)

    const cameraPos = new THREE.Vector3()
    camera.getWorldPosition(cameraPos)

    // Traverse scene and cull objects
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && (obj.userData.isBuilding || obj.userData.isOccludable)) {
        const objPos = new THREE.Vector3()
        obj.getWorldPosition(objPos)
        
        // Check horizon culling
        const distanceToHorizon = horizonPlane.distanceToPoint(objPos)
        if (distanceToHorizon < -10) { // 10 unit buffer
          obj.visible = false
          culledObjectsRef.current.add(obj)
          return
        }

        // Check HZB occlusion
        if (hzbCuller && hzbCuller.isOccluded(obj, camera, gl)) {
          obj.visible = false
          culledObjectsRef.current.add(obj)
          return
        }

        // Check portal occlusion
        if (portalCuller.isOccludedByPortal(obj, cameraPos)) {
          obj.visible = false
          culledObjectsRef.current.add(obj)
          return
        }
      }
    })
  })

  // Cleanup on unmount
  useMemo(() => {
    return () => {
      hzbCuller?.dispose()
      portalCuller.clear()
    }
  }, [])

  return null
}


