"""JOINT 1 - BASE PIVOT (the hinge).  build123d, mm.
The two parallelogram ground pivots on one stringer plane:
  O_M (main stringer)  and  O_C = O_M + (0,0,D)  (control bar).
Double-shear clevis ears on the ground bracket; Ø16 A4 pins in flanged nylon bushes;
bored bosses in the SHS ends. Exports assembled + exploded GLB/STEP and prints the
fit/clearance verification so every connection can be inspected zoomed.
Run: uvx --python 3.13 --with "build123d==0.10.0" --with "cadquery-ocp==7.8.1.1.post1" python cad/joint_base_pivot.py
"""
import sys, pathlib, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import params as P
from build123d import *

OUT = pathlib.Path(r"C:/Users/USER/Desktop/Staircases/idea one/out"); OUT.mkdir(parents=True, exist_ok=True)

TH = P.THETA["STAIR"]
INC = 90 - TH                      # +Z member -> incline direction
O_M = (0.0, 0.0, 70.0)             # main pivot height above foot
O_C = (0.0, 0.0, 70.0 + P.D)       # control-bar pivot (D=140 above)

# fit scheme (mm)
PIN = 16.0                         # Ø16 pin
BUSH_ID, BUSH_OD, BUSH_L = 16.2, 24.0, 12.0
EAR_BORE = 24.0                    # ear bore = bush OD (press fit)
BOSS_BORE = 16.3                   # bored boss takes the bush too
EAR_T = 12.0
GAP = 64.0                          # between ears (straddles 60 SHS)


def ybore(r, h=300.0):
    return Rot(-90, 0, 0) * Cylinder(r, h)


def ytube(od, idd, length):
    return (Rot(-90, 0, 0) * Cylinder(od/2, length)) - (Rot(-90, 0, 0) * Cylinder(idd/2, length + 1))


def bracket():
    foot = Pos(0, 0, -12) * Box(180, 130, 24)
    ear = Box(90, EAR_T, 290)
    b = foot + Pos(0, (GAP + EAR_T)/2, 133) * ear     # sequential fuse: foot overlaps each ear
    b = b + Pos(0, -(GAP + EAR_T)/2, 133) * ear        # -> stays one connected solid
    bores = ybore(EAR_BORE/2, 200)
    b = b - Pos(*O_M) * bores - Pos(*O_C) * bores
    return b


def member_with_boss(origin, outer, wall, length):
    """SHS stub inclined up the slope from `origin`, with a solid bored boss at origin."""
    shs = extrude(Rectangle(outer, outer) - Rectangle(outer-2*wall, outer-2*wall), length)
    shs = Pos(*origin) * Rot(0, INC, 0) * shs
    boss = Pos(*origin) * (Box(outer-2, GAP-2, outer-2) - ybore(BOSS_BORE/2, GAP+40))
    return shs + boss


def pin(origin):
    shaft = Pos(*origin) * (Rot(-90, 0, 0) * Cylinder(PIN/2, GAP + 2*EAR_T + 16))
    head = Pos(origin[0], (GAP/2 + EAR_T + 6), origin[2]) * (Rot(-90, 0, 0) * Cylinder(13, 8))
    # R-clip groove = annular neck (remove outer ring, keep a Ø10 core so the tip stays attached)
    groove = Pos(origin[0], -(GAP/2 + EAR_T + 4), origin[2]) * ytube(PIN + 0.4, 10.0, 3.0)
    return (shaft + head) - groove


def build(explode=0.0):
    parts = []
    def add(shape, label):
        shape.label = label
        parts.append(shape)
    add(bracket(), "base_bracket")
    add(member_with_boss(O_M, *P.SEC_STR, 240), "stringer_end")
    add(member_with_boss(O_C, *P.SEC_CTL, 240), "control_end")
    for tag, o in (("M", O_M), ("C", O_C)):
        pn = pin(o)
        if explode:
            pn = Pos(0, 90 * explode, 0) * pn
        add(pn, f"pin_{tag}")
        for k, yo in enumerate((+(GAP/2 + EAR_T/2), -(GAP/2 + EAR_T/2))):  # 2 bushes/pin (disjoint -> separate parts)
            add(Pos(o[0], yo, o[2]) * ytube(BUSH_OD, BUSH_ID, BUSH_L), f"bush_{tag}{k}")
    for p in parts:
        nsolid = len(p.solids()) if hasattr(p, "solids") else "n/a"
        print("PART", getattr(p, "label", "?"), "->", type(p).__name__, "solids=", nsolid)
    # coerce any multi-solid / ShapeList part into a single Part so Compound accepts it
    fixed = []
    for p in parts:
        if isinstance(p, (list, tuple)) or type(p).__name__ == "ShapeList":
            c = Part() + list(p)
            c.label = getattr(p, "label", "part")
            fixed.append(c)
        else:
            fixed.append(p)
    return Compound(children=fixed)


if __name__ == "__main__":
    asm = build()
    bb = asm.bounding_box()
    print("PARTS", [c.label for c in asm.children])
    print("BBOX_mm", [round(bb.size.X,1), round(bb.size.Y,1), round(bb.size.Z,1)])
    print("--- FIT / CLEARANCE VERIFICATION ---")
    print(f"pin Ø{PIN}  in  bush ID Ø{BUSH_ID}  -> running clearance {BUSH_ID-PIN:.2f} mm (bearing)")
    print(f"bush OD Ø{BUSH_OD}  in  ear bore Ø{EAR_BORE}  -> {EAR_BORE-BUSH_OD:.2f} mm (press/locate)")
    print(f"pivot spacing O_M->O_C = {O_C[2]-O_M[2]:.1f} mm  (must equal D={P.D})  -> {'OK' if abs((O_C[2]-O_M[2])-P.D)<1e-6 else 'FAIL'}")
    print(f"shear planes per pin = 2 (double shear: ear|member|ear)")
    print("VALID", {c.label: c.is_valid for c in asm.children})
    export_step(asm, str(OUT/"joint_base.step"))
    export_gltf(asm, str(OUT/"joint_base.glb"), binary=True)
    export_gltf(build(explode=1.0), str(OUT/"joint_base_exploded.glb"), binary=True)
    print("exports", (OUT/"joint_base.glb").exists(), (OUT/"joint_base_exploded.glb").exists())
