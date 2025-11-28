/**
 * Asset Test Page
 * Comprehensive test page for all converted biome assets
 */

import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import BiomeAssetTest from '../components/test/BiomeAssetTest'

export default function AssetTestPage() {
  const [selectedBiome, setSelectedBiome] = useState<'sci-fi' | 'cyberpunk' | 'alien' | 'nature' | 'desert' | 'void'>('sci-fi')
  const [showInfo, setShowInfo] = useState(true)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* UI Controls */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '20px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        maxWidth: '300px'
      }}>
        <h2 style={{ margin: '0 0 15px 0' }}>Asset Test Scene</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Biome:</label>
          <select
            value={selectedBiome}
            onChange={(e) => setSelectedBiome(e.target.value as any)}
            style={{
              width: '100%',
              padding: '5px',
              background: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px'
            }}
          >
            <option value="sci-fi">Sci-Fi</option>
            <option value="cyberpunk">Cyberpunk</option>
            <option value="alien">Alien</option>
            <option value="nature">Nature</option>
            <option value="desert">Desert</option>
            <option value="void">Void</option>
          </select>
        </div>

        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            width: '100%',
            padding: '8px',
            background: showInfo ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {showInfo ? 'Hide Info' : 'Show Info'}
        </button>

        {showInfo && (
          <div style={{ marginTop: '15px', fontSize: '12px', lineHeight: '1.6' }}>
            <p><strong>Controls:</strong></p>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Left Click + Drag: Rotate</li>
              <li>Right Click + Drag: Pan</li>
              <li>Scroll: Zoom</li>
            </ul>
            <p style={{ marginTop: '10px' }}>
              <strong>Status:</strong> Loading assets from registry...
            </p>
          </div>
        )}
      </div>

      {/* 3D Canvas */}
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 5, 10], fov: 50 }}
        style={{ background: '#1a1a2e' }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight position={[-10, 10, -5]} intensity={0.5} />

          {/* Environment */}
          <Environment preset="city" />

          {/* Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={20}
          />

          {/* Grid Helper */}
          <gridHelper args={[20, 20, '#444', '#222']} />

          {/* Axes Helper */}
          <axesHelper args={[5]} />

          {/* Asset Test Component */}
          <BiomeAssetTest biome={selectedBiome} />
        </Suspense>
      </Canvas>
    </div>
  )
}

