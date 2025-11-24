import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

// First, run tsc to handle decorators and type checking
console.log('📦 Running TypeScript compiler (for decorators)...');
try {
  execSync('tsc', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ TypeScript compilation complete');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Then bundle with esbuild for optimization
const buildOptions = {
  entryPoints: ['dist/src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  outdir: undefined, // Single file output
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  minify: isProduction,
  treeShaking: true,
  external: [
    // Node.js built-ins
    'fs',
    'path',
    'http',
    'https',
    'url',
    'util',
    'stream',
    'crypto',
    'events',
    'buffer',
    'os',
    'net',
    'tls',
    'zlib',
    'querystring',
    // Keep these as external dependencies
    '@colyseus/core',
    '@colyseus/monitor',
    '@colyseus/redis-driver',
    '@colyseus/redis-presence',
    '@colyseus/schema',
    '@colyseus/ws-transport',
    'express',
    'cors',
    'firebase-admin',
    'redis',
    'nanoid'
  ],
  logLevel: 'info',
};

async function build() {
  try {
    console.log('⚡ Bundling with esbuild...');
    await esbuild.build(buildOptions);
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();

