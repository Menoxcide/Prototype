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
        
        // Improved star field with multiple layers
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        void main() {
          vec3 dir = normalize(vWorldPosition);
          
          // Cyberpunk sky - dark blue/purple to black gradient
          vec3 color = mix(
            vec3(0.05, 0.05, 0.15),  // Dark blue-purple
            vec3(0.0, 0.0, 0.02),     // Near black
            smoothstep(-0.3, 0.7, dir.y)
          );
          
          // Enhanced star field - multiple layers for depth
          vec2 starCoord1 = dir.xy * 200.0;
          vec2 starCoord2 = dir.xy * 150.0;
          vec2 starCoord3 = dir.xy * 100.0;
          
          // Bright stars (distant)
          float star1 = random(floor(starCoord1));
          if (star1 > 0.995) {
            float twinkle = sin(time * 1.5 + star1 * 20.0) * 0.3 + 0.7;
            float brightness = pow(star1, 0.3);
            color += vec3(1.0, 1.0, 0.9) * brightness * twinkle * 1.2;
          }
          
          // Medium stars
          float star2 = random(floor(starCoord2));
          if (star2 > 0.99) {
            float twinkle = sin(time * 2.0 + star2 * 15.0) * 0.4 + 0.6;
            color += vec3(0.9, 0.9, 1.0) * star2 * twinkle * 0.8;
          }
          
          // Small stars (close)
          float star3 = random(floor(starCoord3));
          if (star3 > 0.985) {
            float twinkle = sin(time * 2.5 + star3 * 12.0) * 0.5 + 0.5;
            color += vec3(1.0, 1.0, 1.0) * star3 * twinkle * 0.5;
          }
          
          // Add nebula/cloud effects using noise
          vec2 cloudCoord = dir.xy * 10.0 + time * 0.1;
          float clouds = noise(cloudCoord) * 0.3;
          clouds = smoothstep(0.3, 0.7, clouds);
          color += vec3(0.2, 0.15, 0.3) * clouds * 0.4; // Purple nebula
          
          // Add some cyberpunk neon glow in the distance
          float glow = sin(dir.x * 3.0 + time) * sin(dir.z * 3.0 + time * 0.8) * 0.2;
          color += vec3(0.1, 0.2, 0.4) * max(0.0, glow);
          
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

