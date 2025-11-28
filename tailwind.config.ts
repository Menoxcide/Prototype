import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,tsx}",
  ],
  // Safelist to prevent errors from deleted files
  safelist: [],
  theme: {
    extend: {
      colors: {
        cyberpunk: {
          pink: '#ff00ff',
          cyan: '#00ffff',
          purple: '#9d00ff',
          blue: '#0099ff',
          dark: '#0a0a0a',
          darker: '#050505',
        },
        neon: {
          pink: '#ff00ff',
          cyan: '#00ffff',
          purple: '#9d00ff',
          blue: '#0099ff',
          green: '#00ff00',
        }
      },
      fontFamily: {
        cyber: ['Orbitron', 'monospace'],
      },
      animation: {
        'pulse-neon': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { textShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
        }
      }
    },
  },
  plugins: [],
}

export default config
