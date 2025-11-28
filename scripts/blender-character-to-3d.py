"""
Blender Script: Convert Character Sprites to 3D Models
Optimized for character sprites with billboard-style rendering

Methods:
1. billboard - Plane that always faces camera (current approach, enhanced)
2. capsule - Capsule/cylinder with sprite texture (3D body)
3. billboard-depth - Billboard with slight depth for shadow/outline
"""

import bpy
import bmesh
import sys
import os

# Clear existing mesh data
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def load_sprite_image(image_path):
    """Load sprite image"""
    if not os.path.exists(image_path):
        print(f"Error: Image not found: {image_path}")
        return None
    
    img = bpy.data.images.load(image_path)
    return img

def create_billboard_character(image_path, output_path, method='billboard-depth', depth=0.1):
    """
    Convert character sprite to 3D model
    
    Args:
        image_path: Path to sprite image
        output_path: Path to save GLB file
        method: 'billboard', 'capsule', or 'billboard-depth'
        depth: Depth for billboard-depth method
    """
    print(f"Loading character sprite: {image_path}")
    img = load_sprite_image(image_path)
    if img is None:
        return False
    
    width, height = img.size
    aspect = width / height
    
    print(f"Character sprite: {width}x{height} (aspect: {aspect:.2f})")
    
    if method == 'billboard':
        # Simple billboard plane (like current system)
        bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))
        obj = bpy.context.active_object
        obj.scale = (aspect, 1.0, 1.0)
        obj.name = "CharacterBillboard"
        
        # Create material
        mat = bpy.data.materials.new(name="CharacterMaterial")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        
        tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex_node.image = img
        mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
        mat.node_tree.links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])
        mat.blend_method = 'BLEND'
        obj.data.materials.append(mat)
        
        print("Created billboard character")
        
    elif method == 'billboard-depth':
        # Billboard with slight depth for better 3D appearance
        # Create main plane
        bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))
        obj = bpy.context.active_object
        obj.scale = (aspect, 1.0, 1.0)
        obj.name = "CharacterBillboard"
        
        # Create material
        mat = bpy.data.materials.new(name="CharacterMaterial")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        
        tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex_node.image = img
        mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
        mat.node_tree.links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])
        mat.blend_method = 'BLEND'
        obj.data.materials.append(mat)
        
        # Add slight depth shadow/outline plane behind
        bpy.ops.mesh.primitive_plane_add(size=2, location=(0, -depth, 0))
        shadow_obj = bpy.context.active_object
        shadow_obj.scale = (aspect * 1.05, 1.05, 1.0)  # Slightly larger
        shadow_obj.name = "CharacterShadow"
        
        # Dark shadow material
        shadow_mat = bpy.data.materials.new(name="CharacterShadowMaterial")
        shadow_mat.use_nodes = True
        shadow_bsdf = shadow_mat.node_tree.nodes["Principled BSDF"]
        shadow_bsdf.inputs['Base Color'].default_value = (0, 0, 0, 1)  # Black
        shadow_bsdf.inputs['Alpha'].default_value = 0.3  # Semi-transparent
        shadow_mat.blend_method = 'BLEND'
        shadow_obj.data.materials.append(shadow_mat)
        
        print(f"Created billboard with depth shadow (depth: {depth})")
        
    elif method == 'capsule':
        # 3D capsule/cylinder body with sprite texture
        # Create capsule (approximates character body)
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=0.5,
            location=(0, 0, 0.5),
            scale=(aspect * 0.6, 0.6, 1.0)
        )
        body = bpy.context.active_object
        body.name = "CharacterBody"
        
        # Create material
        mat = bpy.data.materials.new(name="CharacterMaterial")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        
        tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex_node.image = img
        
        # Use emission for better sprite visibility
        mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
        mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 0.5
        mat.node_tree.links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])
        mat.blend_method = 'BLEND'
        body.data.materials.append(mat)
        
        # Add billboard plane in front for main sprite
        bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0.1, 0.5))
        billboard = bpy.context.active_object
        billboard.scale = (aspect, 1.0, 1.0)
        billboard.name = "CharacterSprite"
        
        billboard_mat = bpy.data.materials.new(name="CharacterSpriteMaterial")
        billboard_mat.use_nodes = True
        billboard_bsdf = billboard_mat.node_tree.nodes["Principled BSDF"]
        billboard_tex = billboard_mat.node_tree.nodes.new('ShaderNodeTexImage')
        billboard_tex.image = img
        billboard_mat.node_tree.links.new(billboard_tex.outputs['Color'], billboard_bsdf.inputs['Base Color'])
        billboard_mat.node_tree.links.new(billboard_tex.outputs['Alpha'], billboard_bsdf.inputs['Alpha'])
        billboard_mat.blend_method = 'BLEND'
        billboard.data.materials.append(billboard_mat)
        
        print("Created capsule character with billboard sprite")
    
    # Export as GLB
    print(f"Exporting to: {output_path}")
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
    
    print(f"✅ Successfully exported: {output_path}")
    return True

def main():
    """Main function"""
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    
    if len(argv) < 2:
        print("Usage: blender --background --python blender-character-to-3d.py -- <sprite_path> <output_path> [method] [depth]")
        print("Methods: billboard, billboard-depth, capsule")
        print("Example: blender --background --python blender-character-to-3d.py -- sprite.png output.glb billboard-depth 0.1")
        return
    
    image_path = argv[0]
    output_path = argv[1]
    method = argv[2] if len(argv) > 2 else 'billboard-depth'
    depth = float(argv[3]) if len(argv) > 3 else 0.1
    
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    
    success = create_billboard_character(image_path, output_path, method, depth)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

