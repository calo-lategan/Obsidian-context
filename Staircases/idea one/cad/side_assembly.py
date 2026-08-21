"""Phase A - ONE SIDE of the folding self-leveling stair, in build123d (mm).
Run:  uvx --python 3.13 --with "build123d==0.10.0" --with "cadquery-ocp==7.8.1.1.post1" --with "bd_warehouse" python cad/side_assembly.py

True 4-bar parallelogram: main stringer (pivot O_M) + control bar (pivot O_C=O_M+(0,0,D)),
both inclined at theta. Each carrier is pinned to the stringer at P_M_i (lower) and to the
control bar at P_C_i = P_M_i+(0,0,D) (upper); the fixed D spacing holds every tread LEVEL.
Carrier carries a bolt-in grating seat. Posed at STAIR for inspection; exports GLB + STEP.
"""
import sys, pathlib, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import params as P
from build123d import *

OUT = pathlib.Path(r"C:/Users/USER/Desktop/Staircases/idea one/out"); OUT.mkdir(parents=True, exist_ok=True)


def shs(length, outer, wall):
    """Hollow square section, axis along +Z, from z=0..length."""
    return extrude(Rectangle(outer, outer) - Rectangle(outer - 2 * wall, outer - 2 * wall), length)


def ybore(r, h=200.0):
    """A cylinder whose axis is the world Y (pin axis), centered on origin."""
    return Rot(-90, 0, 0) * Cylinder(r, h)


def clevis(width=60.0, height=44.0, thick=10.0, gap=30.0, bore=P.PIN16):
    """A clevis (two parallel ears with a coaxial Y-bore at local origin)."""
    ear = Box(width, thick, height)
    pair = Pos(0, (gap + thick) / 2, 0) * ear + Pos(0, -(gap + thick) / 2, 0) * ear
    return pair - ybore(bore / 2)


def carrier(landing=False):
    """Carrier in its OWN frame: lower pin at origin (->stringer), upper pin at (0,0,D)
    (->control bar), a vertical leveling arm between them, and a bolt-in grating seat
    extending +X (going) on the inboard (+Y) side. Stays LEVEL when placed at P_M_i."""
    going = P.PLATFORM if landing else P.GOING
    nholes = 3 if landing else 2
    lower = clevis()                                   # to stringer at P_M_i
    upper = Pos(0, 0, P.D) * clevis()                  # to control bar at P_C_i
    arm = Pos(0, 0, P.D / 2) * Box(40, 40, P.D)        # vertical leveling link
    # seat shelf: 12mm plate, top at z=0 (deck top = pin level), extends +X by 'going'
    seat = Pos(going / 2, 35, -6) * Box(going, 60, 12)
    # M8 grating bolt holes (clearance 9), through the shelf
    holes = None
    for k in range(nholes):
        hx = (going / (nholes + 1)) * (k + 1)
        h = Pos(hx, 35, -6) * Cylinder(4.5, 40)
        holes = h if holes is None else holes + h
    c = lower + upper + arm + seat
    if holes is not None:
        c = c - holes
    return c


def base_bracket():
    """Ground bracket carrying the two parallelogram pivots O_M=(0,0,0), O_C=(0,0,D)."""
    foot = Pos(0, 0, -10) * Box(160, 120, 20)
    post = Pos(-30, 0, P.D / 2) * Box(20, 120, P.D + 40)
    return foot + post


def build_side(state="STAIR"):
    th = P.THETA[state]
    incline = 90 - th            # maps a +Z member onto the incline direction u
    parts = []

    stringer = Rot(0, incline, 0) * shs(P.N * P.L, *P.SEC_STR)
    stringer.label = "stringer"
    parts.append(stringer)

    ctrl = Pos(0, 0, P.D) * Rot(0, incline, 0) * shs(P.N * P.L, *P.SEC_CTL)
    ctrl.label = "control_bar"
    parts.append(ctrl)

    base = base_bracket(); base.label = "base_bracket"; parts.append(base)

    for i in range(1, P.N + 1):
        c = carrier(landing=(i == P.N))
        c = Pos(*P.P_M(i, th)) * c                    # placed level at the lower node
        c.label = f"carrier_{i}"
        parts.append(c)

    asm = Compound(children=parts)
    return asm


if __name__ == "__main__":
    asm = build_side("STAIR")
    bb = asm.bounding_box()
    print("PARTS", [c.label for c in asm.children])
    print("BBOX_mm", [round(bb.size.X, 1), round(bb.size.Y, 1), round(bb.size.Z, 1)])
    valids = {c.label: c.is_valid for c in asm.children}
    print("VALID", valids)
    export_step(asm, str(OUT / "side.step")); print("step", (OUT / "side.step").exists())
    export_gltf(asm, str(OUT / "side.glb"), binary=True); print("glb", (OUT / "side.glb").exists())
