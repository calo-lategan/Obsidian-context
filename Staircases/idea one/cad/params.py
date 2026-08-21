"""Locked parameters + parallelogram math for the folding self-leveling stair.
Single source of truth (mm, build123d units). Geometry rebuilt from these.
"""
import math

# --- core stair geometry (mm) ---
RISER = 200.0
GOING = 300.0
PLATFORM = 600.0           # top landing going
N = 5                      # cells: i=1..4 steps + i=5 landing
L = math.hypot(GOING, RISER)            # 360.555 mm leg length
THETA = {"FLAT": 0.0,
         "STAIR": math.degrees(math.atan2(RISER, GOING)),   # 33.69
         "LADDER": 75.0}
D = 140.0                  # control-bar vertical pivot offset (clash-gated)

# --- width / modularity ---
WIDTH = 2350.0
HALF = 1175.0

# --- sections (outer, wall) mm ---
SEC_STR = (60.0, 4.0)      # main stringer SHS
SEC_CTL = (40.0, 3.0)      # control bar SHS
SEC_LEG_OUT = (50.0, 4.0)  # rear leg outer socket
SEC_LEG_IN = (40.0, 3.0)   # rear leg inner
SEC_HR = (40.0, 3.0)       # handrail post/socket
DECK_DEPTH = 40.0          # punched grating structural depth
PIN16 = 16.0               # main pivot pin dia
PIN10 = 10.0               # handrail/leg lock pin dia
BUSH_OD = 24.0             # nylon bush OD

# handrail socket stations along the stringer axis (s = along-incline distance)
HR_STATIONS = [0.5 * L, 2.5 * L, 4.5 * L]   # front / mid / back


def u_dir(theta_deg):
    """Unit vector up the stringer incline in the X-Z plane."""
    t = math.radians(theta_deg)
    return (math.cos(t), 0.0, math.sin(t))


def P_M(i, theta_deg):
    """Main-stringer node i (lower pivot of carrier i)."""
    c, _, s = u_dir(theta_deg)
    return (i * L * c, 0.0, i * L * s)


def P_C(i, theta_deg):
    """Control-bar node i (upper pivot of carrier i) = P_M + (0,0,D)."""
    x, y, z = P_M(i, theta_deg)
    return (x, y, z + D)
