# Blender 3D Conversion Setup

Complete guide for converting PixelLab 2D sprites to 3D models using Blender.

## Prerequisites

1. **Blender** installed (3.5+ recommended)
   - Download from: https://www.blender.org/
   - Add to PATH or note installation location

2. **Python packages** (Blender includes its own Python):
   - PIL (Pillow) - Usually included with Blender
   - numpy - Usually included with Blender

## Quick Start

### 1. Test Blender Setup
```bash
node scripts/test-blender-conversion.js
```

This will:
- Check if Blender is installed
- Verify the conversion script exists
- Test Blender execution

### 2. Convert Assets

**Convert all monsters:**
```bash
node scripts/convert-sprites-to-3d.js --type monsters
```

**Convert all NPCs:**
```bash
node scripts/convert-sprites-to-3d.js --type npcs
```

**Convert all tiles:**
```bash
node scripts/convert-sprites-to-3d.js --type tiles
```

**Convert everything:**
```bash
node scripts/convert-sprites-to-3d.js --all
```

### 3. Options

- `--method <extrude|voxel>` - Conversion method (default: extrude)
- `--depth <number>` - Extrusion depth 0.1-1.0 (default: 0.5)
- `--type <monsters|npcs|tiles>` - Asset type to convert

**Examples:**
```bash
# Convert with voxel method
node scripts/convert-sprites-to-3d.js --type monsters --method voxel

# Convert with custom depth
node scripts/convert-sprites-to-3d.js --type tiles --depth 0.3
```

## How It Works

### Conversion Process

1. **Load Sprite**: Reads PNG sprite image
2. **Extract Shape**: Analyzes alpha channel for shape
3. **Create 3D Geometry**: 
   - **Extrude method**: Creates box with sprite as texture
   - **Voxel method**: Creates mesh from sprite outline
4. **Apply Texture**: Maps sprite to 3D model
5. **Export GLB**: Saves as GLB format (compatible with Three.js)

### Output Structure

```
public/assets/models/
├── monsters/          # Converted monster models
│   ├── <id>.glb
│   └── ...
├── npcs/              # Converted NPC models
│   ├── <id>.glb
│   └── ...
└── tiles/              # Converted tile models
    ├── <id>.glb
    └── ...
```

## Integration

### Loading Converted Models

The game's `modelLoader` automatically supports converted models:

```typescript
// Load converted monster model
const model = await assetManager.loadModel(
  'monster-bumblebee',
  '/assets/models/monsters/bumblebee-id.glb'
)

// Or use asset ID (auto-detects path)
const model = await assetManager.loadModel(
  'monster-bumblebee',
  'monsters/bumblebee-id'
)
```

### Using in Components

```typescript
// In Enemy.tsx or similar
useEffect(() => {
  const loadModel = async () => {
    const model = await assetManager.loadModel(
      `monster-${enemy.type}`,
      `/assets/models/monsters/${enemy.spriteId}.glb`
    )
    // Add model to scene
  }
  loadModel()
}, [enemy.type])
```

## Conversion Methods

### Extrude Method (Default)
- **Best for**: Most sprites, simple objects
- **Quality**: Good
- **Speed**: Fast
- **Result**: Box with sprite texture on front/back

### Voxel Method
- **Best for**: Pixel art, detailed sprites
- **Quality**: High
- **Speed**: Slower
- **Result**: Mesh created from sprite outline

## Troubleshooting

### Blender Not Found
1. Install Blender from https://www.blender.org/
2. Add to PATH, or update script with full path
3. Check: `blender --version`

### Python Errors
- Blender uses its own Python
- PIL and numpy should be included
- If missing, install via Blender's Python:
  ```bash
  blender --background --python -m pip install Pillow numpy
  ```

### Conversion Fails
1. Check sprite file exists and is valid PNG
2. Verify output directory is writable
3. Check Blender console for errors
4. Try different method: `--method extrude`

### Model Quality Issues
- Adjust depth: `--depth 0.3` (thinner) or `--depth 0.8` (thicker)
- Try voxel method for better shape: `--method voxel`
- Manually refine in Blender if needed

## Manual Blender Workflow

If you want to manually convert sprites:

1. Open Blender
2. File > Scripting
3. Open `scripts/blender-sprite-to-3d.py`
4. Modify `main()` function with your paths
5. Run script (Alt+P)

Or use command line:
```bash
blender --background --python scripts/blender-sprite-to-3d.py -- sprite.png output.glb 0.5 extrude
```

## Performance Tips

1. **Batch Process**: Convert all assets at once
2. **Skip Existing**: Script skips already converted files
3. **Mobile Optimization**: 
   - Use lower depth for mobile
   - Consider LOD versions
   - Export with compression

## Next Steps

1. ✅ Test Blender setup
2. ✅ Download sprite assets (from PixelLab)
3. ✅ Run conversion script
4. ✅ Integrate models into game
5. ✅ Test performance on mobile devices

## Advanced: Custom Blender Scripts

You can create custom conversion scripts for specific asset types:

```python
# Custom script for specific monster type
def create_boss_monster(sprite_path, output_path):
    # Custom 3D modeling logic
    # More complex geometry
    # Special effects
    pass
```

See `scripts/blender-sprite-to-3d.py` for reference implementation.

