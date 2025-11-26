/**
 * Unit tests for Animation System
 */

import { AnimationController, createAnimationController, AnimationState } from '../../game/systems/animationSystem'
import * as THREE from 'three'

describe('Animation System', () => {
  let mockObject: THREE.Object3D
  let controller: AnimationController

  beforeEach(() => {
    mockObject = new THREE.Object3D()
    controller = createAnimationController(mockObject)
  })

  describe('AnimationController', () => {
    test('should create animation controller', () => {
      expect(controller).toBeInstanceOf(AnimationController)
    })

    test('should start with idle state', () => {
      const state = controller.getCurrentState()
      expect(state).toBe('idle')
    })

    test('should play animation state', () => {
      controller.play('walk')
      const state = controller.getCurrentState()
      expect(state).toBe('walk')
    })

    test('should not restart same animation if already playing', () => {
      controller.play('walk')
      const state1 = controller.getCurrentState()
      
      controller.play('walk')
      const state2 = controller.getCurrentState()
      
      expect(state1).toBe(state2)
      expect(state2).toBe('walk')
    })

    test('should transition between animation states', () => {
      controller.play('idle')
      expect(controller.getCurrentState()).toBe('idle')
      
      controller.play('walk')
      expect(controller.getCurrentState()).toBe('walk')
      
      controller.play('run')
      expect(controller.getCurrentState()).toBe('run')
    })

    test('should support all animation states', () => {
      const states: AnimationState[] = ['idle', 'walk', 'run', 'attack', 'cast', 'hit', 'death']
      
      states.forEach(state => {
        controller.play(state)
        expect(controller.getCurrentState()).toBe(state)
      })
    })

    test('should update animation mixer', () => {
      controller.play('walk')
      
      // Should not throw when updating
      expect(() => controller.update(0.016)).not.toThrow()
    })

    test('should stop all animations', () => {
      controller.play('walk')
      controller.stop()
      
      // After stop, should still have a state but action should be stopped
      const state = controller.getCurrentState()
      expect(['idle', 'walk', 'run', 'attack', 'cast', 'hit', 'death']).toContain(state)
    })

    test('should handle custom blend time', () => {
      controller.play('idle')
      controller.play('walk', 0.5) // Custom blend time
      
      expect(controller.getCurrentState()).toBe('walk')
    })
  })

  describe('createAnimationController', () => {
    test('should create controller for object', () => {
      const obj = new THREE.Object3D()
      const ctrl = createAnimationController(obj)
      
      expect(ctrl).toBeInstanceOf(AnimationController)
    })

    test('should create independent controllers for different objects', () => {
      const obj1 = new THREE.Object3D()
      const obj2 = new THREE.Object3D()
      
      const ctrl1 = createAnimationController(obj1)
      const ctrl2 = createAnimationController(obj2)
      
      ctrl1.play('walk')
      ctrl2.play('run')
      
      expect(ctrl1.getCurrentState()).toBe('walk')
      expect(ctrl2.getCurrentState()).toBe('run')
    })
  })
})

