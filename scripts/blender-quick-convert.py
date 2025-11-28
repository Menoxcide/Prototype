"""
Quick Sprite to 3D Converter for Blender
Run this directly in Blender's Scripting workspace

Instructions:
1. Open Blender
2. Go to Scripting workspace (top tabs)
3. Click "New" to create a new script
4. Paste this entire file
5. Modify the paths below
6. Run script (Alt+P or click Run button)
"""

import bpy
import os

# ===== CONFIGURATION =====
# Set these paths to your sprite and output location
SPRITE_PATH = r"X:\Prototype\public\public\assets\isometric-tiles\b652a0a7-369b-41f0-88d4-696d1c96150c.png"
OUTPUT_PATH = r"X:\Prototype\public\assets\models\test-output.glb"
DEPTH = 0.5  # Extrusion depth (0.1 = thin, 1.0 = thick)
METHOD = 'voxel'  # 'extrude' or 'voxel'
# =========================

def convert_sprite_to_3d(sprite_path, output_path, depth=0.5, method='extrude'):
    """Convert sprite to 3D model"""
    
    # Clear existing mesh
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # Load image
    if not os.path.exists(sprite_path):
        print(f"ERROR: File not found: {sprite_path}")
        return False
    
    try:
        img = bpy.data.images.load(sprite_path)
    except Exception as e:
        print(f"ERROR: Failed to load image: {e}")
        return False
    
    width, height = img.size
    aspect = width / height
    
    print(f"Loaded sprite: {width}x{height} (aspect: {aspect:.2f})")
    
    if method == 'extrude':
        # Create box
        bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
        obj = bpy.context.active_object
        obj.scale = (aspect, 1.0, depth)
        obj.name = "Sprite3D"
        
        # Create material
        mat = bpy.data.materials.new(name="SpriteMaterial")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        
        # Add image texture
        tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex_node.image = img
        mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
        mat.node_tree.links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])
        
        # Enable transparency
        mat.blend_method = 'BLEND'
        bsdf.inputs['Alpha'].default_value = 1.0
        
        obj.data.materials.append(mat)
        
        # UV unwrap
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.001)
        bpy.ops.object.mode_set(mode='OBJECT')
        
        print("Created extruded model")
        
    elif method == 'voxel':
        # Create multiple layers
        layers = 8
        layer_height = depth / layers
        
        for i in range(layers):
            y_pos = (i / layers - 0.5) * depth
            bpy.ops.mesh.primitive_plane_add(
                size=2,
                location=(0, y_pos, 0),
                scale=(aspect, 1.0, 1.0)
            )
            obj = bpy.context.active_object
            obj.name = f"SpriteLayer_{i}"
            
            # Create material
            mat = bpy.data.materials.new(name=f"SpriteMaterial_{i}")
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes["Principled BSDF"]
            tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex_node.image = img
            mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
            mat.blend_method = 'BLEND'
            obj.data.materials.append(mat)
        
        print(f"Created voxel model with {layers} layers")
    
    # Export as GLB
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    print(f"Exporting to: {output_path}")
    # Blender 4.5.3 compatible export
    export_params = {
        'filepath': output_path,
        'export_format': 'GLB',
        'export_materials': 'EXPORT',
        'export_normals': True,
        'export_texcoords': True,
    }
    try:
        bpy.ops.export_scene.gltf(**export_params, export_colors=True)
    except TypeError:
        bpy.ops.export_scene.gltf(**export_params)
    
    print(f"✅ Success! Exported to: {output_path}")
    return True

# Run conversion
if __name__ == "__main__":
    print("\n" + "="*50)
    print("Sprite to 3D Converter")
    print("="*50 + "\n")
    
    success = convert_sprite_to_3d(SPRITE_PATH, OUTPUT_PATH, DEPTH, METHOD)
    
    if success:
        print("\n✅ Conversion complete!")
        print(f"Model saved to: {OUTPUT_PATH}")
        print("\nTo convert more sprites:")
        print("1. Change SPRITE_PATH and OUTPUT_PATH above")
        print("2. Run script again (Alt+P)")
    else:
        print("\n❌ Conversion failed. Check paths and try again.")

