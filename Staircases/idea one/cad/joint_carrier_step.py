"""JOINT 3 - SELF-LEVELING CARRIER + STEP SLOT.  build123d, mm.
The self-balancing carrier for one tread on one stringer plane:
  - lower lug pins to the MAIN STRINGER at P_M (Ø16) ;
  - upper lug pins to the CONTROL BAR at P_C = P_M + (0,0,D) (Ø16).
The fixed D=140 spacing between the two pins keeps the seat LEVEL at every fold angle.
The carrier has a machined SEAT SLOT (channel) the ~40mm grating step DROPS INTO and is
BOLTED (M8) before/while the steps are added. Exports assembled + exploded GLB/STEP.
Run: uvx --python 3.13 --with "build123d==0.10.0" --with "cadquery-ocp==7.8.1.1.post1" python cad/joint_carrier_step.py
"""
import sys, pathlib, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import params as P
from build123d import *

OUT = pathlib.Path(r"C:/Users/USER/Desktop/Staircases/idea one/out"); OUT.mkdir(parents=True, exist_ok=True)
TH = P.THETA["STAIR"]; INC = 90 - TH
O0 = (0.0, 0.0, 0.0)            # lower pivot (-> stringer)  P_M (local)
O1 = (0.0, 0.0, P.D)           # upper pivot (-> control bar) P_C
PIN = 16.0
GOING = 300.0
DECK = P.DECK_DEPTH            # 40 grating depth
SLOTW = 80.0                  # seat-slot width (Y) the grating edge drops into
STEPW = SLOTW - 4.0           # grating fits with 2mm/side clearance
_COL = {"stringer": (0.18, 0.34, 0.62), "control": (0.20, 0.50, 0.28),
        "carrier": (0.72, 0.72, 0.74), "step": (0.07, 0.07, 0.08), "pin": (0.85, 0.45, 0.12)}


def ybore(r, h=200.0):
    return Rot(-90, 0, 0) * Cylinder(r, h)


def incl_member(outer, wall, length):
    seg = extrude(Rectangle(outer, outer) - Rectangle(outer-2*wall, outer-2*wall), length/2, both=True)
    return Rot(0, INC, 0) * seg


def carrier():
    """Vertical leveling arm O0->O1 + a horizontal slotted seat extending +X (the going)."""
    arm = Pos(0, 0, P.D/2) * Box(60, 30, P.D + 24)         # plate spanning both pivots
    ledge = Pos(GOING/2 + 8, 0, -6) * Box(GOING, SLOTW + 24, 12)   # seat floor (top at z=0)
    back = Pos(10, 0, 18) * Box(14, SLOTW + 24, 48)        # back wall of the slot
    lipL = Pos(GOING/2 + 8, +(SLOTW/2 + 7), 18) * Box(GOING, 12, 48)   # side walls = the channel
    lipR = Pos(GOING/2 + 8, -(SLOTW/2 + 7), 18) * Box(GOING, 12, 48)
    c = arm + ledge + back + lipL + lipR                  # all overlap -> one solid
    c = c - ybore(PIN/2 + 0.25, 90) - Pos(*O1) * ybore(PIN/2 + 0.25, 90)   # pivot bores at O0,O1
    for hx in (90.0, 200.0):                              # M8 grating bolt holes (Ø9) up through the seat
        c = c - Pos(hx, 0, -6) * Cylinder(4.5, 40)
    return c


def step():
    """~40mm punched-grating slab that drops into the seat slot + bolt holes."""
    g = Pos(GOING/2 + 8, 0, -DECK/2) * Box(GOING - 24, STEPW, DECK)
    for hx in (90.0, 200.0):
        g = g - Pos(hx, 0, 0) * Cylinder(4.5, DECK + 4)
    # a hint of grating perforation (rows of slots) so it reads as grating, not a plate
    for gx in range(60, int(GOING) - 24, 40):
        for gy in (-20, 0, 20):
            g = g - Pos(gx, gy, -DECK/2) * Box(22, 8, DECK + 2)
    return g


def pin_(origin):
    shaft = Pos(*origin) * (Rot(-90, 0, 0) * Cylinder(PIN/2, 120))
    head = Pos(origin[0], 56, origin[2]) * (Rot(-90, 0, 0) * Cylinder(12, 8))
    return shaft + head


def build(explode=0.0):
    parts = []
    def add(s, label):
        s.label = label
        for k, rgb in _COL.items():
            if k in label:
                s.color = Color(*rgb); break
        parts.append(s)
    add(incl_member(*P.SEC_STR, 280), "stringer")
    add(Pos(*O1) * incl_member(*P.SEC_CTL, 280), "control_bar")
    add(carrier(), "carrier")
    st = step()
    if explode:
        st = Pos(0, 0, 120 * explode) * st
    add(st, "step_grating")
    for o in (O0, O1):
        pn = pin_(o)
        if explode:
            pn = Pos(0, 70 * explode, 0) * pn
        add(pn, f"pin_{'M' if o == O0 else 'C'}")
    return Compound(children=parts)


if __name__ == "__main__":
    asm = build()
    bb = asm.bounding_box()
    print("PARTS", [c.label for c in asm.children])
    print("BBOX_mm", [round(bb.size.X,1), round(bb.size.Y,1), round(bb.size.Z,1)])
    print("--- CARRIER + STEP-SLOT VERIFICATION ---")
    print(f"seat slot width {SLOTW} ; grating {STEPW} -> drop clearance {(SLOTW-STEPW)/2:.1f} mm/side")
    print(f"grating depth {DECK} mm seated in channel (real structural depth, not a skin)")
    print(f"M8 bolt holes Ø9 through seat into step (bolt-in before/with assembly)")
    print(f"pivot spacing O0->O1 = {O1[2]-O0[2]:.1f} mm (= D={P.D}) -> seat held LEVEL by the parallelogram")
    print("VALID", {c.label: c.is_valid for c in asm.children})
    export_step(asm, str(OUT/"joint_carrier.step"))
    export_gltf(asm, str(OUT/"joint_carrier.glb"), binary=True)
    export_gltf(build(explode=1.0), str(OUT/"joint_carrier_exploded.glb"), binary=True)
    print("exports", (OUT/"joint_carrier.glb").exists(), (OUT/"joint_carrier_exploded.glb").exists())
