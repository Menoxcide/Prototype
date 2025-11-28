"""
Blender Script: Convert 2D Sprites to 3D Models
Run this script from Blender: File > Scripting > Run Script
Or from command line: blender --background --python blender-sprite-to-3d.py -- <sprite_path> <output_path>
"""

import bpy
import bmesh
import sys
import os
from mathutils import Vector

# Clear existing mesh data
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def create_3d_from_sprite(image_path, output_path, depth=0.5, method='extrude'):
    """
    Convert sprite to 3D model
    
    Args:
        image_path: Path to sprite image
        output_path: Path to save GLB file
        depth: Extrusion depth (0.1-1.0)
        method: 'extrude' or 'voxel'
    """
    print(f"Loading sprite: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"Error: Image not found: {image_path}")
        return False
    
    # Load image using Blender's built-in loader
    try:
        img = bpy.data.images.load(image_path)
    except Exception as e:
        print(f"Error loading image: {e}")
        return False
    
    width, height = img.size
    aspect = width / height
    
    # Normalize coordinates to -1 to 1
    scale_x = aspect
    scale_y = 1.0
    
    print(f"Image size: {width}x{height}, aspect: {aspect:.2f}")
    
    if method == 'extrude':
        # Method 1: Simple extrusion with sprite as texture
        bpy.ops.mesh.primitive_cube_add(
            size=2,
            location=(0, 0, 0)
        )
        obj = bpy.context.active_object
        obj.scale = (scale_x, scale_y, depth)
        
        # Load texture
        img = bpy.data.images.load(image_path)
        texture = bpy.data.textures.new(name="SpriteTexture", type='IMAGE')
        texture.image = img
        
        # Create material
        mat = bpy.data.materials.new(name="SpriteMaterial")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        
        # Add image texture node
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
        
    elif method == 'voxel':
        # Method 2: Voxel-like stacking (simplified - uses layers)
        layers = 8
        layer_height = depth / layers
        
        for i in range(layers):
            y_pos = (i / layers - 0.5) * depth
            bpy.ops.mesh.primitive_plane_add(
                size=2,
                location=(0, y_pos, 0),
                scale=(scale_x, 1.0, 1.0)
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
            mat.node_tree.links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])
            mat.blend_method = 'BLEND'
            obj.data.materials.append(mat)
    
    # Export as GLB
    print(f"Exporting to: {output_path}")
    # Blender 4.5.3 compatible export parameters
    export_params = {
        'filepath': output_path,
        'export_format': 'GLB',
        'export_materials': 'EXPORT',
        'export_normals': True,
        'export_texcoords': True,
    }
    # Only add export_colors if supported (Blender 4.0+)
    try:
        bpy.ops.export_scene.gltf(**export_params, export_colors=True)
    except TypeError:
        # Fallback for older Blender versions
        bpy.ops.export_scene.gltf(**export_params)
    
    print(f"✅ Successfully exported: {output_path}")
    return True

def main():
    """Main function - handles command line arguments"""
    # Get command line arguments after '--'
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    
    if len(argv) < 2:
        print("Usage: blender --background --python blender-sprite-to-3d.py -- <sprite_path> <output_path> [depth] [method]")
        print("Example: blender --background --python blender-sprite-to-3d.py -- sprite.png output.glb 0.5 extrude")
        return
    
    image_path = argv[0]
    output_path = argv[1]
    depth = float(argv[2]) if len(argv) > 2 else 0.5
    method = argv[3] if len(argv) > 3 else 'extrude'
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    
    success = create_3d_from_sprite(image_path, output_path, depth, method)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

