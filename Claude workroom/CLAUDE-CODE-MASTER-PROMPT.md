# Pixel Hive — Master Claude Code Prompt

## Copy this ENTIRE prompt into Claude Code to start building.

---

You are building **Pixel Hive** — a gamified HD-2D pixel art virtual office web app where AI agent characters autonomously work, collaborate, learn, and grow. Think Octopath Traveler visual style meets Stanford Generative Agents meets a real productivity tool.

## STEP 0: Read the specifications

Before writing ANY code, read these files in order:

```bash
# 1. The full project skill (architecture, tech stack, schema, phases)
cat SKILL.md

# 2. The visual overhaul spec (HD-2D rendering pipeline, building style, effects)
cat PIXEL-HIVE-VISUAL-OVERHAUL.md

# 3. Shared agent personality traits
cat pixel-hive-agents/SHARED-TRAITS.md

# 4. The existing prototype (reference for simulation logic, dashboard, social engine)
cat claude-hive-office.jsx
```

## STEP 1: Project setup

```bash
npx create-next-app@latest pixel-hive --typescript --tailwind --app --src-dir
cd pixel-hive
npm install zustand
```

We start with Canvas 2D + Zustand (NOT PixiJS/Convex yet). Get the visual prototype working first, then migrate to PixiJS + Convex later.

## STEP 2: Build order (strictly sequential)

### 2.1 — Warm Earth-Tone Palette
Replace the dark sci-fi palette with Octopath Traveler warm earth tones. See PIXEL-HIVE-VISUAL-OVERHAUL.md section "Warm Earth Tone Palette". The palette covers: sky, stone, wood, roofs, grass, paths, interior floors, light/glow, night accents, foliage shadows.

**Verify**: Take a screenshot. The canvas background should be forest greens and earth tones, NOT dark purple/blue.

### 2.2 — Ground Rendering
Draw the ground layer with rich texture variation:
- Office interior: warm wood plank floors with grain lines and highlights
- Meeting room: slightly darker wood with a carpet runner
- Break room: rustic stone floor with warm tones
- Paths: irregular cobblestone with varying stone colors and dark mortar gaps
- Grass: base green with random tufts, scattered flowers, mushrooms, pebbles
- Agent home zone: lush grass with small garden patches

**Verify**: Screenshot. Ground should have visible texture, not uniform color blocks.

### 2.3 — Tudor-Style Buildings
Draw buildings with 3/4 perspective (visible roof + front face):
- Main office: half-timber frame (dark beams on sandstone plaster), pitched thatch roof, multiple small glowing windows, flower boxes, foundation stones
- Meeting room: smaller Tudor wing with round table visible inside, lanterns at entrance
- Break room: rustic hut with thatched roof, coffee cart, benches, garden area
- Each building has ambient occlusion shadows at base

**Verify**: Screenshot. Buildings should look like a medieval village, not flat rectangles.

### 2.4 — Warm Furniture
Rewrite all furniture renderers in warm wood/earth tones:
- Desks: rich brown wood with visible grain, monitors with warm screen glow
- Chairs: wooden with fabric in agent colors
- Meeting table: large oak table with golden trim
- Bookshelves: warm wood with colorful book spines
- Plants: terracotta pots with lush green foliage
- Lamps: brass/gold with warm light cone
- Coffee machine: wooden cart with ceramic cups, steam particles

### 2.5 — Agent Sprites with Name Tags
Draw each of the 10 agents as unique pixel characters:
- 16x24px base at 3x scale (48x72 on screen)
- Warm skin tones, unique hair color/style per agent
- Unique clothing matching role color (see updated roster in SKILL.md)
- Unique visible accessory (crown, goggles, glasses, beret, etc.)
- Walk animation: 4-frame leg cycle with arm swing
- Idle: gentle 1-2px breathing bob

**CRITICAL — Name Tags (MANDATORY)**:
Every agent ALWAYS has a floating name tag above their head:
- Dark semi-transparent pill (#00000099) with rounded corners
- Contents: [emoji] [Name] Lv.[N] — name in agent's color, level in gold (#d4a020)
- Below the pill: small status icon (💻/🗣/☕/📖/🚶/💤)
- Gentle floating bob synced with character
- Selected agent: golden glow ring on tag + golden ellipse under feet

Read each agent's profile in `pixel-hive-agents/` for their specific colors, accessories, and personality.

**Verify**: Screenshot. Each agent must be instantly distinguishable. Name tags must be readable.

### 2.6 — Agent Homes
Small cottages along a path south of the main buildings:
- Each cottage has a pitched roof in the agent's accent color
- Tiny window that glows warm when occupied
- Small door with agent's emoji on a nameplate
- Unique garden decoration per agent
- Foundation shadow

### 2.7 — Environment Detail
Add richness to the scene:
- Trees along edges: 3-layer foliage (dark/medium/bright), bark-textured trunk, shadow pool
- Flower patches: yellow, white, purple scattered along paths and building edges
- Barrels, crates, signposts near building entrances
- Fences or hedges separating zones
- Small well or fountain near break room

### 2.8 — Bloom Post-Processing
Draw light sources (windows, lamps, monitors, lanterns) to a separate offscreen canvas. Apply gaussian blur (12-20px). Composite onto the main canvas with `globalCompositeOperation: "screen"` at 0.5-0.7 alpha. All warm light sources should have visible golden bloom spill.

See PIXEL-HIVE-VISUAL-OVERHAUL.md for implementation code.

**Verify**: Screenshot. Windows and lamps should have soft warm glow bleeding into surrounding area.

### 2.9 — Tilt-Shift Depth of Field
THE signature HD-2D effect. Blur the top ~20% and bottom ~20% of the canvas with a feathered gradient transition. Sharp focus in the center where agents work. Creates the "diorama miniature" look.

See PIXEL-HIVE-VISUAL-OVERHAUL.md for implementation code using offscreen canvases.

**Verify**: Screenshot. The top and bottom edges should be softly blurred. Center should be sharp. This MUST look like looking at a tiny model through a tilt-shift lens.

### 2.10 — Vignette and Time-of-Day
- Radial vignette: dark corners, transparent center
- Morning: warm amber overlay (rgba(255,200,120,0.04))
- Afternoon: neutral (minimal overlay)
- Evening: cool blue overlay (rgba(40,30,80,0.15))
- Cycle through time periods based on tick counter

### 2.11 — Particle System
- Warm golden dust motes floating gently upward (daytime)
- Cool blue particles at evening
- Light ray cones from windows (triangular gradient shapes on floor)
- Optional: fireflies at evening, steam from coffee cart

### 2.12 — Social Engine & Simulation
Copy the social interaction engine from the existing prototype (claude-hive-office.jsx lines 676-815). This includes:
- Proximity-based coffee break conversations with real knowledge sharing
- Meeting room dialogue with substantive contributions
- "Anyone for coffee?" with accept/ignore dynamics
- Help requests between agents
- Random chat messages

**ADDITIONS** (from SHARED-TRAITS.md):
- Help cascade: Chief detects blocked agents, flags them, relevant expert responds
- "Pairing" status when two agents collaborate on a problem
- Agents NEVER idle — always in a productive state
- Coffee conversations MUST include technical substance

### 2.13 — Dashboard and Controls
Copy the 5-tab dashboard from the existing prototype. Update colors to match the warm theme:
- Dark warm backgrounds (#1a1510, #241e16) instead of dark blues (#0a0a16, #0e0e1e)
- Agent colors from the updated warm palette
- Gold accents (#d4a020) for headers and highlights
- Same functionality: Team, Tasks, Chat, Meetings, Projects tabs

### 2.14 — Header and Status Bar
Update to match warm fantasy theme:
- Header: warm gradient background, "PIXEL HIVE" title in gold
- Bee emoji logo with golden glow
- Speed controls, Send All Home / Wake Up button
- Status bar: warm dark background with activity counts

---

## CRITICAL RULES

1. **Every agent has a visible name tag. Always. No exceptions.**
2. **Warm earth tones only — no purple, no neon, no dark blue backgrounds.**
3. **Tilt-shift blur is mandatory — it IS the HD-2D look.**
4. **Bloom on every light source — windows, lamps, monitors, lanterns.**
5. **Buildings have 3/4 perspective — visible roof AND front face.**
6. **Agents love learning and helping — personality is visible in chat.**
7. **Take a screenshot after EVERY major step to verify visual quality.**
8. **All rendering is procedural Canvas 2D — NO external image assets.**
9. **Keep all simulation/social/dashboard logic from the existing prototype.**
10. **imageRendering: "pixelated" on the canvas CSS for crisp pixel edges.**

---

## FILE STRUCTURE

```
pixel-hive/
├── CLAUDE.md                           — Session context
├── src/
│   ├── app/
│   │   ├── layout.tsx                  — Root layout
│   │   ├── page.tsx                    — Main page
│   │   └── globals.css                 — Global styles
│   └── components/
│       └── PixelHive.tsx               — Single-file prototype (all-in-one for now)
├── pixel-hive-agents/                  — Agent profile files
│   ├── SHARED-TRAITS.md
│   ├── chief.md
│   ├── apex.md
│   ├── archie.md
│   ├── pixel.md
│   ├── bugsy.md
│   ├── palette.md
│   ├── sage.md
│   ├── forge.md
│   ├── tempo.md
│   └── recall.md
├── PIXEL-HIVE-VISUAL-OVERHAUL.md       — Visual spec reference
└── SKILL.md                            — Full project skill
```

Start with a single `PixelHive.tsx` component (like the current prototype). We'll decompose into separate files later.

---

## DONE CRITERIA

The visual overhaul is DONE when:
- [ ] Canvas uses warm earth-tone palette (no dark sci-fi colors)
- [ ] Ground has visible texture variation (grass tufts, cobblestone, wood grain)
- [ ] Buildings are Tudor-style with pitched roofs and timber frames
- [ ] All 10 agents are visually distinct with unique colors and accessories
- [ ] Every agent has a floating name tag with emoji, name, and level
- [ ] Bloom is visible on windows, lamps, and monitors
- [ ] Tilt-shift blur creates diorama effect on top/bottom edges
- [ ] Vignette darkens corners
- [ ] Time-of-day color grading works (morning/afternoon/evening)
- [ ] Particles float upward with warm golden color
- [ ] Social engine produces substantive chat messages
- [ ] Help cascade works (Chief flags blockers, experts respond)
- [ ] Dashboard has warm theme colors
- [ ] Final screenshot looks like an Octopath Traveler scene
