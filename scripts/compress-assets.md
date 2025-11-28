# Asset Compression Guide

This document describes how to compress assets for optimal performance.

## Texture Compression (KTX2/Basis Universal)

### Prerequisites
- Install `basisu` tool from [Basis Universal GitHub](https://github.com/BinomialLLC/basis_universal)
- Or use online tools like [KTX2 Compressor](https://github.com/KhronosGroup/KTX-Software)

### Compression Process
1. Convert textures to KTX2 format:
```bash
basisu -ktx2 input.png output.ktx2
```

2. Place compressed textures in `public/assets/textures/compressed/`

3. The asset loader will automatically use compressed versions if supported

## Model Compression (Draco)

### Prerequisites
- Install `gltf-pipeline`:
```bash
npm install -g gltf-pipeline
```

### Compression Process
1. Compress GLB models:
```bash
gltf-pipeline -i input.glb -o output.drc.glb -d
```

2. Place compressed models alongside original files

3. The model loader will automatically use compressed versions if supported

## Build-Time Compression

Add to your build process:
```bash
# Compress textures
find public/assets/textures -name "*.png" -exec basisu -ktx2 {} {}.ktx2 \;

# Compress models
find public/assets/models -name "*.glb" -exec gltf-pipeline -i {} -o {}.drc.glb -d \;
```

## Compression Ratios

Expected compression ratios:
- KTX2 textures: 40-60% size reduction
- Draco models: 50-70% size reduction
- WebP images: 25-35% size reduction

