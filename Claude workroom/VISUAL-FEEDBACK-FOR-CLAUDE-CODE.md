# Visual Feedback — Pixel Hive Current State vs Octopath Target

## Reviewed from live app at localhost:3000 via screenshots

---

## WHAT'S WORKING (Keep)
- Basic layout: office, meeting room, break room, homes, path ✅
- Agent sprites visible with distinct colors ✅
- Name tags below agents with names ✅
- Dashboard panel with 5 tabs ✅
- Header with speed controls, credits meter, Send All Home ✅
- Warm green grass background ✅
- Tudor-style roofs (gold/thatch) on buildings ✅
- Cobblestone path between office and homes ✅
- Agent homes with colored roofs ✅
- Status bar at bottom ✅

---

## CRITICAL ISSUES — Must Fix for HD-2D Look

### 1. NO TILT-SHIFT BLUR (THE #1 missing effect)
**Current**: Entire canvas is uniformly sharp edge-to-edge
**Target**: Top ~20% and bottom ~20% should be blurred with smooth gradient transition
**Impact**: Without this, it looks like a standard pixel game, NOT HD-2D
**Fix**: Implement the multi-canvas tilt-shift from pixel-hive-research/03-POST-PROCESSING-EFFECTS.md

### 2. NO BLOOM / GLOW on lights
**Current**: Windows are flat yellow rectangles. Lamps are plain shapes.
**Target**: Every light source (windows, lamps, monitors) should have soft warm golden glow bleeding beyond its edges
**Fix**: Create emissive offscreen canvas, blur it at 16px, composite with `globalCompositeOperation: "screen"` at alpha 0.5

### 3. NO VOLUMETRIC LIGHT RAYS
**Current**: Windows just sit there flat on walls
**Target**: During morning/afternoon, visible triangular light cones should stream from windows onto the floor
**Fix**: Draw gradient-filled triangles from window positions downward

### 4. NO PARTICLES / DUST MOTES
**Current**: No atmospheric elements at all — scene feels static
**Target**: ~30 warm golden dust motes floating slowly upward, catching light
**Fix**: Simple particle array with upward drift and gentle sway

### 5. NO VIGNETTE
**Current**: Canvas edges are same brightness as center
**Target**: Dark gradual fade at corners and edges (radial gradient overlay)

### 6. BUILDINGS TOO FLAT — Need 3D Depth
**Current**: Buildings are simple rectangles with triangular roofs. Walls are plain beige.
**Target**:
- Visible timber frame (dark brown beams forming X patterns on plaster walls)
- Wall texture: plaster between beams should have subtle variation
- Visible foundation/base with stone texture
- Flower boxes under windows
- Small lanterns near doors
- Chimney with smoke particles on main office

### 7. GROUND TOO UNIFORM
**Current**: Grass is a flat checkerboard of 2 green shades. Cobblestones are uniform.
**Target**:
- Grass should have random darker/lighter tufts, small flowers (yellow, white, purple), mushrooms, pebbles
- Cobblestone should have irregular rounded stones with dark mortar gaps
- Wood floors inside should show plank lines and grain highlights

### 8. TREES ARE TOO SIMPLE
**Current**: Basic circular green blobs
**Target**: 3-layer foliage (dark base, medium middle, bright highlights), visible bark trunk, shadow pool underneath. Mix of tree shapes (round, conical, spreading).

### 9. MOUSE WHEEL ZOOM NOT WORKING
**Current**: Scroll wheel just scrolls the page, doesn't zoom the canvas
**Target**: Mouse wheel over canvas should zoom in/out centered on cursor (0.5x to 4x range)
**Fix**: Add `wheel` event listener with `e.preventDefault()` and camera transform. See pixel-hive-research/02-ZOOM-PAN-CAMERA-SYSTEM.md

### 10. NO PAN WITH SHIFT+DRAG
**Current**: Can't move around the world
**Target**: Shift+click+drag to pan the camera. Middle-click+drag also pans.

### 11. NO DOUBLE-CLICK TO ZOOM ON AGENT
**Current**: Left-click selects agent (good), but no zoom-to behavior
**Target**: Double-click agent → smooth zoom to 2.5x centered on them. Double-click empty → reset to default view.

### 12. NO TIME-OF-DAY COLOR GRADING
**Current**: Scene looks the same at all times
**Target**: Morning = warm amber tint, Afternoon = neutral, Evening = cool blue-purple tint. Full-screen overlay that cycles.

---

## PRIORITY ORDER

Implement in this order for maximum visual impact:

1. **Tilt-shift blur** — instant HD-2D transformation
2. **Bloom on lights** — makes scene feel alive
3. **Vignette** — adds cinematic depth
4. **Mouse wheel zoom** + shift-drag pan — user interaction
5. **Particles / dust motes** — atmospheric life
6. **Volumetric light rays** — dramatic warmth
7. **Time-of-day color grading** — day/night cycle
8. **Ground detail** — grass tufts, flowers, irregular stones
9. **Building detail** — timber frames, flower boxes, lanterns
10. **Tree detail** — layered foliage, bark, shadow pools
11. **Double-click zoom on agents** — inspection feature
12. **Dashboard click → camera follow** — agent tracking

---

## IMPLEMENTATION REFERENCE FILES

All code implementations are ready in the research folder:
- `pixel-hive-research/02-ZOOM-PAN-CAMERA-SYSTEM.md` — Full camera system with code
- `pixel-hive-research/03-POST-PROCESSING-EFFECTS.md` — Tilt-shift, bloom, light rays, vignette code
- `PIXEL-HIVE-VISUAL-OVERHAUL.md` — Complete spec with palette, building style, agent design
