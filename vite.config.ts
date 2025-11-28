import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'

// Bundle size budgets (in bytes) - Stricter limits for faster loading
const BUNDLE_SIZE_BUDGETS = {
  'index': 400 * 1024, // 400KB main bundle (reduced from 500KB)
  'react-vendor': 250 * 1024, // 250KB React vendor (reduced from 300KB)
  'three-vendor': 250 * 1024, // 250KB Three.js vendor (reduced from 300KB)
  'network-vendor': 150 * 1024, // 150KB Network vendor (reduced from 200KB)
}

// Custom plugin to check bundle sizes
function bundleSizeChecker() {
  return {
    name: 'bundle-size-checker',
    generateBundle(_options: any, bundle: Record<string, any>) {
      const warnings: string[] = []
      const errors: string[] = []

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk && typeof chunk === 'object' && 'type' in chunk && chunk.type === 'chunk') {
          const chunkData = chunk as { type: string; code: string; name?: string }
          const size = chunkData.code.length
          const chunkName = chunkData.name
          const budget = chunkName ? BUNDLE_SIZE_BUDGETS[chunkName as keyof typeof BUNDLE_SIZE_BUDGETS] : undefined
          
          if (budget && chunkName) {
            if (size > budget) {
              errors.push(
                `❌ Bundle size exceeded: ${chunkName} is ${(size / 1024).toFixed(2)}KB (budget: ${(budget / 1024).toFixed(2)}KB)`
              )
            } else if (size > budget * 0.8) {
              warnings.push(
                `⚠️ Bundle size warning: ${chunkName} is ${(size / 1024).toFixed(2)}KB (budget: ${(budget / 1024).toFixed(2)}KB) - 80% threshold`
              )
            }
          }
        }
      }

      if (warnings.length > 0) {
        console.warn('\n📦 Bundle Size Warnings:')
        warnings.forEach(w => console.warn(w))
      }

      if (errors.length > 0) {
        console.error('\n📦 Bundle Size Errors:')
        errors.forEach(e => console.error(e))
        if (process.env.CI === 'true') {
          throw new Error('Bundle size budgets exceeded!')
        }
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,json}'],
        // Precaching for critical assets
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            // Immutable assets (models, textures) - CacheFirst with long expiration
            urlPattern: /\.(?:glb|drc\.glb|ktx2|basis)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'immutable-assets-v1',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year for immutable assets
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Images and textures - CacheFirst
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-assets-v1',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days
              }
            }
          },
          {
            // Asset manifest - CacheFirst with versioning
            urlPattern: /ASSET_MANIFEST\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'asset-manifest-v1',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            // External API (Pixellab) - CacheFirst
            urlPattern: /^https:\/\/api\.pixellab\.ai\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pixellab-assets-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            // Audio assets - CacheFirst
            urlPattern: /\.(?:mp3|wav|ogg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-assets-v1',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Dynamic content - NetworkFirst with short cache
            urlPattern: /^https:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-v1',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 3
            }
          }
        ]
      },
      includeAssets: ['icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'MARS://NEXUS',
        short_name: 'MARS://NEXUS',
        description: 'Multiplayer cyberpunk MMORPG',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    }),
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    }),
    bundleSizeChecker()
  ].filter(Boolean),
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    // Asset inlining threshold: inline small assets (<10KB) to reduce HTTP requests
    assetsInlineLimit: 10240, // 10KB
    // Vite uses content-based hashing for chunk filenames by default
    // This ensures consistent file names across builds when content doesn't change
    // and prevents cache issues when content does change
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React vendor chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          // Three.js vendor chunk
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three-vendor'
          }
          // Network vendor chunk
          if (id.includes('node_modules/colyseus')) {
            return 'network-vendor'
          }
          // Split game systems into separate chunks for better code splitting
          if (id.includes('src/game/systems/combat')) {
            return 'system-combat'
          }
          if (id.includes('src/game/systems/spell')) {
            return 'system-spell'
          }
          if (id.includes('src/game/systems/crafting')) {
            return 'system-crafting'
          }
          if (id.includes('src/game/systems/')) {
            return 'system-other'
          }
          // Split Three.js extensions/helpers into separate chunk
          if (id.includes('src/game/utils') && (id.includes('shader') || id.includes('geometry') || id.includes('material'))) {
            return 'three-extensions'
          }
          // Large utilities go to separate chunk
          if (id.includes('src/game/utils') && (id.includes('assetManager') || id.includes('progressiveLoader') || id.includes('loading'))) {
            return 'utils-loading'
          }
        }
      }
    }
  }
}))
