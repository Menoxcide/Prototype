# Blender MCP Integration Guide

## Overview

Blender MCP (Model Context Protocol) tools are available for this project, providing direct integration with Blender for asset conversion and management.

## Available MCP Tools

Based on the Blender MCP configuration, the following tools are available:

### Scene Management
- `get_scene_info` - Get information about the current Blender scene
- `get_object_info` - Get information about objects in the scene
- `get_viewport_screenshot` - Capture viewport screenshot

### Code Execution
- `execute_blender_code` - Execute Python code in Blender
  - **Use Case**: Run conversion scripts, batch operations
  - **Example**: Convert FBX to GLB, process multiple files

### Poly Haven Integration
- `get_polyhaven_categories` - Get available Poly Haven categories
- `search_polyhaven_assets` - Search for assets on Poly Haven
- `download_polyhaven_asset` - Download assets from Poly Haven
  - **Use Case**: Download PBR textures directly
  - **Example**: Download sci-fi panel textures

### Sketchfab Integration
- `get_sketchfab_status` - Check Sketchfab connection status
- `search_sketchfab_models` - Search for models on Sketchfab
- `download_sketchfab_model` - Download models from Sketchfab
  - **Use Case**: Download free 3D models
  - **Example**: Download cyberpunk city models

### Hyper3D Integration
- `generate_hyper3d_model_via_text` - Generate models from text descriptions
- `generate_hyper3d_model_via_images` - Generate models from images
- `poll_rodin_job_status` - Check generation job status
- `import_generated_asset` - Import generated assets

### Hunyuan3D Integration
- `generate_hunyuan3d_model` - Generate models using Hunyuan3D
- `poll_hunyuan_job_status` - Check generation job status
- `import_generated_asset_hunyuan` - Import generated assets

### Texture Management
- `set_texture` - Apply textures to objects

### Strategy
- `asset_creation_strategy` - Get recommendations for asset creation

## Usage Examples

### Converting FBX to GLB

Instead of using command-line Blender, use MCP:

```javascript
// Using execute_blender_code MCP tool
const pythonCode = `
import bpy
bpy.ops.import_scene.fbx(filepath="input.fbx")
bpy.ops.export_scene.gltf(filepath="output.glb", export_format='GLB')
`

// Call MCP tool (pseudo-code)
await mcpBlender.executeBlenderCode(pythonCode)
```

### Downloading Poly Haven Textures

```javascript
// Search for textures
const results = await mcpBlender.searchPolyHavenAssets({
  type: 'textures',
  category: 'sci-fi',
  q: 'panel'
})

// Download texture
await mcpBlender.downloadPolyHavenAsset({
  assetId: 'sci_fi_panel_01',
  type: 'textures',
  resolution: '2k'
})
```

### Downloading Sketchfab Models

```javascript
// Search for models
const results = await mcpBlender.searchSketchfabModels({
  q: 'cyberpunk city',
  downloadable: true,
  free: true
})

// Download model
await mcpBlender.downloadSketchfabModel({
  modelId: '3f24e5c5bf924f46b30d9a392afa9624',
  format: 'glb'
})
```

## Advantages of MCP Integration

1. **No Command-Line Issues**: Direct Python execution in Blender
2. **Better Error Handling**: Structured responses from MCP tools
3. **Integrated Workflow**: Seamless asset pipeline
4. **Poly Haven Direct**: No need for API URL construction
5. **Sketchfab Direct**: Built-in authentication handling

## Migration Path

### Current Scripts → MCP-Enhanced Scripts

1. **FBX Conversion**: 
   - Current: `blender-fbx-to-glb-batch.js` (command-line)
   - Enhanced: Use `execute_blender_code` MCP tool

2. **Texture Downloads**:
   - Current: `download-polyhaven-textures.js` (API calls)
   - Enhanced: Use `download_polyhaven_asset` MCP tool

3. **Model Downloads**:
   - Current: `download-sketchfab-assets.js` (manual)
   - Enhanced: Use `download_sketchfab_model` MCP tool

## Next Steps

1. Update conversion scripts to use MCP tools
2. Create MCP wrapper functions for common operations
3. Integrate MCP tools into asset pipeline
4. Test MCP-based conversions
5. Document MCP workflow

## Configuration

Blender MCP is configured at:
- Path: `C:\Users\justi\.local\bin\uvx.exe blender-mcp`
- Status: Enabled (green toggle)

