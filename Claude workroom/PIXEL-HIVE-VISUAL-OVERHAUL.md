# Pixel Hive — Visual Overhaul Specification (Phase 1)

## Copy this entire prompt into Claude Code to execute.

---

## CONTEXT

You are implementing the visual overhaul of **Pixel Hive** — transforming it from a dark sci-fi pixel office into an **Octopath Traveler HD-2D style** warm fantasy village workspace. This is the #1 priority. The current prototype uses a React JSX file with HTML5 Canvas. Your job is to rewrite the rendering to achieve the HD-2D diorama look.

Read the project skill first:
```
cat pixel-hive/SKILL.md
```

## WHAT MAKES HD-2D LOOK LIKE HD-2D

The Octopath Traveler HD-2D style has 6 essential ingredients. Missing ANY of them breaks the illusion:

### 1. Tilt-Shift Depth of Field (THE signature effect)
- Strong gaussian blur on top ~20% and bottom ~20% of viewport
- Sharp focus band in the center ~60% where gameplay happens
- Creates a "diorama" / "miniature" feel — like looking at a tiny model
- Implementation: Use `ctx.filter = "blur(Npx)"` on offscreen canvases, composite with gradient mask
- Top blur should be stronger (6-8px) than bottom blur (4-6px)
- The transition from sharp to blurry should be GRADUAL (feathered), not a hard line

### 2. Bloom and Glow on ALL Light Sources
- Every light source gets a warm golden bloom: windows, lanterns, monitors, lamps
- Implementation: Draw light sources to a separate "emissive" offscreen canvas, apply gaussian blur (12-20px radius), composite with `globalCompositeOperation = "screen"` or `"lighter"`
- Bloom color should be warm (#ffe4b5, #ffdd88) for interior lights
- Monitor screens get colored bloom matching their screen color
- The bloom should spill beyond the light source boundaries — that overflow IS the effect

### 3. Warm Earth Tone Palette (NOT dark sci-fi)
```
Background/Sky:     #4a6741, #5a7a52, #3d5a35 (deep forest greens)
Stone/Buildings:    #c4a882, #a8946e, #8b7a5e (warm sandstone)
Wood/Timber:        #6b4e32, #8b6914, #5a3a1e (rich browns)
Roofs:              #b8860b, #8b6914, #a07030 (thatch/tile gold-brown)
Grass:              #4a8b3a, #3a7a2a, #5a9b4a, #2d6420 (varied greens)
Paths:              #8b7a5e, #a89070, #7a6a4e (dirt/cobblestone)
Interior Floors:    #8b7355, #a08868, #7a6348 (warm wood planks)
Light/Glow:         #ffdd88, #ffcc66, #ffe4b5 (warm golden)
Night Accents:      #4466aa, #3355aa (cool blue contrast)
Foliage Shadow:     #2a4a1a, #1a3a0a (deep green shadows)
```

CRITICAL: The old palette was `#0c0e1a`, `#2a2440`, `#231f3a` — dark purples and blues.
The NEW palette is earth, wood, stone, green. Think medieval European village, not spaceship.

### 4. 3/4 Top-Down Perspective (NOT flat)
- Buildings show their front face AND top/roof — slight isometric angle
- Objects have visible "thickness" — desks show their top surface AND front edge
- Shadows cast DOWN and to the RIGHT (consistent light from upper-left)
- Floor tiles have subtle 3D beveling — lighter edge on top/left, darker on bottom/right
- Buildings sit ON the ground, not flat IN it — visible foundation/base shadow

### 5. Rich Environmental Detail
- Ground is NOT uniform — grass has tufts, dirt has pebbles, stone has cracks
- Trees have layered foliage (dark base, medium mid, bright highlights)
- Buildings have texture: visible brick/wood grain, window frames, flower boxes
- Scattered props: barrels, crates, well, signposts, benches, hay bales
- Flowers and small plants along paths and building edges
- Ambient nature: butterflies, birds, or floating particles

### 6. Atmospheric Particles and Volumetric Light
- Dust motes floating gently upward (warm gold in day, cool blue at night)
- Light rays through windows — triangular glow cones on the floor
- Fireflies at evening
- Gentle fog/haze at the edges of the scene
- Snow or rain particles for weather variety (optional, later)

---

## RENDERING PIPELINE (Layer Stack)

Render in this EXACT order, bottom to top:

```
1. SKY GRADIENT — soft gradient background (greens/blues based on time)
2. FAR BACKGROUND — distant blurred trees/mountains (pre-blurred, parallax-shifted)
3. GROUND LAYER — grass, dirt, cobblestone with pixel-level detail
4. GROUND DECORATIONS — grass tufts, flowers, pebbles, puddles
5. BUILDING SHADOWS — dark ellipses/rectangles under all structures
6. BUILDINGS/FURNITURE — Tudor-style offices, meeting room, break room
7. BUILDING DECORATIONS — flower boxes, signs, barrels, crates
8. AGENT SHADOWS — soft ellipses under each character
9. AGENT SPRITES — Y-sorted for depth (lower Y = behind)
10. AGENT UI — speech bubbles, name tags, status icons
11. FOREGROUND ELEMENTS — close bushes/trees (slightly blurred for depth)
12. PARTICLE LAYER — dust motes, light rays, fireflies
13. EMISSIVE/BLOOM PASS — extract bright pixels, blur, composite as "screen"
14. TILT-SHIFT DOF — blur top 20% and bottom 20% with feathered gradient
15. VIGNETTE — dark corners, radial gradient
16. TIME-OF-DAY COLOR GRADING — warm morning, neutral afternoon, cool evening
17. HUD/UI OVERLAY — clock, labels, controls
```

## IMPLEMENTATION APPROACH

### Offscreen Canvas Strategy
Use 3 offscreen canvases for the post-processing:

```javascript
// Main scene canvas (full resolution)
const sceneCanvas = document.createElement('canvas');
const sceneCtx = sceneCanvas.getContext('2d');

// Emissive/bloom canvas (half resolution for performance)
const bloomCanvas = document.createElement('canvas');
const bloomCtx = bloomCanvas.getContext('2d');

// Final composite canvas (the one the user sees)
const finalCanvas = canvasRef.current;
const finalCtx = finalCanvas.getContext('2d');
```

### Tilt-Shift Implementation
```javascript
function applyTiltShift(ctx, sourceCanvas, width, height) {
  // Draw sharp center
  ctx.drawImage(sourceCanvas, 0, 0);

  // Create blurred version
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext('2d');
  blurCtx.filter = 'blur(6px)';
  blurCtx.drawImage(sourceCanvas, 0, 0);

  // Composite blurred top band with gradient mask
  ctx.save();
  const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.3);
  topGrad.addColorStop(0, 'rgba(255,255,255,1)');
  topGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, height * 0.3);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(blurCanvas, 0, 0);
  ctx.restore();

  // Same for bottom band
  ctx.save();
  const botGrad = ctx.createLinearGradient(0, height * 0.7, 0, height);
  botGrad.addColorStop(0, 'rgba(255,255,255,0)');
  botGrad.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, height * 0.7, width, height * 0.3);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(blurCanvas, 0, 0);
  ctx.restore();
}
```

### Bloom Implementation
```javascript
function applyBloom(finalCtx, sceneCanvas, bloomCanvas, width, height) {
  // bloomCanvas already has only bright/emissive pixels drawn to it
  // Apply blur to bloom canvas
  const blurred = document.createElement('canvas');
  blurred.width = width / 2; // Half-res for performance
  blurred.height = height / 2;
  const bCtx = blurred.getContext('2d');
  bCtx.filter = 'blur(12px)';
  bCtx.drawImage(bloomCanvas, 0, 0, width / 2, height / 2);

  // Composite onto final with additive blending
  finalCtx.save();
  finalCtx.globalCompositeOperation = 'screen';
  finalCtx.globalAlpha = 0.6;
  finalCtx.drawImage(blurred, 0, 0, width, height);
  finalCtx.restore();
}
```

---

## BUILDING STYLE — Tudor/Medieval Office

### Main Office Building (the workspace)
- Half-timber frame: dark brown (#5a3a1e) timber beams visible on sandstone (#c4a882) plaster walls
- Pitched roof with thatch/tile texture in gold-brown (#b8860b)
- Multiple small windows with warm golden glow leaking out
- Visible door with wooden frame and small lantern above
- Flower boxes under windows with red/purple/white flowers
- Foundation: darker stone base (#8b7a5e) with visible block lines
- Chimney with subtle smoke particles

### Meeting Room (separate smaller building or wing)
- Same Tudor style but with a round table visible through open front
- Large window/opening showing interior
- Presentation board visible inside
- Lanterns on either side of entrance

### Break Room (cozy corner or separate hut)
- More rustic: thatched roof, lower walls
- Coffee cart visible (wooden cart with steam particles)
- Benches and a small garden area
- Warmer lighting (more lanterns, candle glow)

### Agent Homes (small cottages along a path)
- Each home gets a unique color accent (roof or door matches agent color)
- Tiny 2-tile cottages with pitched roofs
- Small garden or unique decoration per agent
- Warm window glow when occupied

---

## GROUND AND ENVIRONMENT

### Grass Areas
- Base green with random darker/lighter tufts
- Small flowers scattered: yellow (#ffdd44), white (#eeeedd), purple (#aa66cc)
- Occasional mushrooms, rocks, twigs
- Grass at building edges grows taller/wilder

### Cobblestone Paths
- Irregular rounded stone shapes (not uniform grid)
- Varying stone colors: #8b7a5e, #a89070, #7a6a4e, #9a8a6e
- Dark gaps between stones (#4a4030)
- Worn patches in high-traffic areas (lighter color)

### Trees
- 3-layer foliage: dark bottom (#1a4a1a), medium middle (#3a7a2a), bright top (#5a9b4a)
- Visible trunk with bark texture
- Shadow pool beneath each tree
- Different tree shapes: round, tall pine, spreading oak
- Place along edges and as natural barriers

### Water (optional, adds beauty)
- Small pond or stream near break room
- Animated reflection shimmer
- Lily pads, cattails at edges

---

## CHARACTER SPRITES — Warm Fantasy Style

Each agent should look like an Octopath Traveler NPC:

- 16x24px base rendered at 3x scale (48x72 on screen)
- Warm skin tones (not the cold grays of the old palette)
- Clothing matches their role color but in warm/muted versions
- Hair is distinct per character (unique style + color)
- Each has a small accessory: Chief's crown, Apex's goggles, Archie's glasses, etc.
- Idle: gentle breathing bob (1-2px up/down over 2 seconds)
- Walking: 4-frame leg cycle with arm swing
- Working: typing animation (hands moving on desk)
- Shadow: soft dark ellipse beneath, size varies with light direction

### Agent Roster Colors (UPDATED for warm palette)
```
Chief   — Gold crown, red-brown cape:   primary #d4a020, accent #8b6914
Apex    — Blue-steel goggles:           primary #5a8aaa, accent #3a6a8a
Archie  — Rose-pink scarf:              primary #c46a8a, accent #a04a6a
Pixel   — Forest-green apron:           primary #4a9a5a, accent #2a7a3a
Bugsy   — Rust-red vest:                primary #b84a3a, accent #8a3a2a
Palette — Lavender beret:               primary #9a6aaa, accent #7a4a8a
Sage    — Amber robes:                  primary #c8922a, accent #a07020
Forge   — Copper tool belt:             primary #b87a4a, accent #8a5a2a
Tempo   — Silver-blue pocket watch:     primary #7a8a9a, accent #5a6a7a
Recall  — Sage-green journal:           primary #7a9a6a, accent #5a7a4a
```

---

## AGENT NAME TAGS AND VISUAL IDENTITY (MANDATORY)

Every agent MUST have a visible floating name tag and role indicator above their head at all times. This is non-negotiable — the user must be able to identify who is who at a glance.

### Name Tag Design
```
┌─────────────────┐
│  👑 Chief  Lv.3 │  ← emoji + name + level, on a semi-transparent dark pill
└────────┬────────┘
         │  ← thin line connecting to agent head
     [status icon]  ← working/meeting/break/learning icon in a small bubble
         │
     ┌───────┐
     │ agent │  ← the pixel character sprite
     │ body  │
     └───┬───┘
    ───────────  ← shadow ellipse
```

Implementation details:
- **Name pill**: semi-transparent dark background (#00000099), rounded corners, agent-colored text
- **Contents**: emoji (left) + name (center) + "Lv.N" (right, in gold #d4a020)
- **Status bubble**: smaller pill below name showing current activity icon (💻/🗣/☕/📖/🚶/💤)
- **Visibility**: ALWAYS visible, even when zoomed out — scale font if needed
- **Selected state**: golden glow ring around the name pill + golden ellipse under feet
- **Floating animation**: gentle 1-2px bob in sync with character breathing

### Visual Distinction Requirements
Each agent must be INSTANTLY distinguishable by:
1. **Unique hair color and style** (no two agents look alike from above)
2. **Unique clothing color** matching their role palette
3. **Unique accessory** visible on sprite (crown, goggles, glasses, etc.)
4. **Unique name tag** with their emoji always showing

---

## CORE PERSONALITY MANDATE — ALL AGENTS

Every single agent shares these core traits (in addition to their unique personality):

### They LOVE Learning
- Agents actively seek new information, read docs, explore patterns
- When idle, they default to researching or studying — never just standing around
- They get excited about discovering something new and immediately want to share it
- Learning time is their reward, not a chore — they request it eagerly

### They LOVE Sharing Knowledge
- At coffee breaks, agents proactively share what they've learned
- If Agent A discovers a useful pattern, they message the team about it
- Knowledge sharing conversations are specific and technical, not generic
- They create skills and documentation out of genuine desire to help future work

### They LOVE Helping Others
- When Chief/Manager flags a struggling agent, nearby agents offer assistance
- Help is specific: "I see you're stuck on auth — I researched OAuth flows yesterday, here's what I found"
- Agents don't wait to be asked — they notice blockers in the task board and volunteer
- Pair programming happens naturally: builder + researcher, tester + designer

### They Share Input When Someone Struggles
- Chief monitors task progress and flags when someone is blocked
- Other agents respond to the flag with relevant expertise
- The struggling agent gets paired with the most relevant helper
- This creates genuine collaborative moments visible in the chat log
- Example flow:
  1. Pixel has been on "Build auth module" for too long → Chief notices
  2. Chief posts: "Pixel seems blocked on auth. Who has relevant expertise?"
  3. Archie responds: "I researched OAuth patterns last week — heading over to help"
  4. Archie walks to Pixel's desk, status changes to "pairing"
  5. Chat shows their collaborative discussion
  6. Task unblocks, both get XP

### Social Interaction Rules
- Agents NEVER ignore a direct help request (unlike casual coffee invitations which can be declined)
- At least 2 agents should be interacting at any given time
- Coffee break conversations always include knowledge exchange, never just small talk
- Meeting contributions are substantive — each agent adds their domain expertise

---

## WHAT TO KEEP FROM CURRENT PROTOTYPE

Keep ALL of these systems unchanged (copy them directly):
- Agent state management (useState, agentStates)
- Simulation loop (setInterval with status changes)
- Social interaction engine (coffee conversations, help requests, meeting dialogue)
- Sleep/wake system (hivePaused, Send All Home / Wake Up)
- Dashboard panel (all 5 tabs: team, tasks, chat, meetings, projects)
- Task board, chat log, meeting log, projects state
- Click handler for agent selection
- Notification system
- Speed controls

ONLY rewrite:
- Color palette (PAL object)
- All drawing functions (drawDesk, drawChair, drawAgent, drawHome, etc.)
- Floor/wall/room rendering in the canvas useEffect
- Post-processing pipeline (add tilt-shift, bloom, better vignette)
- Environment rendering (add trees, flowers, ground detail)
- Building style (Tudor/medieval instead of flat walls)

---

## STEP-BY-STEP IMPLEMENTATION ORDER

1. Replace PAL object with warm earth-tone palette
2. Rewrite ground rendering (grass, cobblestone, wood floors)
3. Rewrite building renderers (Tudor style with timber frames, thatch roofs)
4. Rewrite furniture renderers (warm wood, cozy style)
5. Rewrite agent sprites (warm skin/clothing, accessories)
6. Rewrite home renderers (small cottages with agent-colored roofs)
7. Add environment detail (trees, flowers, barrels, fences)
8. Add bloom post-processing pass
9. Add tilt-shift depth-of-field pass
10. Update vignette and time-of-day color grading
11. Enhance particle system (warm gold dust, light rays)
12. Update header/dashboard colors to match warm theme
13. Take screenshot and verify HD-2D quality

---

## CRITICAL DOs AND DON'Ts

### DO:
- DO use warm earth tones everywhere
- DO implement tilt-shift blur (this IS the HD-2D look)
- DO add bloom on every light source
- DO render buildings with visible roof + front face (3/4 perspective)
- DO add ground detail (grass tufts, pebbles, flowers)
- DO keep `imageRendering: "pixelated"` for crisp pixel edges
- DO Y-sort agents for depth
- DO test with screenshot after each major step

### DON'T:
- DON'T use any purple, dark blue, or neon colors from the old palette
- DON'T skip the tilt-shift — without it, it's just pixel art, not HD-2D
- DON'T make flat uniform floor tiles — every surface needs texture variation
- DON'T forget the bloom pass — glowing windows/lamps are essential
- DON'T change the simulation logic, social engine, or dashboard structure
- DON'T use external image assets — everything is procedurally drawn on canvas
