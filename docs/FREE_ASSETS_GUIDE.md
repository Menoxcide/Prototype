# Free Assets Guide - MARS://NEXUS

This document tracks free 3D models, textures, and assets found for the game across various biomes.

## Asset Sources Explored

### ✅ Successfully Found Assets

1. **OpenGameArt.org**
   - **LowPoly Modular Sci-Fi Environments** (CC0 License)
     - Direct download: `https://opengameart.org/sites/default/files/ultimate_modular_sci-fi_-_feb_2021.zip`
     - Formats: FBX, OBJ, Blend
     - Size: 10.5 MB
     - Contains: Modular sci-fi interior assets and props
     - License: CC0 (Public Domain)

2. **Poly Haven** (polyhaven.com)
   - Free PBR textures (no login required)
   - Direct download API available
   - Categories: Sci-fi, cyberpunk, industrial, nature

3. **Sketchfab**
   - Many free downloadable models
   - Search: "free downloadable cyberpunk" or "free downloadable sci-fi"
   - Requires account for downloads (free)

4. **itch.io**
   - Hundreds of free sci-fi/cyberpunk assets
   - Search: `https://itch.io/game-assets/free/tag-science-fiction`
   - Many pixel art and 3D assets

5. **Free3D.com**
   - Free 3D models in various formats
   - Search: cyberpunk, sci-fi, alien

6. **TurboSquid**
   - Free section available
   - Search: "free cyberpunk" or "free sci-fi"

## Asset Organization

Assets are organized by biome in `public/assets/models/biomes/`:

```
public/assets/models/biomes/
├── cyberpunk/     # Cyberpunk city assets
├── sci-fi/        # General sci-fi assets
├── alien/         # Alien/void biome assets
├── nature/        # Nature/overgrown biome
├── desert/        # Desert/wasteland biome
└── void/          # Void/space biome

public/assets/models/props/  # General props and decorations

public/assets/textures/
├── cyberpunk/     # Cyberpunk textures
├── sci-fi/        # Sci-fi textures
└── materials/     # PBR materials
```

## Download Script

A download script is available at `scripts/download-free-assets.js` to automate downloads from direct links.

## Recommended Assets to Download

### Cyberpunk Assets
- [x] OpenGameArt: LowPoly Modular Sci-Fi (downloaded)
- [ ] Sketchfab: Cyberpunk City by golukumar
- [ ] Sketchfab: Sci-Fi Computer Room
- [ ] itch.io: KayKit Space Base Bits
- [ ] itch.io: Retro Cybercity tilesets

### Sci-Fi Assets
- [ ] Poly Haven: Sci-fi panel textures
- [ ] OpenGameArt: Sci-fi environment pack
- [ ] Various spaceship and station assets

### Alien/Void Biome
- [ ] Alien character models
- [ ] Void/space environment assets
- [ ] Alien flora and structures

### Nature Biome
- [ ] Overgrown cyberpunk (nature reclaiming city)
- [ ] Organic alien plants
- [ ] Nature textures from Poly Haven

### Desert/Wasteland
- [ ] Desert textures
- [ ] Wasteland structures
- [ ] Sand and rock materials

## Usage in Game

Models should be in GLB format for Three.js. The project includes automated conversion tools:

### FBX to GLB Conversion

**Batch Conversion:**
```bash
# Convert all FBX files in the sci-fi pack
node scripts/blender-fbx-to-glb-batch.js
```

**Test Conversion:**
```bash
# Test with 2-3 sample files first
node scripts/test-fbx-conversion.js
```

**Single File Conversion:**
```bash
# Using Blender directly
X:\Blender\Blender-5.1.0\blender.exe --background --python scripts/blender-fbx-to-glb.py -- input.fbx output.glb
```

### Organizing Assets

After conversion, organize assets into biome folders:
```bash
node scripts/organize-assets.js
```

### Loading Assets in Game

**Using Biome Asset Loader:**
```typescript
import { loadBiomeAsset, loadProp } from './assets/biomeAssetLoader'

// Load a floor tile
const floor = await loadBiomeAsset('sci-fi', 'floor', 'FloorTile_Basic')

// Load a prop
const computer = await loadProp('Props_Computer', 'sci-fi')
```

**Using Asset Manager:**
```typescript
import { assetManager } from './assets/assetManager'

// Load biome asset
const wall = await assetManager.loadBiomeAsset('sci-fi', 'walls', 'Wall_1')

// Load texture
const texture = await assetManager.loadBiomeTexture('sci-fi', 'sci_fi_panel_01', 'diffuse')
```

## License Notes

- **CC0**: Public domain, use freely
- **CC-BY**: Attribution required
- **CC-BY-SA**: Attribution + ShareAlike
- Always check individual asset licenses

## Next Steps

1. Extract downloaded zip files
2. Convert FBX/OBJ to GLB format
3. Organize by biome
4. Test loading in game
5. Optimize textures and models for mobile

## Automated Download

### Poly Haven Textures

Download PBR textures from Poly Haven:
```bash
node scripts/download-polyhaven-textures.js
```

Edit `scripts/polyhaven-textures.json` to add more texture IDs.

### Other Sources

- **Sketchfab**: Run `node scripts/download-sketchfab-assets.js` for download instructions
- **itch.io**: Run `node scripts/download-itch-assets.js` for download instructions
- **OpenGameArt**: Use `scripts/download-free-assets.js` with direct download URLs

## Asset Registry

The asset registry tracks all converted assets:
- Location: `public/assets/models/ASSET_REGISTRY.json`
- Update: `node scripts/update-asset-registry.js`

## Conversion Pipeline

1. **Download** assets from sources
2. **Extract** ZIP files to `temp/` directory
3. **Convert** FBX to GLB using batch script
4. **Organize** into biome folders
5. **Update** asset registry
6. **Test** loading in game

