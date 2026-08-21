"""JOINT 2 - HANDRAIL DEPLOYMENT LOCK (one station).  build123d, mm.
The handrail post is the master lock. At each of 3 stations a vertical post slides
DOWN THROUGH a sleeve welded to the MAIN STRINGER and a sleeve welded to the CONTROL BAR.
The two sleeves only line up vertically at the deployed STAIR angle, so an inserted
straight post BLOCKS the fold (pins the parallelogram). A push-button BALL-LOCK PIN
retains the post. Pull 3 pins + lift the handrail -> linkage free to fold / split / ladder.
Run: uvx --python 3.13 --with "build123d==0.10.0" --with "cadquery-ocp==7.8.1.1.post1" python cad/joint_handrail_lock.py
"""
import sys, pathlib, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import params as P
from build123d import *

OUT = pathlib.Path(r"C:/Users/USER/Desktop/Staircases/idea one/out"); OUT.mkdir(parents=True, exist_ok=True)
TH = P.THETA["STAIR"]; INC = 90 - TH
POST = 40.0                 # 40x40 SHS handrail post
POST_W = 3.0
SLV_BORE = POST + 2.0       # 42 sleeve bore (1mm/side slide clearance)
BALL = 10.0                 # ball-lock pin dia


def xpin(r, h):
    return Rot(0, 90, 0) * Cylinder(r, h)      # axis along world X


def incl_member(outer, wall, length):
    """Centred inclined SHS through the local origin, axis up the stair slope."""
    seg = extrude(Rectangle(outer, outer) - Rectangle(outer-2*wall, outer-2*wall), length/2, both=True)
    return Rot(0, INC, 0) * seg


def sleeve(z, size=60.0, height=80.0):
    """Vertical sleeve at X=0,z, bore for the post; welded look (solid block - bore)."""
    body = Pos(0, 0, z) * Box(size, size, height)
    bore = Pos(0, 0, z) * Box(SLV_BORE, SLV_BORE, height + 4)
    return body - bore


def handrail_post(z0=-70.0, z1=320.0):
    h = z1 - z0
    p = Pos(0, 0, (z0 + z1)/2) * (Box(POST, POST, h) - Box(POST-2*POST_W, POST-2*POST_W, h + 2))
    return p


def ball_lock_pin(z, length=120.0):
    shaft = Pos(0, 0, z) * xpin(BALL/2, length)
    button = Pos(length/2 + 6, 0, z) * xpin(11, 12)          # push button head
    collar = Pos(-(length/2 - 8), 0, z) * xpin(7, 6)          # ball detent collar (simplified)
    return shaft + button + collar


_COL = {"stringer": (0.18, 0.34, 0.62), "control": (0.20, 0.50, 0.28),
        "sleeve": (0.13, 0.13, 0.14), "post": (0.86, 0.70, 0.12), "pin": (0.85, 0.45, 0.12)}


def build(explode=0.0):
    parts = []
    def add(s, label):
        s.label = label
        for k, rgb in _COL.items():
            if k in label:
                s.color = Color(*rgb)
                break
        parts.append(s)
    add(incl_member(*P.SEC_STR, 360), "stringer")            # main stringer through z=0
    add(Pos(0, 0, P.D) * incl_member(*P.SEC_CTL, 360), "control_bar")   # control bar 140 above
    add(sleeve(0.0, 62, 90), "sleeve_stringer")              # sleeve welded to stringer
    add(sleeve(P.D, 52, 70), "sleeve_control")               # sleeve welded to control bar
    post = handrail_post()
    blp = ball_lock_pin(P.D + 95)                            # retains post above the upper sleeve
    if explode:
        post = Pos(0, 0, 230 * explode) * post
        blp = Pos(150 * explode, 0, 0) * blp
    add(post, "post_handrail")
    add(blp, "pin_balllock")
    return Compound(children=parts)


if __name__ == "__main__":
    asm = build()
    bb = asm.bounding_box()
    print("PARTS", [c.label for c in asm.children])
    print("BBOX_mm", [round(bb.size.X,1), round(bb.size.Y,1), round(bb.size.Z,1)])
    print("--- HANDRAIL LOCK VERIFICATION ---")
    print(f"post 40x40 SHS through sleeve bore {SLV_BORE} -> slide clearance {(SLV_BORE-POST)/2:.1f} mm/side")
    print(f"post spans BOTH members: stringer sleeve @z=0 and control sleeve @z={P.D} (vertical span {P.D} mm)")
    print(f"lock principle: sleeves co-vertical ONLY at STAIR {TH:.2f} deg -> inserted post blocks the fold DOF")
    print(f"ball-lock pin Ø{BALL} retains post; 3 such stations per side (all lock)")
    print("VALID", {c.label: c.is_valid for c in asm.children})
    export_step(asm, str(OUT/"joint_handrail.step"))
    export_gltf(asm, str(OUT/"joint_handrail.glb"), binary=True)
    export_gltf(build(explode=1.0), str(OUT/"joint_handrail_exploded.glb"), binary=True)
    print("exports", (OUT/"joint_handrail.glb").exists(), (OUT/"joint_handrail_exploded.glb").exists())
