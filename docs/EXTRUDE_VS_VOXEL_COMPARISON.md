# Extrude vs Voxel Method Comparison

## Test Asset
- **Sprite**: Cyberpunk neon fountain (`b652a0a7-369b-41f0-88d4-696d1c96150c.png`)
- **Size**: 32x32px
- **Depth**: 0.5

## Method Comparison

### Extrude Method
- **Output**: `b652a0a7-369b-41f0-88d4-696d1c96150c-extrude.glb`
- **How it works**: Creates a single box/cube with the sprite texture mapped to front and back faces
- **Polygon count**: Low (~12 triangles)
- **Best for**: 
  - Simple objects
  - Performance-critical assets
  - Objects that look good from all angles
- **Pros**:
  - Fastest conversion
  - Lowest polygon count
  - Good performance
  - Simple geometry
- **Cons**:
  - Less depth detail
  - May look flat from side angles
  - No internal structure

### Voxel Method
- **Output**: `b652a0a7-369b-41f0-88d4-696d1c96150c-voxel.glb`
- **How it works**: Stacks multiple layers (planes) of the sprite to create a voxel-like 3D effect
- **Polygon count**: Higher (~16-32 triangles depending on layers)
- **Best for**:
  - Pixel art aesthetic
  - Objects that need depth
  - Decorative elements
- **Pros**:
  - More 3D depth appearance
  - Better for pixel art style
  - More interesting geometry
  - Preserves sprite detail
- **Cons**:
  - Higher polygon count
  - Slightly slower rendering
  - More file size

## Visual Comparison

To view the models:
1. Open in Blender: File > Import > glTF 2.0
2. Or use a GLB viewer online
3. Compare the depth and appearance

## Recommendations

### Use Extrude for:
- Monsters (performance priority)
- NPCs (many instances)
- Simple environmental objects
- Mobile devices

### Use Voxel for:
- Important decorative objects
- Boss monsters (visual impact)
- Key environmental features
- Desktop/high-end devices

## File Sizes (Actual Results)
- **Extrude**: 4.29 KB (single cube geometry)
- **Voxel**: 9.76 KB (8 stacked planes)
- **Difference**: Voxel is ~2.3x larger due to 8 layers vs 1 cube

## Geometry Details
- **Extrude**: 1 cube primitive (12 triangles)
- **Voxel**: 8 plane primitives (16 triangles total)

## Performance Impact
- **Extrude**: Minimal impact, good for instancing
- **Voxel**: Slight impact, use sparingly for important objects

