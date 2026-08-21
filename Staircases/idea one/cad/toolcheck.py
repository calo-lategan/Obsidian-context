"""Toolchain de-risk: confirm build123d can do everything the staircase needs:
boolean cut (bolt holes / slots), fillet, STEP + GLB export, and a 2D drawing (SVG).
Run:  uvx --from build123d python cad/toolcheck.py
"""
import pathlib
from build123d import (Box, Cylinder, Pos, Plane, fillet, export_step, export_gltf,
                       export_stl)

OUT = pathlib.Path(r"C:/Users/USER/Desktop/Staircases/idea one/out")
OUT.mkdir(parents=True, exist_ok=True)

# a tread-carrier-like test part: bar with a machined slot + 2 bolt holes + a fillet
bar = Box(120, 60, 40)
slot = Pos(0, 0, 12) * Box(90, 40, 20)            # pocket / cut-out for the step
hole1 = Pos(-35, 0, 0) * Cylinder(4, 60)          # bolt hole
hole2 = Pos(35, 0, 0) * Cylinder(4, 60)
part = bar - slot - hole1 - hole2
# round the top outer edges
top_edges = part.edges().filter_by_position(Plane.XY, 19.9, 20.1)
try:
    part = fillet(top_edges, radius=3)
    filleted = True
except Exception as e:
    filleted = f"fillet-skip: {e}"

bb = part.bounding_box()
report = {
    "volume_mm3": round(part.volume, 1),
    "size_mm": [round(bb.size.X, 2), round(bb.size.Y, 2), round(bb.size.Z, 2)],
    "n_faces": len(part.faces()),
    "n_edges": len(part.edges()),
    "filleted": filleted,
}

# exports
export_step(part, str(OUT / "toolcheck.step")); report["step"] = (OUT / "toolcheck.step").exists()
export_gltf(part, str(OUT / "toolcheck.glb"), binary=True); report["glb"] = (OUT / "toolcheck.glb").exists()
export_stl(part, str(OUT / "toolcheck.stl")); report["stl"] = (OUT / "toolcheck.stl").exists()

# 2D drawing (SVG) -- try the section approach, then fall back to silhouette
svg_ok = None
try:
    from build123d import ExportSVG, LineType
    section = part.section(Plane.XZ)              # cross-section face(s)
    svg = ExportSVG()
    svg.add_shape(section)
    svg.write(str(OUT / "toolcheck_section.svg"))
    svg_ok = "section " + str((OUT / "toolcheck_section.svg").exists())
except Exception as e:
    svg_ok = f"section-fail: {e}"
    try:
        from build123d import ExportSVG
        svg = ExportSVG()
        svg.add_shape(part)                        # silhouette fallback
        svg.write(str(OUT / "toolcheck_silhouette.svg"))
        svg_ok += " | silhouette ok"
    except Exception as e2:
        svg_ok += f" | silhouette-fail: {e2}"
report["svg"] = svg_ok

print("TOOLCHECK", report)
