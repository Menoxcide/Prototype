"""
Blender Add-on: Sprite to 3D Converter
Install as add-on or run directly in Blender's Scripting workspace

Usage in Blender:
1. Open Blender
2. Go to Scripting workspace
3. Open this file
4. Run script (Alt+P or click Run)
5. Use the operator in 3D Viewport > Object menu
"""

bl_info = {
    "name": "Sprite to 3D Converter",
    "author": "MARS://NEXUS",
    "version": (1, 0),
    "blender": (3, 5, 0),
    "location": "View3D > Object > Convert Sprite to 3D",
    "description": "Convert 2D sprite images to 3D models",
    "category": "Object",
}

import bpy
import bmesh
import os
from mathutils import Vector

class ConvertSpriteTo3D(bpy.types.Operator):
    """Convert a 2D sprite image to a 3D model"""
    bl_idname = "object.convert_sprite_to_3d"
    bl_label = "Convert Sprite to 3D"
    bl_options = {'REGISTER', 'UNDO'}
    
    filepath: bpy.props.StringProperty(
        name="Sprite Image",
        description="Path to sprite image file",
        subtype='FILE_PATH'
    )
    
    depth: bpy.props.FloatProperty(
        name="Depth",
        description="Extrusion depth",
        default=0.5,
        min=0.1,
        max=2.0
    )
    
    method: bpy.props.EnumProperty(
        name="Method",
        description="Conversion method",
        items=[
            ('EXTRUDE', 'Extrude', 'Simple extrusion with texture'),
            ('VOXEL', 'Voxel', 'Voxel-like stacking'),
        ],
        default='EXTRUDE'
    )
    
    def execute(self, context):
        if not os.path.exists(self.filepath):
            self.report({'ERROR'}, f"File not found: {self.filepath}")
            return {'CANCELLED'}
        
        # Clear selection
        bpy.ops.object.select_all(action='DESELECT')
        
        # Load image
        try:
            img = bpy.data.images.load(self.filepath)
        except:
            self.report({'ERROR'}, f"Failed to load image: {self.filepath}")
            return {'CANCELLED'}
        
        width, height = img.size
        aspect = width / height
        
        if self.method == 'EXTRUDE':
            # Create box
            bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
            obj = context.active_object
            obj.scale = (aspect, 1.0, self.depth)
            
            # Create material with image texture
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
            
        elif self.method == 'VOXEL':
            # Create plane for each layer
            layers = 8
            layer_height = self.depth / layers
            
            for i in range(layers):
                y_pos = (i / layers - 0.5) * self.depth
                bpy.ops.mesh.primitive_plane_add(
                    size=2,
                    location=(0, y_pos, 0),
                    scale=(aspect, 1.0, 1.0)
                )
                obj = context.active_object
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
        
        self.report({'INFO'}, f"Created 3D model from {os.path.basename(self.filepath)}")
        return {'FINISHED'}
    
    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


def menu_func(self, context):
    self.layout.operator(ConvertSpriteTo3D.bl_idname)


def register():
    bpy.utils.register_class(ConvertSpriteTo3D)
    bpy.types.VIEW3D_MT_object.append(menu_func)


def unregister():
    bpy.utils.unregister_class(ConvertSpriteTo3D)
    bpy.types.VIEW3D_MT_object.remove(menu_func)


if __name__ == "__main__":
    register()
    
    # Example usage - uncomment to test
    # bpy.ops.object.convert_sprite_to_3d('INVOKE_DEFAULT')

