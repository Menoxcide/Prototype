/**
 * Beautiful space skybox with stars and nebula
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function SpaceSkybox() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  
  const skyboxGeometry = useMemo(() => {
    return new THREE.SphereGeometry(500, 32, 32)
  }, [])

  const skyboxMaterial = useMemo(() => {
    // Create a gradient material from dark blue to black
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vWorldPosition;
        
        // Simple star field
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          vec3 dir = normalize(vWorldPosition);
          
          // Base color - dark blue to black gradient
          vec3 color = mix(
            vec3(0.05, 0.05, 0.15), // Dark blue
            vec3(0.0, 0.0, 0.0),     // Black
            smoothstep(-0.5, 0.5, dir.y)
          );
          
          // Add stars
          vec2 starCoord = dir.xy * 100.0;
          float star = random(floor(starCoord));
          if (star > 0.98) {
            float twinkle = sin(time * 2.0 + star * 10.0) * 0.5 + 0.5;
            color += vec3(1.0) * star * twinkle * 0.5;
          }
          
          // Add nebula-like effect
          float nebula = sin(dir.x * 5.0 + time) * sin(dir.z * 5.0 + time * 0.7) * 0.1;
          color += vec3(0.2, 0.1, 0.3) * max(0.0, nebula);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide
    })
    
    materialRef.current = material
    return material
  }, [])

  // Animate skybox
  useFrame((state) => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh geometry={skyboxGeometry} material={skyboxMaterial} />
  )
}

