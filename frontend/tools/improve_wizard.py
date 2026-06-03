"""Improve public/models/wizard.glb for the candlelit wizarding portfolio.

  blender --background --python tools/improve_wizard.py

What it does (see docs/wizard-glb-improvement.md):
  1. Adds subtle warm GLOWING EYES (two emissive orbs behind the glasses).
  2. Adds a MAGIC WAND effect: a gold emissive orb + spark specks at the
     wand's emitting tip, and makes the existing magic curl/swirl emissive.
  3. Web-optimises geometry: downscales textures 4096 -> 2048. (This Blender
     build ships without the Draco library, so geometry compression is applied
     afterwards with `gltf-transform meshopt` — see tools/build_wizard.sh,
     which runs this script then the meshopt pass. drei's useGLTF decodes
     meshopt by default, with no external CDN.)

Glow materials are named `Glow_*` so the React scene can skip its runtime
emissive override on them (see WizardModel.tsx).

All tunables are at the top. Prefer running tools/build_wizard.sh (full
pipeline). Verify the result with tools/verify_render.py.
"""
import bpy, mathutils, os

SRC = os.environ.get("WIZ_SRC", "tools/wizard.original.glb")
OUT = os.environ.get("WIZ_OUT", "public/models/wizard.glb")

# --- tunables -------------------------------------------------------------
EYE_POS   = [(0.172, -0.040, 0.212), (0.172, 0.040, 0.212)]
EYE_R     = 0.013
EYE_COLOR = (1.0, 0.76, 0.45)   # warm gold
EYE_EMIT  = 1.4                 # "subtle warm" — gentle bloom

WAND_TIP   = (0.31, -0.24, 0.18)
ORB_R      = 0.024
GOLD       = (1.0, 0.72, 0.32)
ORB_EMIT   = 2.6
SPARK_R    = 0.006
SPARK_EMIT = 3.0
# small offsets (model space) for spark specks around the tip
SPARK_OFF  = [(-0.03, -0.02, 0.05), (0.02, -0.04, -0.03),
              (-0.05, 0.01, 0.02), (0.01, 0.03, 0.06), (0.04, -0.01, 0.03)]

# curl/swirl region of the base mesh -> made emissive
CURL_MIN = (0.27, -0.30, 0.10)
CURL_MAX = (0.40, -0.17, 0.26)
CURL_EMIT = 2.0

TEX_SIZE = 2048
# --------------------------------------------------------------------------


def emissive_mat(name, color, strength, base=(0.02, 0.02, 0.03)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*base, 1)
    b.inputs["Roughness"].default_value = 0.4
    b.inputs["Emission Color"].default_value = (*color, 1)
    b.inputs["Emission Strength"].default_value = strength
    return m


def add_orb(name, loc, radius, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=24, ring_count=16)
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    base = [o for o in bpy.data.objects if o.type == 'MESH'][0]

    # 1. glowing eyes
    eye_mat = emissive_mat("Glow_Eye", EYE_COLOR, EYE_EMIT)
    for i, p in enumerate(EYE_POS):
        add_orb(f"Glow_Eye_{i}", p, EYE_R, eye_mat)

    # 2. wand magic: orb + sparks
    orb_mat = emissive_mat("Glow_WandOrb", GOLD, ORB_EMIT)
    add_orb("Glow_WandOrb", WAND_TIP, ORB_R, orb_mat)
    spark_mat = emissive_mat("Glow_Spark", (1.0, 0.85, 0.55), SPARK_EMIT)
    for i, off in enumerate(SPARK_OFF):
        loc = tuple(WAND_TIP[k] + off[k] for k in range(3))
        add_orb(f"Glow_Spark_{i}", loc, SPARK_R, spark_mat)

    # 2b. make the existing curl/swirl faces emissive
    curl_mat = emissive_mat("Glow_Curl", GOLD, CURL_EMIT)
    base.data.materials.append(curl_mat)
    curl_idx = len(base.data.materials) - 1
    mn = mathutils.Vector(CURL_MIN); mx = mathutils.Vector(CURL_MAX)
    mw = base.matrix_world
    sel = 0
    for poly in base.data.polygons:
        c = mw @ poly.center
        if all(mn[k] <= c[k] <= mx[k] for k in range(3)):
            poly.material_index = curl_idx
            sel += 1
    print("CURL_FACES", sel)

    # 3. optimise textures
    for img in bpy.data.images:
        if img.size[0] > TEX_SIZE:
            img.scale(TEX_SIZE, TEX_SIZE)
            print("RESIZED", img.name, "->", TEX_SIZE)

    # Export uncompressed GLB (glow + 2K textures). Geometry compression
    # (EXT_meshopt_compression) is applied by the meshopt pass in build_wizard.sh.
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        export_image_quality=90,
        export_apply=True,
    )
    print("EXPORTED", OUT, round(os.path.getsize(OUT)/1e6, 2), "MB (pre-meshopt)")


main()
