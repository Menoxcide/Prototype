# 2D to 3D Asset Conversion Guide

This document outlines methods to convert PixelLab 2D/2.5D isometric assets into 3D models for MARS://NEXUS.

## Current Implementation

### Sprite Extrusion (Implemented)
- **Location**: `src/game/assets/spriteTo3DConverter.ts`
- **Method**: Programmatically extrudes 2D sprites along Z-axis
- **Pros**: Fast, automatic, works with existing assets
- **Cons**: Limited depth detail, may need refinement

**Usage:**
```typescript
import { spriteTo3DConverter } from './assets/spriteTo3DConverter'

// Convert monster sprite to 3D
const model = await spriteTo3DConverter.convertMonsterTo3D('bumblebee')

// Convert with custom options
const model = await spriteTo3DConverter.convertSpriteTo3D(
  'monster-id',
  texture,
  {
    method: 'extrude', // or 'stack', 'texture'
    depth: 0.5,
    scale: 1.0
  }
)
```

## Alternative Methods

### 1. AI-Powered Conversion Tools

#### Microsoft Copilot 3D (Recommended)
- **API**: Can generate GLB models from 2D images
- **Format**: GLB (compatible with Three.js)
- **Cost**: Free tier available
- **Quality**: Good for simple objects
- **Integration**: Would need API wrapper

#### Adobe Firefly 3D
- **API**: Available via Adobe Creative SDK
- **Format**: GLB/USD
- **Cost**: Subscription required
- **Quality**: High quality, professional

#### DimenXioner AI
- **Web Service**: Online conversion
- **Format**: Various 3D formats
- **Cost**: Pay-per-use
- **Quality**: Good for architectural/geometric objects

### 2. Blender Automation

#### Option A: Blender Python Scripting
Create a Python script that:
1. Loads sprite images
2. Creates 3D geometry from sprites
3. Exports as GLB

**Script Template:**
```python
import bpy
import bmesh
from PIL import Image
import numpy as np

def sprite_to_3d(sprite_path, output_path):
    # Load sprite
    img = Image.open(sprite_path)
    img_data = np.array(img)
    
    # Create mesh from sprite
    bm = bmesh.new()
    # ... extrusion logic ...
    
    # Export as GLB
    bpy.ops.export_scene.gltf(filepath=output_path)
```

#### Option B: Blender MCP Server
If available, we could:
- Set up Blender MCP server
- Automate model creation via MCP
- Batch process all sprites

**Setup Required:**
- Blender installation
- MCP server configuration
- Python environment

### 3. Sprite Stacking (Voxel-like)

**Implementation**: Already in `spriteTo3DConverter.ts`
- Stacks multiple sprite layers
- Creates voxel-like 3D effect
- Good for pixel art aesthetic

**Usage:**
```typescript
const model = await spriteTo3DConverter.convertSpriteTo3D(
  spriteId,
  texture,
  { method: 'stack', layers: 8 }
)
```

### 4. Procedural 3D with Sprite Textures

**Implementation**: Already in `spriteTo3DConverter.ts`
- Maps sprite as texture to 3D geometry
- Uses standard shapes (box, cylinder, capsule)
- Fast and efficient

**Usage:**
```typescript
const model = await spriteTo3DConverter.convertSpriteTo3D(
  spriteId,
  texture,
  {
    method: 'texture',
    geometry: 'box', // or 'cylinder', 'capsule'
    scale: 1.0
  }
)
```

## Recommended Workflow

### For Monsters & NPCs (30+ assets)
1. **Primary**: Use sprite extrusion (already implemented)
2. **Enhancement**: Use AI tools for important/boss monsters
3. **Fallback**: Procedural 3D with sprite textures

### For Environmental Objects
1. **Primary**: Sprite stacking for voxel aesthetic
2. **Alternative**: Texture mapping to appropriate geometry
3. **Special Cases**: Manual Blender modeling for complex objects

### For Isometric Tiles
1. **Primary**: Extrusion with appropriate depth (thin/thick/block)
2. **Enhancement**: AI conversion for key objects
3. **Fallback**: Keep as 2D billboards (current approach)

## Integration with Game

The game already supports 3D models via:
- `modelLoader.ts` - GLTF/GLB loading
- `assetManager.ts` - Model management
- Three.js integration

**To use 3D converted models:**
```typescript
// In component (e.g., Enemy.tsx)
const model = await spriteTo3DConverter.convertMonsterTo3D(enemy.type)
// Or load pre-converted GLB
const model = await assetManager.loadModel(
  `monster-${enemy.type}`,
  `/assets/models/monsters/${enemy.type}.glb`
)
```

## Next Steps

1. **Test sprite extrusion** with existing monster sprites
2. **Evaluate AI tools** for quality/cost
3. **Set up Blender automation** if needed
4. **Batch convert** assets once method is chosen
5. **Optimize** models for mobile performance

## Performance Considerations

- **Mobile**: Keep polygon count low (<500 triangles per model)
- **LOD**: Create multiple detail levels
- **Instancing**: Use instanced rendering for repeated models
- **Caching**: Cache converted models to avoid re-processing

## Tools to Explore

1. **Blender MCP Server** - If available, would be ideal
2. **Microsoft Copilot 3D API** - Good for batch processing
3. **MagicaVoxel** - Voxel editor (exports to OBJ/PLY)
4. **SpriteStack** - Specialized sprite-to-3D tool
5. **Three.js ExtrudeGeometry** - More advanced extrusion

## Questions to Answer

1. Do you have Blender installed? (for automation)
2. Preferred quality vs. speed tradeoff?
3. Budget for AI conversion services?
4. Target polygon count per model?
5. Should we convert all assets or prioritize?

