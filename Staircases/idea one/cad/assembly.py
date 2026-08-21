"""FULL UNIT assembly - the whole folding self-leveling staircase at TRUE positions.
build123d (mm). Master-spec coordinate frame: O_M=(0,y,0); P_M_i=(300i,y,200i);
P_C_i=P_M_i+(0,0,140). Four stringer planes y=30/1142/1208/2320 (seam y=1175).
Each part placed by the theta-pose transform - never at origin. Critic fixes applied.
Run: uvx --python 3.13 --with "build123d==0.10.0" --with "cadquery-ocp==7.8.1.1.post1" python cad/assembly.py
"""
import sys, pathlib, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import params as P
from build123d import *

OUT = pathlib.Path(r"C:/Users/USER/Desktop/Staircases/idea one/out"); OUT.mkdir(parents=True, exist_ok=True)
TH = P.THETA["STAIR"]
C, S = math.cos(math.radians(TH)), math.sin(math.radians(TH))
INC = 90 - TH
L, D = P.L, P.D
TREAD_LEN = L - 10.0          # tread depth: treads nearly touch at FLAT (10mm movement gap) -> locks into a floor;
#                              at stair pitch the extra over the 300 going simply reads as nosing overhang.
PIN, BUSH_OD = 16.0, 20.0
PLANES = [30.0, 1142.0, 1208.0, 2320.0]          # web centerlines (A_out, A_in, B_in, B_out)
SEAM = 1175.0
COL = {"stringer": (0.16, 0.32, 0.60), "control": (0.18, 0.48, 0.27), "carrier": (0.66, 0.66, 0.69),
       "pin": (0.55, 0.56, 0.60), "sleeve": (0.10, 0.10, 0.11), "base": (0.09, 0.09, 0.10),
       "leg": (0.11, 0.11, 0.12), "grating": (0.05, 0.05, 0.06), "grip": (0.10, 0.10, 0.11),
       "rail": (0.04, 0.04, 0.045), "rope": (0.50, 0.38, 0.20), "post": (0.04, 0.04, 0.045)}


def P_M(i, y): return (300.0 * i, y, 200.0 * i)
def P_C(i, y): return (300.0 * i, y, 200.0 * i + D)
def on_str(s, y): return (s * C, y, s * S)


def member(o, s0, s1, outer, wall):
    seg = extrude(Rectangle(outer, outer) - Rectangle(outer - 2*wall, outer - 2*wall), s1 - s0)
    return Pos(*o) * Rot(0, INC, 0) * Pos(0, 0, s0) * seg

def ybore(r, h=200.0): return Rot(-90, 0, 0) * Cylinder(r, h)
def vbore(r, h=200.0): return Cylinder(r, h)


def carrier(i, y, master=False):
    """Compact self-leveling bracket: a vertical plate spanning the two pivots (lives BETWEEN the
    blue/green rails) + a small seat that tucks HIDDEN directly under the grating. No protruding shelf."""
    c = Pos(0, 0, D/2) * Box(70, 16, D + 40)                 # leveling plate (hidden between the rails)
    c = c + Pos(0, 0, -6) * Box(TREAD_LEN - 30, 60, 16)      # seat tucked under & centered on the grating
    c = c - ybore(BUSH_OD/2, 60)                             # lower pivot bore (P_M)
    up = ybore(BUSH_OD/2, 60) if master else (Pos(0, 0, 0.8)*ybore(BUSH_OD/2, 60) + Pos(0, 0, -0.8)*ybore(BUSH_OD/2, 60))
    c = c - Pos(0, 0, D) * up                                # upper pivot bore (P_C)
    return Pos(*P_M(i, y)) * c


def pin_at(p, length=90):
    return Pos(*p) * (Rot(-90, 0, 0) * Cylinder(PIN/2, length)) + Pos(p[0], length/2 + 5, p[2]) * (Rot(-90, 0, 0) * Cylinder(12, 7))


def base_bracket(y):
    b = Pos(-10, y, -22) * Box(120, 90, 24) + Pos(-10, y, 60) * Box(60, 90, 180)
    return b - ybore(BUSH_OD/2, 240) - Pos(0, 0, D) * ybore(BUSH_OD/2, 240)


def detent_plate(y):
    plate = Pos(0, y + 30, 0) * (Rot(-90, 0, 0) * extrude(Circle(190) - Circle(150), 10))
    holes = None
    for ang in (0.0, TH, 75.0):
        a = math.radians(ang); hp = (180*math.cos(a), y + 36, 180*math.sin(a))
        h = Pos(*hp) * ybore(5.0, 20); holes = h if holes is None else holes + h
    return plate - holes


def sleeve(p, kind):
    s = Pos(*p) * Box(60, 60, 90) - Pos(*p) * vbore(21, 100)
    if kind == "S":
        s = s - Pos(p[0], p[1], p[2] + 30) * ybore(5, 80)
    return s


def leg_socket(y):
    p = P_M(5, y)
    return Pos(p[0], y, p[2] - 150) * Box(64, 64, 300) - Pos(p[0], y, p[2] - 150) * Box(42, 42, 320)


def leg_inner(y, node=5):
    p = P_M(node, y)
    tube = Pos(p[0], y, p[2]/2) * (Box(40, 40, p[2] + 40) - Box(34, 34, p[2] + 44))
    foot = Pos(p[0], y, -4) * Box(100, 100, 8)
    return tube + foot


def grating(i, y0, y1):
    x = 300.0 * i
    z0 = 200.0 * i
    yc, wy = (y0 + y1)/2, (y1 - y0)
    return Pos(x, yc, z0 + 20) * Box(TREAD_LEN, wy, 40)    # long tread -> tiles into a floor when flat


def grips(i, y0, y1):
    """Small anti-slip GRIP ridges on top of the tread (so each step is a usable rung in ladder mode)."""
    x = 300.0 * i; z0 = 200.0 * i
    yc, wy = (y0 + y1)/2, (y1 - y0)
    g = None
    for gx in (-TREAD_LEN*0.32, 0.0, TREAD_LEN*0.32):
        r = Pos(x + gx, yc, z0 + 40 + 3) * Box(16, wy - 30, 8)
        g = r if g is None else g + r
    return g


HR_POSTH = 1000.0
HR_STATIONS = (0.5*L, 4.5*L)        # 2 posts per handrail (bottom + top)


def handrail_weldment(y):
    """3 posts (each a SEPARATE foldable part) + the rail+grip ROD. The posts hinge at their tops
    and fold into the rail to become one long rod. Returns (shape, label, group_suffix)."""
    parts = []
    tops = []
    for k, s in enumerate(HR_STATIONS, 1):
        b = on_str(s, y); base_z = b[2] + 45
        post = Pos(b[0], y, base_z + HR_POSTH/2) * (Box(40, 40, HR_POSTH) - Box(34, 34, HR_POSTH + 4))
        parts.append((post, f"hr_post{k}", f"hrpost{k}"))
        tops.append((b[0], y, base_z + HR_POSTH))
    mid = ((tops[0][0] + tops[-1][0])/2, y, (tops[0][2] + tops[-1][2])/2)
    span = math.dist((tops[0][0], tops[0][2]), (tops[-1][0], tops[-1][2])) + 80
    rake = Rot(0, (90 - TH), 0)
    parts.append((Pos(*mid) * rake * Box(42, 42, span), "hr_rail", "hrrail"))
    parts.append((Pos(mid[0], y, mid[2] + 30) * rake * Cylinder(18, span), "rope_grip", "hrrail"))
    return parts


def plane_parts(p, y, outer):
    """Returns list of (shape, label, GROUP). Group = the bone the part is driven by."""
    g_str, g_ctl, g_base = f"p{p}_str", f"p{p}_ctl", f"p{p}_base"
    out = [(member((0, y, 0), -100, 1822, *P.SEC_STR), "stringer", g_str),
           (member((0, y, D), -60, 1822, *P.SEC_CTL), "control_bar", g_ctl),
           (base_bracket(y), "base_bracket", g_base)]
    for i in range(1, 6):
        out.append((carrier(i, y, master=(i == 3)), f"carrier_{i}", f"p{p}_car{i}"))
    for tag, pp in [("OM", (0, y, 0))] + [(f"M{i}", P_M(i, y)) for i in range(1, 6)]:
        out.append((pin_at(pp, 130 if tag == "OM" else 110), f"pin_{tag}", g_str))   # lower pins ride stringer
    for tag, pp in [("OC", (0, y, D))] + [(f"C{i}", P_C(i, y)) for i in range(1, 6)]:
        out.append((pin_at(pp, 130 if tag == "OC" else 110), f"pin_{tag}", g_ctl))   # upper pins ride ctrlbar
    for k, s in enumerate((0.5*L, 2.5*L, 4.5*L), 1):
        out.append((sleeve(on_str(s, y), "S"), f"sleeve_S{k}", g_str))
        out.append((sleeve((on_str(s, y)[0], y, on_str(s, y)[2] + D), "C"), f"sleeve_C{k}", g_ctl))
    out.append((leg_inner(y, 5), "leg", f"p{p}_leg"))     # back leg on EVERY plane (inner p1/p2 gated by stash in the rig)
    return out


def all_items():
    items = []
    for p, y in enumerate(PLANES):
        items += plane_parts(p, y, outer=(y in (30.0, 2320.0)))
    for i in range(1, 6):                                          # gratings + grips ride the outer carrier; seam closed -> tight floor
        items.append((grating(i, 60, 1170), f"grating_A{i}", f"p0_car{i}"))
        items.append((grips(i, 60, 1170), f"grip_A{i}", f"p0_car{i}"))
        items.append((grating(i, 1180, 2290), f"grating_B{i}", f"p3_car{i}"))
        items.append((grips(i, 1180, 2290), f"grip_B{i}", f"p3_car{i}"))
    for p, y in enumerate(PLANES):                                 # handrails on ALL planes (inner p1/p2 gated by stash in the rig)
        for sh, lb, suf in handrail_weldment(y):
            items.append((sh, lb, f"p{p}_{suf}"))
    return items                                                   # couplers removed (the floating orange cubes)


def _styled(shape, label):
    if type(shape).__name__ == "ShapeList":
        shape = Part() + list(shape)
    shape.label = label
    for k, rgb in COL.items():
        if k in label:
            shape.color = Color(*rgb); break
    return shape


def build_full():
    return Compound(children=[_styled(sh, lb) for sh, lb, g in all_items()])


def build_groups():
    from collections import defaultdict
    import json
    gd = defaultdict(list)
    for sh, lb, g in all_items():
        gd[g].append(_styled(sh, lb))
    gdir = OUT/"groups"; gdir.mkdir(exist_ok=True)
    for old in gdir.glob("*.glb"):
        old.unlink()                                  # wipe stale group files so removed parts don't linger
    centers = {}
    for g, shapes in gd.items():
        comp = Compound(children=shapes)
        export_gltf(comp, str(gdir/(g + ".glb")), binary=True)
        bb = comp.bounding_box()
        ctr = (bb.min + bb.max) * 0.5
        centers[g] = [round(ctr.X, 2), round(ctr.Y, 2), round(ctr.Z, 2)]
    (OUT/"groups_centers.json").write_text(json.dumps(centers))
    return centers


if __name__ == "__main__":
    asm = build_full()
    bb = asm.bounding_box()
    print("N_PARTS", len(asm.children), " BBOX_mm", [round(bb.size.X, 1), round(bb.size.Y, 1), round(bb.size.Z, 1)],
          " VALID", all(c.is_valid for c in asm.children))
    export_gltf(asm, str(OUT/"full.glb"), binary=True)
    centers = build_groups()
    print("N_GROUPS", len(centers), "exported to out/groups/")
