"""
Blender Script: FBX to GLB Converter
Import FBX file and export as GLB
Run from command line: blender --background --python blender-fbx-to-glb.py -- input.fbx output.glb
"""

import bpy
import sys
import os

# Suppress addon errors
import logging
logging.getLogger().setLevel(logging.ERROR)

# Get command line arguments
argv = sys.argv
argv = argv[argv.index("--") + 1:]  # Get arguments after "--"

if len(argv) < 2:
    print("Usage: blender --background --python blender-fbx-to-glb.py -- input.fbx output.glb")
    sys.exit(1)

input_path = argv[0]
output_path = argv[1]

print(f"\n{'='*50}")
print(f"FBX to GLB Converter")
print(f"{'='*50}")
print(f"Input:  {input_path}")
print(f"Output: {output_path}")

# Check if input file exists
if not os.path.exists(input_path):
    print(f"ERROR: Input file not found: {input_path}")
    sys.exit(1)

# Suppress addon warnings
import warnings
warnings.filterwarnings('ignore')

# Clear existing scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Clear all materials and meshes
for material in bpy.data.materials:
    bpy.data.materials.remove(material)
for mesh in bpy.data.meshes:
    bpy.data.meshes.remove(mesh)

print("Cleared scene")

# Import FBX
try:
    bpy.ops.import_scene.fbx(
        filepath=input_path,
        use_image_search=True,
        use_alpha_decals=False,
        decal_offset=0.0,
        use_anim=True,
        anim_offset=1.0,
        use_subsurf=False,
        use_custom_props=True,
        use_custom_props_enum_as_string=True,
        ignore_leaf_bones=False,
        force_connect_children=False,
        automatic_bone_orientation=False,
        primary_bone_axis='Y',
        secondary_bone_axis='X',
        use_prepost_rot=True
    )
    print("✓ Imported FBX")
except Exception as e:
    print(f"ERROR: Failed to import FBX: {e}")
    sys.exit(1)

# Ensure output directory exists
output_dir = os.path.dirname(output_path)
if output_dir and not os.path.exists(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    print(f"Created output directory: {output_dir}")

# Suppress stderr for addon errors (they're non-fatal)
import sys
original_stderr = sys.stderr
sys.stderr = open(os.devnull, 'w')

# Export as GLB
try:
    # Blender 5.1 compatible export - minimal parameters
    export_params = {
        'filepath': output_path,
        'export_format': 'GLB',
        'export_materials': 'EXPORT',
    }
    
    bpy.ops.export_scene.gltf(**export_params)
    print(f"✓ Exported GLB: {output_path}")
    
    # Get file size
    if os.path.exists(output_path):
        size = os.path.getsize(output_path)
        size_kb = size / 1024
        print(f"  File size: {size_kb:.2f} KB")
    
except Exception as e:
    print(f"ERROR: Failed to export GLB: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Restore stderr
sys.stderr.close()
sys.stderr = original_stderr

print(f"\n{'='*50}")
print("✓ Conversion complete!")
print(f"{'='*50}\n")

