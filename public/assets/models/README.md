# 3D Models Directory

Converted 3D models from PixelLab 2D sprites using Blender.

## Conversion Methods

### Extrude Method
- Single cube with sprite texture
- Smaller file size (~4-5 KB)
- Lower polygon count
- Best for performance

### Voxel Method  
- Multiple stacked layers (8 planes)
- Larger file size (~9-10 KB)
- More depth appearance
- Best for visual quality

## Directory Structure

```
models/
├── monsters/     # Monster 3D models
├── npcs/        # NPC 3D models
└── tiles/       # Isometric tile 3D models
```

## Usage in Game

```typescript
import { assetManager } from './assets/assetManager'

// Load converted 3D model
const model = await assetManager.loadModel(
  'monster-bumblebee',
  '/assets/models/monsters/bumblebee-id.glb'
)
```

## Comparison Files

See `tiles/` directory for comparison:
- `*-extrude.glb` - Extrude method
- `*-voxel.glb` - Voxel method

