# Quick Start: 2D to 3D Conversion

Since Blender is open and available, here's the fastest way to convert your PixelLab sprites to 3D:

## Method 1: Direct Blender Script (Easiest)

1. **In Blender, go to Scripting workspace** (top tabs)

2. **Open the script**: `scripts/blender-quick-convert.py`
   - File > Open
   - Navigate to `X:\Prototype\scripts\blender-quick-convert.py`

3. **Modify the paths** at the top of the script:
   ```python
   SPRITE_PATH = r"X:\Prototype\public\assets\isometric-tiles\b652a0a7-369b-41f0-88d4-696d1c96150c.png"
   OUTPUT_PATH = r"X:\Prototype\public\assets\models\test-output.glb"
   DEPTH = 0.5
   METHOD = 'extrude'
   ```

4. **Run the script**: Press `Alt+P` or click the "Run Script" button

5. **Check output**: The GLB file will be in `public/assets/models/`

## Method 2: Blender Add-on (For Multiple Files)

1. **Install the add-on**:
   - Edit > Preferences > Add-ons
   - Install from file
   - Select `scripts/blender-addon-sprite-converter.py`

2. **Use the operator**:
   - In 3D Viewport, press `Space` or `F3`
   - Type "Convert Sprite to 3D"
   - Select your sprite file
   - Adjust depth and method
   - Click "Convert Sprite to 3D"

## Method 3: Batch Conversion (Once Blender Path is Set)

1. **Find your Blender path**:
   ```bash
   node scripts/find-blender-path.js
   ```

2. **Set environment variable** (PowerShell):
   ```powershell
   $env:BLENDER_PATH="C:\Path\To\Blender\blender.exe"
   ```

3. **Run batch conversion**:
   ```bash
   node scripts/convert-sprites-to-3d.js --type monsters
   ```

## What's Been Created

✅ **Sprite to 3D Converter** (`src/game/assets/spriteTo3DConverter.ts`)
   - Programmatic conversion in Three.js
   - Three methods: extrude, stack, texture

✅ **Blender Python Scripts**:
   - `blender-sprite-to-3d.py` - Command-line script
   - `blender-quick-convert.py` - Quick test script
   - `blender-addon-sprite-converter.py` - Blender add-on

✅ **Batch Conversion Script** (`scripts/convert-sprites-to-3d.js`)
   - Converts all sprites automatically
   - Supports monsters, NPCs, and tiles

✅ **Model Loader Integration** (`src/game/assets/modelLoader.ts`)
   - Updated to support converted GLB models
   - Auto-detects model paths

## Next Steps

1. **Test with one sprite** using Method 1 above
2. **Verify the GLB loads** in your game
3. **Batch convert** once you're happy with the results
4. **Integrate** into game components (Enemy.tsx, NPC.tsx, etc.)

## Tips

- **Depth**: 0.1-0.3 for thin objects, 0.5-1.0 for thick objects
- **Method**: 'extrude' for most cases, 'voxel' for pixel art
- **Performance**: Lower depth = fewer polygons = better mobile performance

## Need Help?

- Check `docs/BLENDER_3D_CONVERSION.md` for detailed guide
- Check `docs/2D_TO_3D_CONVERSION.md` for all conversion methods
- The scripts have comments explaining each step

