# Blender MCP Usage Guide - Extensive Asset Download

## Overview
This guide provides step-by-step instructions for using Blender MCP tools to extensively download textures and models.

## Available Blender MCP Tools

Based on your Blender MCP configuration, you have access to:

### Poly Haven Tools
- `get_polyhaven_categories` - Get available categories
- `search_polyhaven_assets` - Search for assets
- `download_polyhaven_asset` - Download assets directly

### Sketchfab Tools
- `get_sketchfab_status` - Check connection
- `search_sketchfab_models` - Search for models
- `download_sketchfab_model` - Download models

## Step 1: Download Textures from Poly Haven

### Method 1: Using Blender MCP Tools (Recommended)

1. **Search for textures**:
   ```
   Use: search_polyhaven_assets
   Parameters:
   - type: "textures"
   - q: "metal" or "sci-fi" or "cyberpunk"
   ```

2. **Download texture**:
   ```
   Use: download_polyhaven_asset
   Parameters:
   - assetId: "{texture_id}"
   - type: "textures"
   - resolution: "2k" (or "1k" for mobile)
   ```

### Method 2: Using Scripts

Run the extensive download script:
```bash
node scripts/download-textures-extensive.js
```

**Note**: Texture IDs need to be verified. The script will attempt downloads and report which IDs are valid.

### Recommended Texture Categories

**Sci-Fi**:
- Metal surfaces
- Concrete floors
- Industrial panels
- Tech surfaces

**Cyberpunk**:
- Neon materials
- Rusty metals
- Damaged concrete
- Urban surfaces

**Industrial**:
- Metal plates
- Grates
- Concrete
- Rust textures

## Step 2: Download Models from Sketchfab

### Method 1: Using Blender MCP Tools (Recommended)

1. **Search for models**:
   ```
   Use: search_sketchfab_models
   Parameters:
   - q: "cyberpunk city" or "sci-fi modular"
   - downloadable: true
   - free: true
   ```

2. **Download model**:
   ```
   Use: download_sketchfab_model
   Parameters:
   - modelId: "{model_id}"
   - format: "glb"
   ```

### Recommended Models

1. **Cyberpunk City** (golukumar)
   - ID: `3f24e5c5bf924f46b30d9a392afa9624`
   - Category: cyberpunk
   - License: CC0

2. **Sci-Fi Computer Room**
   - ID: `a149d5bfcef6496c9a0606b5ce5ebf27`
   - Category: sci-fi
   - License: CC0

### Method 2: Manual Download

1. Visit: `https://sketchfab.com/3d-models/{model-name}-{id}`
2. Click "Download"
3. Select GLB format
4. Save to: `public/assets/models/biomes/{category}/`

## Step 3: Test Assets In-Game

### Test Page Created

**File**: `src/game/pages/AssetTestPage.tsx`

**Features**:
- Full 3D canvas with OrbitControls
- Biome selector
- Lighting and environment
- Grid and axes helpers
- UI controls panel

### Integration

Add to your app routing:
```typescript
import AssetTestPage from './game/pages/AssetTestPage'

// In your router
<Route path="/asset-test" element={<AssetTestPage />} />
```

### Usage

1. Navigate to `/asset-test` in your app
2. Select a biome from the dropdown
3. Use mouse controls to view assets:
   - Left Click + Drag: Rotate
   - Right Click + Drag: Pan
   - Scroll: Zoom

### Test Component

**File**: `src/game/components/test/BiomeAssetTest.tsx`

**Features**:
- Loads assets from registry
- Displays samples from each category
- Handles loading states
- Error handling

## Execution Checklist

### Textures
- [ ] Use `search_polyhaven_assets` to find valid texture IDs
- [ ] Use `download_polyhaven_asset` for each texture
- [ ] Verify textures are in `public/assets/textures/{category}/{id}/`
- [ ] Test texture loading in game

### Models
- [ ] Use `search_sketchfab_models` to find models
- [ ] Use `download_sketchfab_model` for each model
- [ ] Verify models are in `public/assets/models/biomes/{category}/`
- [ ] Update asset registry: `node scripts/update-asset-registry.js`

### Testing
- [ ] Add `AssetTestPage` to app routing
- [ ] Navigate to test page
- [ ] Verify assets load correctly
- [ ] Test all biomes
- [ ] Check performance

## Troubleshooting

### Texture IDs Not Found
- Use `search_polyhaven_assets` to find actual texture IDs
- Check Poly Haven website for texture names
- Update `scripts/polyhaven-textures.json` with valid IDs

### Models Not Downloading
- Verify Sketchfab model is free and downloadable
- Check model ID is correct
- Ensure Blender MCP Sketchfab integration is enabled

### Assets Not Loading in Test
- Check asset paths in registry
- Verify GLB files exist
- Check browser console for errors
- Ensure modelLoader is working correctly

## Next Steps After Download

1. **Update Registry**: Run `node scripts/update-asset-registry.js`
2. **Test Loading**: Use AssetTestPage to verify
3. **Integrate**: Use assets in actual game scenes
4. **Optimize**: Create LOD versions if needed
5. **Document**: Update asset documentation

## Summary

All infrastructure is ready:
- ✅ Texture download scripts
- ✅ Model download instructions
- ✅ Test component
- ✅ Test page
- ✅ Documentation

**Ready to use Blender MCP tools to download assets!**

