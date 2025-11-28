import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

// Helper function to recursively list directory contents
function listDirRecursive(dir, prefix = '') {
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        console.log(`${prefix}${item}/`);
        listDirRecursive(fullPath, prefix + '  ');
      } else {
        console.log(`${prefix}${item}`);
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

// First, run tsc to handle decorators and type checking
console.log('📦 Running TypeScript compiler (for decorators)...');
try {
  execSync('tsc', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ TypeScript compilation complete');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Check what was actually created in dist
const distDir = resolve(__dirname, 'dist');
console.log(`\n📁 Contents of ${distDir}:`);
if (existsSync(distDir)) {
  listDirRecursive(distDir);
} else {
  console.log('  (dist directory does not exist)');
}

// Try multiple possible locations for the entry point
const possibleEntryPoints = [
  resolve(__dirname, 'dist/index.js'), // With rootDir: "./src", output goes directly to dist/
  resolve(__dirname, 'dist/src/index.js'), // Fallback: if rootDir wasn't set
  resolve(__dirname, 'dist/server/src/index.js'), // With rootDir: "..", output goes to dist/server/src/
  resolve(__dirname, 'src/index.js'), // Fallback to source if needed
];

let entryPoint = null;
for (const path of possibleEntryPoints) {
  if (existsSync(path)) {
    entryPoint = path;
    console.log(`\n✅ Found entry point at: ${entryPoint}`);
    break;
  }
}

if (!entryPoint) {
  console.error(`\n❌ Entry point not found in any expected location:`);
  possibleEntryPoints.forEach(path => {
    console.error(`  - ${path} ${existsSync(path) ? '✓' : '✗'}`);
  });
  console.error(`\nCurrent working directory: ${process.cwd()}`);
  console.error(`Config directory: ${__dirname}`);
  process.exit(1);
}

// Use the found entry point for esbuild
const buildOptions = {
  entryPoints: [entryPoint],
  bundle: true,
  outfile: join(__dirname, 'dist/index.js'),
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

