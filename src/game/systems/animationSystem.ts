/**
 * Animation System
 * Handles character and enemy animations using Three.js animation system
 */

import * as THREE from 'three'

export type AnimationState = 'idle' | 'walk' | 'run' | 'attack' | 'cast' | 'hit' | 'death'

export interface AnimationConfig {
  state: AnimationState
  loop: boolean
  speed: number
  blendTime?: number
}

export class AnimationController {
  private mixer: THREE.AnimationMixer
  private actions: Map<AnimationState, THREE.AnimationAction> = new Map()
  private currentAction: THREE.AnimationAction | null = null
  private currentState: AnimationState = 'idle'

  constructor(object: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(object)
    this.setupAnimations()
  }

  /**
   * Setup procedural animations
   */
  private setupAnimations(): void {
    // Create animation clips procedurally
    // In a real implementation, these would be loaded from model files
    
    // Idle animation - subtle floating
    const idleClip = this.createFloatAnimation('idle', 2.0)
    const idleAction = this.mixer.clipAction(idleClip)
    idleAction.setLoop(THREE.LoopRepeat, 0)
    this.actions.set('idle', idleAction)

    // Walk animation - bobbing motion
    const walkClip = this.createBobAnimation('walk', 1.5)
    const walkAction = this.mixer.clipAction(walkClip)
    walkAction.setLoop(THREE.LoopRepeat, 0)
    this.actions.set('walk', walkAction)

    // Run animation - faster bobbing
    const runClip = this.createBobAnimation('run', 2.0)
    const runAction = this.mixer.clipAction(runClip)
    runAction.setLoop(THREE.LoopRepeat, 0)
    this.actions.set('run', runAction)

    // Attack animation - quick forward motion
    const attackClip = this.createAttackAnimation('attack', 0.5)
    const attackAction = this.mixer.clipAction(attackClip)
    attackAction.setLoop(THREE.LoopOnce, 0)
    this.actions.set('attack', attackAction)

    // Cast animation - upward motion
    const castClip = this.createCastAnimation('cast', 0.6)
    const castAction = this.mixer.clipAction(castClip)
    castAction.setLoop(THREE.LoopOnce, 0)
    this.actions.set('cast', castAction)

    // Hit animation - shake
    const hitClip = this.createHitAnimation('hit', 0.3)
    const hitAction = this.mixer.clipAction(hitClip)
    hitAction.setLoop(THREE.LoopOnce, 0)
    this.actions.set('hit', hitAction)

    // Death animation - fall
    const deathClip = this.createDeathAnimation('death', 1.0)
    const deathAction = this.mixer.clipAction(deathClip)
    deathAction.setLoop(THREE.LoopOnce, 0)
    this.actions.set('death', deathAction)
  }

  /**
   * Create floating animation
   */
  private createFloatAnimation(name: string, duration: number): THREE.AnimationClip {
    const times = [0, duration / 2, duration]
    const values = [0, 0.1, 0]
    
    const positionTrack = new THREE.VectorKeyframeTrack(
      '.position[y]',
      times,
      values
    )

    return new THREE.AnimationClip(name, duration, [positionTrack])
  }

  /**
   * Create bobbing animation
   */
  private createBobAnimation(name: string, duration: number): THREE.AnimationClip {
    const times = [0, duration / 4, duration / 2, duration * 3 / 4, duration]
    const yValues = [0, 0.05, 0, -0.05, 0]
    const zValues = [0, 0.1, 0, -0.1, 0]
    
    const yTrack = new THREE.VectorKeyframeTrack(
      '.position[y]',
      times,
      yValues
    )
    
    const zTrack = new THREE.VectorKeyframeTrack(
      '.position[z]',
      times,
      zValues
    )

    return new THREE.AnimationClip(name, duration, [yTrack, zTrack])
  }

  /**
   * Create attack animation
   */
  private createAttackAnimation(name: string, duration: number): THREE.AnimationClip {
    const times = [0, duration / 3, duration * 2 / 3, duration]
    const zValues = [0, 0.3, 0.1, 0]
    
    const zTrack = new THREE.VectorKeyframeTrack(
      '.position[z]',
      times,
      zValues
    )

    return new THREE.AnimationClip(name, duration, [zTrack])
  }

  /**
   * Create cast animation
   */
  private createCastAnimation(name: string, duration: number): THREE.AnimationClip {
    const times = [0, duration / 2, duration]
    const yValues = [0, 0.2, 0]
    
    const yTrack = new THREE.VectorKeyframeTrack(
      '.position[y]',
      times,
      yValues
    )

    return new THREE.AnimationClip(name, duration, [yTrack])
  }

  /**
   * Create hit animation
   */
  private createHitAnimation(name: string, duration: number): THREE.AnimationClip {
    const times = [0, duration / 4, duration / 2, duration * 3 / 4, duration]
    const xValues = [0, -0.1, 0.1, -0.05, 0]
    
    const xTrack = new THREE.VectorKeyframeTrack(
      '.position[x]',
      times,
      xValues
    )

    return new THREE.AnimationClip(name, duration, [xTrack])
  }

  /**
   * Create death animation
   */
  private createDeathAnimation(name: string, duration: number): THREE.AnimationClip {
    const times = [0, duration]
    const yValues = [0, -1]
    const rotationValues = [0, Math.PI / 2]
    
    const yTrack = new THREE.VectorKeyframeTrack(
      '.position[y]',
      times,
      yValues
    )
    
    const rotationTrack = new THREE.VectorKeyframeTrack(
      '.rotation[x]',
      times,
      rotationValues
    )

    return new THREE.AnimationClip(name, duration, [yTrack, rotationTrack])
  }

  /**
   * Play animation state
   */
  play(state: AnimationState, blendTime: number = 0.2): void {
    if (this.currentState === state && this.currentAction?.isRunning()) {
      return
    }

    const action = this.actions.get(state)
    if (!action) return

    // Blend from current action
    if (this.currentAction) {
      this.currentAction.crossFadeTo(action, blendTime, false)
    } else {
      action.play()
    }

    this.currentAction = action
    this.currentState = state
  }

  /**
   * Update animation mixer
   */
  update(delta: number): void {
    this.mixer.update(delta)
  }

  /**
   * Stop all animations
   */
  stop(): void {
    this.actions.forEach(action => action.stop())
    this.currentAction = null
  }

  /**
   * Get current animation state
   */
  getCurrentState(): AnimationState {
    return this.currentState
  }
}

/**
 * Create animation controller for an object
 */
export function createAnimationController(object: THREE.Object3D): AnimationController {
  return new AnimationController(object)
}

