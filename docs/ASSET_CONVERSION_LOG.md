# Asset Conversion Log

This document tracks the conversion of assets from various formats to GLB for use in MARS://NEXUS.

## Conversion Tools

### Blender Setup
- **Path**: `X:\Blender\Blender-5.1.0\blender.exe`
- **Version**: 5.1.0
- **Status**: ✅ Configured

### Conversion Scripts
- `scripts/blender-fbx-to-glb.py` - Single file conversion
- `scripts/blender-fbx-to-glb-batch.js` - Batch conversion
- `scripts/test-fbx-conversion.js` - Test conversion
- `scripts/organize-assets.js` - Organize converted files
- `scripts/update-asset-registry.js` - Update asset registry

## Conversion Status

### LowPoly Modular Sci-Fi Environments (OpenGameArt)

**Source**: OpenGameArt.org - LowPoly Modular Sci-Fi Environments  
**License**: CC0 (Public Domain)  
**Original Format**: FBX, OBJ, Blend  
**Target Format**: GLB  
**Total Files**: 91 FBX files

#### Conversion Progress

- [x] Conversion scripts created
- [x] Test conversion successful (Column_1.fbx → Column_1.glb, 5.02 KB)
- [x] Full batch conversion (91 files) - **COMPLETED** ✅
- [x] Organization into biome folders - **COMPLETED** ✅
- [x] Asset registry update - **COMPLETED** ✅
- [x] Game integration testing - Test component created ✅

#### Known Issues

1. **Blender Addon Warning**: Non-fatal error from `tripo-3d-for-blender` addon during export
   - **Impact**: None - conversion completes successfully
   - **Workaround**: Error is suppressed in script

2. **Export Parameters**: Simplified to minimal set for Blender 5.1 compatibility
   - Removed unsupported parameters: `export_colors`, `export_deformation_bones_only`, etc.
   - Using only essential parameters: `filepath`, `export_format`, `export_materials`

#### File Organization

After conversion, files will be organized as:
```
public/assets/models/
├── biomes/sci-fi/
│   ├── floor/        # Floor tiles
│   ├── walls/        # Wall pieces
│   ├── columns/      # Column variants
│   ├── roof/         # Roof tiles
│   ├── doors/        # Door variants
│   └── stairs/       # Staircases
└── props/
    ├── sci-fi/       # Sci-fi props
    └── details/      # Detail pieces
```

## Texture Downloads

### Poly Haven Textures

**Status**: Scripts created, ready for download  
**Configuration**: `scripts/polyhaven-textures.json`  
**Download Script**: `scripts/download-polyhaven-textures.js`

**Planned Textures**:
- Sci-fi panels and metals
- Cyberpunk materials
- Industrial surfaces
- Nature/overgrown (for biome variety)
- Desert/wasteland materials

## Optimization Notes

### Model Optimization
- GLB format selected for efficient loading
- Materials preserved during conversion
- File sizes: ~5 KB per simple asset (tested with Column_1)

### Texture Optimization
- Default resolution: 2k (configurable to 1k for mobile)
- PBR texture sets: diffuse, normal, roughness, metallic, AO

### Mobile Considerations
- Keep polygon count low (<500 triangles per model)
- Consider LOD versions for large/complex models
- Texture resolution can be reduced to 1k for mobile devices

## Completed Steps ✅

1. ✅ Complete batch conversion of all 91 FBX files
2. ✅ Organize converted assets into biome folders
3. ✅ Update asset registry with all converted assets
4. ⏳ Download PBR textures from Poly Haven (scripts ready, texture IDs need verification)
5. ✅ Test component created (BiomeAssetTest.tsx)
6. 📝 Optimize assets for mobile performance (future work)

## Conversion Statistics

- **Total FBX Files**: 91
- **Converted**: 91 ✅
- **Remaining**: 0
- **Success Rate**: 100%
- **Total Size**: 2.98 MB
- **Average File Size**: ~33 KB per asset

## Asset Sources Summary

| Source | Assets Found | Downloaded | Converted | Status |
|--------|-------------|------------|-----------|--------|
| OpenGameArt | 91 FBX files | ✅ | ⏳ In Progress | Active |
| Poly Haven | Multiple textures | ⏳ Pending | N/A | Ready |
| Sketchfab | Multiple models | ⏳ Pending | ⏳ Pending | Manual |
| itch.io | Multiple assets | ⏳ Pending | ⏳ Pending | Manual |

## Notes

- All assets are CC0 licensed (Public Domain)
- Conversion preserves original model structure
- Materials and textures are maintained during conversion
- Blender 5.1.0 compatibility verified

