"""Materials for the staircase (EEVEE Next / Blender 5.1). Assigns by object name
({group}__{meshdataname}): black powder-coat structure, dark galvanized punched grating,
stainless hardware, rope grip, galvanized legs. Call apply_materials() after the rig is built.
"""
import bpy


def _mat(name, base, metallic, rough, bump=0.0, bump_scale=90.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    if bump > 0.0:
        coord = nt.nodes.new("ShaderNodeTexCoord")
        noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = bump_scale
        bmp = nt.nodes.new("ShaderNodeBump"); bmp.inputs["Strength"].default_value = bump
        nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
        nt.links.new(noise.outputs["Fac"], bmp.inputs["Height"])
        nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def apply_materials():
    black = _mat("PowderBlack", (0.016, 0.016, 0.019), 0.10, 0.45, bump=0.06, bump_scale=240)  # RAL 9005 powder coat
    steel = _mat("Stainless",   (0.56, 0.57, 0.60), 1.0, 0.27)                                  # A4 hardware
    grate = _mat("Grating",     (0.045, 0.045, 0.052), 0.85, 0.55, bump=0.45, bump_scale=70)    # dark galvanized tread
    grip  = _mat("GripTread",   (0.03, 0.03, 0.035), 0.7, 0.7, bump=0.6, bump_scale=110)        # anti-slip ridges
    rope  = _mat("RopeGrip",    (0.42, 0.31, 0.17), 0.0, 0.92, bump=0.5, bump_scale=300)        # sisal/rope grip
    galv  = _mat("Galvanized",  (0.40, 0.41, 0.44), 0.90, 0.40, bump=0.10, bump_scale=160)      # leg / spelter

    def pick(nm):
        n = nm.lower()
        if "rope" in n:                       return rope
        if "pin_" in n:                       return steel
        if "_leg__" in n or "platleg" in n:   return galv
        if "grip" in n:                       return grip
        if "grating" in n:                    return grate
        return black                          # stringer, control bar, carrier, base, posts, rail, sleeves

    n = 0
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        o.data.materials.clear()
        o.data.materials.append(pick(o.name))
        n += 1
    return n


if __name__ == "__main__":
    print("materialed", apply_materials())
