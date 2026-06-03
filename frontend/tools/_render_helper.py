"""Shared Blender render helper for the wizard model. Headless EEVEE.
Imports the model, sets sane studio lighting/exposure, can drop marker
spheres at given coords, and shoots labelled camera angles. Reused by the
locate loop and the final verification renders."""
import bpy, math, mathutils, os

MODEL = os.environ.get("WIZ_MODEL", "public/models/wizard.glb")

def reset_and_import(path=MODEL):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    mn = mathutils.Vector(( 1e9,)*3); mx = mathutils.Vector((-1e9,)*3)
    for o in bpy.data.objects:
        if o.type == 'MESH':
            for v in o.bound_box:
                wv = o.matrix_world @ mathutils.Vector(v)
                for i in range(3):
                    mn[i] = min(mn[i], wv[i]); mx[i] = max(mx[i], wv[i])
    ctr = (mn + mx) / 2
    return mn, mx, ctr

def setup_world_lights(ctr, diag, bg=(0.04,0.04,0.06), energy_scale=1.0):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 900; scene.render.resolution_y = 1200
    scene.view_settings.view_transform = 'Filmic'
    scene.view_settings.look = 'Medium Contrast'
    world = bpy.data.worlds.new("W"); scene.world = world
    world.use_nodes = True
    bgn = world.node_tree.nodes["Background"]
    bgn.inputs[0].default_value = (*bg, 1); bgn.inputs[1].default_value = 0.6
    def add(name, loc, energy, size):
        l = bpy.data.lights.new(name, 'AREA'); l.energy = energy*energy_scale; l.size = size
        o = bpy.data.objects.new(name, l); o.location = loc
        scene.collection.objects.link(o)
        d = ctr - mathutils.Vector(loc)
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    add("key",  (ctr.x+diag*0.9, ctr.y-diag*0.9, ctr.z+diag*0.6), 220, diag)
    add("fill", (ctr.x-diag*0.9, ctr.y-diag*0.7, ctr.z+diag*0.2),  90, diag)
    add("rim",  (ctr.x,          ctr.y+diag*1.0, ctr.z+diag*0.8), 160, diag)

def add_markers(markers):
    """markers: list of (name, (x,y,z), (r,g,b), radius)."""
    for name, loc, col, rad in markers:
        mesh = bpy.data.meshes.new(name)
        bm = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(bm)
        bpy.context.view_layer.objects.active = bm
        ico = bpy.ops.mesh.primitive_uv_sphere_add(radius=rad, location=loc)
        sph = bpy.context.active_object; sph.name = name
        m = bpy.data.materials.new(name+"_m"); m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Emission Color"].default_value = (*col, 1)
        bsdf.inputs["Emission Strength"].default_value = 6.0
        bsdf.inputs["Base Color"].default_value = (*col, 1)
        sph.data.materials.append(m)

def make_cam():
    scene = bpy.context.scene
    cd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cd)
    scene.collection.objects.link(cam); scene.camera = cam
    return cam, cd

def shoot(cam, cd, ctr, diag, name, ang_deg, elev_deg=4.0, dist=1.6, target=None, lens=50):
    t = target if target else ctr
    cd.lens = lens
    a = math.radians(ang_deg); e = math.radians(elev_deg); r = diag*dist
    cam.location = (t.x + r*math.sin(a)*math.cos(e),
                    t.y - r*math.cos(a)*math.cos(e),
                    t.z + r*math.sin(e))
    d = mathutils.Vector(t) - mathutils.Vector(cam.location)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = f"/tmp/{name}.png"
    bpy.ops.render.render(write_still=True)
    print("SHOT", name)
