# Character 3D Conversion Guide

Converting character sprites to 3D while maintaining the isometric billboard aesthetic.

## Current System

Characters are currently rendered as **billboard sprites** (planes that face the camera):
- ✅ Works perfectly for isometric games
- ✅ Supports 8 directions
- ✅ Supports animations
- ✅ Low performance cost
- ⚠️ Looks flat from side angles

## 3D Conversion Methods

### 1. Billboard-Depth (Recommended)
**Best balance of 3D appearance and performance**

- Main billboard plane (current sprite)
- Slight depth shadow/outline behind
- Creates subtle 3D depth effect
- Still performs like billboard

**Usage:**
```bash
blender --background --python scripts/blender-character-to-3d.py -- \
  sprite.png output.glb billboard-depth 0.1
```

**Pros:**
- Maintains billboard performance
- Adds subtle 3D depth
- Works with existing animation system
- Low file size (~5-8 KB)

**Cons:**
- Still mostly flat
- Shadow may not be visible from all angles

### 2. Capsule Method
**3D body with billboard sprite overlay**

- Capsule/cylinder body (approximates character shape)
- Billboard sprite in front
- More 3D appearance
- Higher polygon count

**Usage:**
```bash
blender --background --python scripts/blender-character-to-3d.py -- \
  sprite.png output.glb capsule
```

**Pros:**
- More 3D appearance
- Better shadows/lighting
- Still uses sprite for main appearance

**Cons:**
- Higher polygon count (~100-200 triangles)
- Slightly larger file size (~10-15 KB)
- May need LOD for mobile

### 3. Billboard (Current)
**Simple plane (no conversion needed)**

- Just a plane with sprite texture
- Current system already does this
- No conversion needed

## Implementation

### Option A: Enhanced Billboard (Recommended)
Keep current billboard system but add:
- Slight depth shadow
- Better lighting
- Outline effect

**No conversion needed** - just enhance the component.

### Option B: Hybrid 3D
Use 3D model for:
- Body/shadow
- Billboard sprite for main appearance

**Requires conversion** - use `blender-character-to-3d.py`.

### Option C: Full 3D
Convert all directions to 3D models:
- More complex
- Higher file size
- Better 3D appearance
- May lose isometric aesthetic

## Recommended Approach

**For MARS://NEXUS:**

1. **Keep billboard system** (it works great!)
2. **Add subtle enhancements:**
   - Depth shadow behind sprite
   - Outline effect
   - Better lighting
3. **Optional:** Convert to billboard-depth for key characters

**Why:**
- Isometric games work best with billboards
- Performance is critical for MMO
- Current system already looks good
- 3D conversion adds complexity without much benefit

## Conversion Script

```bash
# Convert character sprite to 3D
blender --background --python scripts/blender-character-to-3d.py -- \
  public/characters/{id}/rotations/south.png \
  public/assets/models/characters/{id}-billboard-depth.glb \
  billboard-depth 0.1
```

## Integration

The `Character3D` component supports:
- 3D models (if converted)
- Billboard sprites (current system)
- Hybrid rendering (3D body + billboard sprite)

**Usage:**
```typescript
// Use 3D model with billboard
<Character3D
  characterId={characterId}
  position={[x, y, z]}
  rotation={rotation}
  modelPath="/assets/models/characters/character-id-billboard-depth.glb"
  method="billboard-depth"
/>

// Or keep current billboard (no model)
<SpriteCharacter
  characterId={characterId}
  position={[x, y, z]}
  rotation={rotation}
/>
```

## Performance Comparison

| Method | Polygons | File Size | Performance | Visual Quality |
|--------|----------|-----------|-------------|----------------|
| Billboard | 2 | ~2 KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Billboard-Depth | 4 | ~5 KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Capsule | ~150 | ~12 KB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Full 3D | ~500+ | ~50 KB | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Recommendation

**For your game: Keep the billboard system!**

The current billboard approach is:
- ✅ Perfect for isometric games
- ✅ High performance
- ✅ Supports animations
- ✅ Looks great

**Optional enhancement:** Add a subtle depth shadow programmatically (no conversion needed).

If you want to experiment with 3D, use `billboard-depth` method for a few characters and compare.

