"""Render the improved wizard with EEVEE Bloom to preview the glow as it will
read under the portfolio's candlelit + Bloom post chain.
  WIZ_MODEL=/tmp/wiz_glow.glb blender --background --python tools/verify_render.py
"""
import sys, os; sys.path.insert(0, "tools")
import _render_helper as H, mathutils, bpy

mn, mx, ctr = H.reset_and_import()
diag = (mx - mn).length
H.setup_world_lights(ctr, diag, bg=(0.02, 0.015, 0.03), energy_scale=0.55)

scene = bpy.context.scene
ev = scene.eevee
ev.use_bloom = True
ev.bloom_intensity = 0.06
ev.bloom_threshold = 0.9
ev.bloom_radius = 6.0
scene.view_settings.look = 'High Contrast'

cam, cd = H.make_cam()
H.shoot(cam, cd, ctr, diag, "ver_front", 90, 3, 1.45)
H.shoot(cam, cd, ctr, diag, "ver_face", 90, 2, 0.5,
        mathutils.Vector((0.175, 0, 0.218)), 85)
H.shoot(cam, cd, ctr, diag, "ver_wand", 65, 2, 0.95,
        mathutils.Vector((0.28, -0.18, 0.18)), 60)
H.shoot(cam, cd, ctr, diag, "ver_3q", 60, 8, 1.4)
