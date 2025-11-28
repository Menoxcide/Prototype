/**
 * Custom Shaders for Neon Bloom Effects
 * Enhanced with LOD-aware variants and texture array support for optimal performance
 */

/**
 * Texture array support for atlas optimization
 * Uses texture arrays to reduce texture switches (WebGL 2 feature)
 */
export function createTextureArrayShader(_layerCount: number = 4) {
  return {
    vertexShader: `
      attribute float textureLayer;
      varying float vTextureLayer;
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        vTextureLayer = textureLayer;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2DArray textureArray;
      varying float vTextureLayer;
      varying vec2 vUv;
      
      void main() {
        vec3 uv3d = vec3(vUv, vTextureLayer);
        gl_FragColor = texture(textureArray, uv3d);
      }
    `
  }
}

/**
 * LOD-aware shader variants - simpler shaders for distant objects
 * Reduces GPU workload for objects that don't need full detail
 */
export const getLODShader = (lodLevel: 'high' | 'medium' | 'low') => {
  if (lodLevel === 'low') {
    // Minimal shader for distant objects
    return {
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        void main() {
          gl_FragColor = vec4(color, 1.0);
        }
      `
    }
  } else if (lodLevel === 'medium') {
    // Medium detail shader
    return {
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(color, 1.0);
        }
      `
    }
  }
  // High detail shader (full neon bloom)
  return neonBloomShader
}

export const neonBloomShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 neonColor;
    uniform float intensity;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
      // Base neon color
      vec3 color = neonColor;
      
      // Add pulsing effect
      float pulse = sin(time * 2.0) * 0.3 + 0.7;
      
      // Edge glow effect (fresnel-like)
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);
      
      // Combine effects
      vec3 finalColor = color * intensity * pulse * (1.0 + fresnel * 2.0);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
}

export const neonTrailShader = {
  vertexShader: `
    attribute float alpha;
    attribute float size;
    varying float vAlpha;
    varying vec3 vColor;
    
    void main() {
      vAlpha = alpha;
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D pointTexture;
    varying float vAlpha;
    varying vec3 vColor;
    
    void main() {
      vec4 textureColor = texture2D(pointTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor, textureColor.a * vAlpha);
    }
  `
}

