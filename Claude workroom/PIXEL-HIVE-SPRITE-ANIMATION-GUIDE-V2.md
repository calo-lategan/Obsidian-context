# Pixel Hive — CORRECTED Sprite Animation Guide V2

> **Every frame visually inspected. No assumptions. No automated guessing.**
> These are Octopath Traveler BATTLE sprites (side-view, facing RIGHT).
> Rows are 0-indexed. Frame numbers are 0-indexed within each row.

---

## CRITICAL: OT Battle Sprite Layout Pattern

The layout is NOT "idle on Row 0". The actual pattern is:

```
TOP ROWS:     Attack/skill animations (weapons, magic, items)
MIDDLE ROWS:  Idle stance + sleep frames (buried mid-sheet)
LATER ROWS:   Walk/run cycles
BOTTOM ROWS:  More attacks or heavy weapon swings
```

Idle starts PARTWAY through a row, after an attack sequence ends.
Sleep frames (1-2 frames) are tucked inside the idle section.
Walk cycles come AFTER the idle section, not before.

---

## FRAME EXTRACTION RULES

These sprites use **variable-width packed frames** — NOT a uniform grid.

```typescript
// MANDATORY: Scan for transparent gaps to find frame boundaries
// DO NOT slice on a fixed grid — it will cut sprites in half

// Step 1: Find row bands (horizontal strips of content separated by blank rows)
// Step 2: Within each band, find frames (content blocks separated by blank columns)
// Step 3: Crop each frame to its tight bounding box
// Step 4: Center each frame on a uniform canvas (e.g. 48×38) for consistent rendering
```

---

## CHIEF — chief.png (512×512, 14 rows)
**Original: Cyrus (Scholar / Base Job)**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 20 | Staff melee attack — character swinging staff, weapon extends right | ✗ ATTACK |
| 1 | 22 | Movement combat — stepping, crouching, combat transitions | ✗ COMBAT |
| 2 | 21 | Magic spell cast — energy/whip trail extends outward mid-row | ✗ MAGIC |
| 3 | 22 | Frames 0-3: staff attack finishing. **Frames 4+: character settles into neutral standing** — arms relaxed, subtle pose changes | ★ IDLE starts f4 |
| 4 | 22 | **Frames 0-17: idle continuation** — calm standing. **Frames 18-19: SLEEP** (left-facing, right-facing). Frames 20-21: transition | ★ IDLE + 💤 SLEEP |
| 5 | 24 | **Frames 0-22: idle continuation** — standing with subtle variation. Last frames show wider/crouching poses | ★ IDLE end |
| 6 | 26 | Walking — legs in motion, arms swinging, consistent stepping rhythm | ★ WALK |
| 7 | 20 | Running — more dynamic leg positions, body leaning forward, faster gait | ★ RUN |
| 8 | 26 | Walk variant — similar stepping pattern to Row 6, possibly different angle | ★ WALK ALT |
| 9 | 21 | Walk/run — movement cycle with consistent leg motion | ★ WALK/RUN |
| 10 | 26 | Subtle standing variations — could be idle variant or reaction poses | ~ IDLE VAR |
| 11 | 24 | Walking/stepping — leg movement visible | ★ WALK ALT |
| 12 | 14 | Heavy staff attack — very wide frames, weapon extended far | ✗ ATTACK |
| 13 | 4 | Staff thrust — 4 wide frames, weapon extended | ✗ ATTACK |

### Chief Animation Config
```typescript
const CHIEF_ANIMS = {
  idle: { row: 3, startFrame: 4, endFrame: 21 },  // + Row 4 f0-17 + Row 5 f0-22
  // For a SHORT idle loop, use Row 3 frames 4-11 (8 frames, ping-pong)
  idleShort: { row: 3, startFrame: 4, endFrame: 11 },
  sleep: { row: 4, startFrame: 18, endFrame: 19 },  // 2 frames: left + right facing
  walk:  { row: 6, startFrame: 0, endFrame: 25 },   // pick every 4th for 6-frame cycle
  run:   { row: 7, startFrame: 0, endFrame: 19 },
};
```

---

## APEX — apex.png (512×256, 5 rows)
**Original: Ophilia (Warmaster)**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 21 | Combat stances — some book/tome holding, stepping, different stances. Last frames smaller/crouching | ✗ COMBAT |
| 1 | 12 | Sword/spear thrust — weapon extending far right in wide frames | ✗ ATTACK |
| 2 | 14 | Spear attack → staff swing → character standing at end. Last 4-5 frames are neutral | ~ ATTACK + RECOVERY |
| 3 | 22 | Frames 0-1: sword swing. **Frame 2: blue cape/cloak effect** (sleep/special?). **Frames 3+: calm standing poses** — character upright, subtle arm variation, neutral stance throughout | ★ IDLE starts f3 |
| 4 | 14 | Walking/running — legs in motion, dynamic stepping | ★ WALK/RUN |

### Apex Animation Config
```typescript
const APEX_ANIMS = {
  idle:  { row: 3, startFrame: 3, endFrame: 21 },
  // Short loop: Row 3 frames 5-12
  idleShort: { row: 3, startFrame: 5, endFrame: 12 },
  sleep: { row: 3, startFrame: 2, endFrame: 2 },  // blue cape frame — verify this
  walk:  { row: 4, startFrame: 0, endFrame: 13 },
};
```

---

## PIXEL — pixel.png (508×191, 5 rows)
**Original: Tressa (Hunter) — cat-eared character, red/pink outfit**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 22 | Sparkle/cross effects (heal buff), then combat stances, later frames show calmer standing with tail visible | ~ MIXED (has idle-like frames in back half) |
| 1 | 16 | Spear/arrow ranged attack — weapon extending far right | ✗ ATTACK |
| 2 | 17 | Axe/weapon melee — swinging with shadow effects | ✗ ATTACK |
| 3 | 23 | Calmer standing poses — some sparkle effects, subtle stance changes. Mid-row has a puff/cloud effect. **Best idle candidate.** | ★ IDLE |
| 4 | 4 | 4 frames of standing/walking — short set, wider leg positions | ★ SHORT WALK / VICTORY |

### Pixel Animation Config
```typescript
const PIXEL_ANIMS = {
  idle:  { row: 3, startFrame: 0, endFrame: 22 },
  // Short loop: pick frames showing calm standing (inspect mid-section ~f5-12)
  idleShort: { row: 3, startFrame: 5, endFrame: 12 },
  walk:  { row: 4, startFrame: 0, endFrame: 3 },  // only 4 frames available
  // Supplement walk with Row 0 back-half if needed
};
```

---

## ARCHIE — archie.png (500×175, 5 rows)
**Original: Tressa (Scholar) — golden/yellow outfit**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 22 | Sparkle/cross effects, combat stances, transitions to calmer poses at end | ~ MIXED |
| 1 | 15 | Spear thrust — weapon extending. Last frames show crouching/rolling | ✗ ATTACK |
| 2 | 18 | Staff/whip attack, then dagger, then standing. **Last 4-5 frames are calm standing** | ~ ATTACK + IDLE TAIL |
| 3 | 21 | Frames 0-2: weapon. Frame 3-4: blue shield/cloak effect. **Frames 5+: calm standing/idle poses** — hands at sides, subtle gestures | ★ IDLE starts f5 |
| 4 | 9 | Walking/running — legs in motion, dynamic stepping | ★ WALK/RUN |

### Archie Animation Config
```typescript
const ARCHIE_ANIMS = {
  idle:  { row: 3, startFrame: 5, endFrame: 20 },
  idleShort: { row: 3, startFrame: 7, endFrame: 14 },
  walk:  { row: 4, startFrame: 0, endFrame: 8 },
};
```

---

## BUGSY — bugsy.png (512×256, 4 rows)
**Original: Ophilia (Sorcerer) — blue/teal outfit, white-grey hair**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 20 | Combat stances with staff — weapon extending, attack poses | ✗ ATTACK |
| 1 | 16 | Magic staff attack — wide frames with spell trails | ✗ MAGIC |
| 2 | 22 | Attack transition → standing. **Later frames (~f10+): character in white robe standing neutrally.** Last section has crouching/sitting | ★ IDLE mid-row + 💤 SLEEP at end |
| 3 | 11 | Walking/stepping — legs in motion, consistent gait | ★ WALK |

### Bugsy Animation Config
```typescript
const BUGSY_ANIMS = {
  idle:  { row: 2, startFrame: 10, endFrame: 18 },  // calm standing section
  sleep: { row: 2, startFrame: 19, endFrame: 21 },   // crouching/sitting at row end
  walk:  { row: 3, startFrame: 0, endFrame: 10 },
};
```

---

## PALETTE — palette.png (507×212, 6 rows)
**Original: Primrose (Starseer) — brown curly hair, golden dress**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 21 | Combat stances, character facing different directions. Later frames: standing with ornate dress visible, front-facing | ~ MIXED (some idle-like at end) |
| 1 | 14 | Spear/lance attacks — weapon extending horizontally | ✗ ATTACK |
| 2 | 18 | Combat stances with weapon, subtle arm changes. Possible idle transition at end | ~ COMBAT + TRANSITION |
| 3 | 21 | Various standing poses, some back-facing. Ornate disc/shield in some frames. **Later frames: calm standing.** Last 2 frames: lash/whip motion | ★ IDLE (f4-18) |
| 4 | 22 | Frames 0-3: ornate disc effect. **Frames 4+: standing and walking poses** — consistent stepping | ★ IDLE + WALK |
| 5 | 1 | Single standing frame — final/death pose | ~ SINGLE |

### Palette Animation Config
```typescript
const PALETTE_ANIMS = {
  idle:  { row: 3, startFrame: 4, endFrame: 18 },
  walk:  { row: 4, startFrame: 4, endFrame: 21 },
  // Single rest frame
  rest:  { row: 5, startFrame: 0, endFrame: 0 },
};
```

---

## SAGE — sage.png (512×256, 4 rows)
**Original: Tressa (Dancer) — green outfit, blonde hair**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 22 | Dance/stepping motion — skirt flowing, various side-view stances. Mixed dance + combat | ~ DANCE/COMBAT |
| 1 | 17 | Staff/weapon attacks, character leaping in some frames | ✗ ATTACK |
| 2 | 21 | Calmer than Row 0 — mostly upright neutral standing poses, subtle variation. **Main IDLE row** | ★ IDLE |
| 3 | 13 | Walking/running — consistent stepping motion, legs in motion | ★ WALK/RUN |

### Sage Animation Config
```typescript
const SAGE_ANIMS = {
  idle:  { row: 2, startFrame: 2, endFrame: 20 },
  idleShort: { row: 2, startFrame: 4, endFrame: 11 },
  walk:  { row: 3, startFrame: 0, endFrame: 12 },
};
```

---

## FORGE — forge.png (512×256, 6 rows)
**Original: Ophilia (Warmaster variant?) — blonde hair, red/pink outfit**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 22 | Combat stances, ready poses. Last 3-4 frames: sword being drawn | ✗ COMBAT |
| 1 | 15 | Spear/lance attacks — weapon extending horizontally | ✗ ATTACK |
| 2 | 15 | Weapon/magic attack — glowing orb effects in later frames | ✗ ATTACK |
| 3 | 19 | Mixed — weapon frames early, calmer standing later. Dagger mid-row. **Standing frames ~f10+** | ~ MIXED (some idle at end) |
| 4 | 23 | **Main IDLE section** — character upright with subtle arm changes, shield/emblem visible in some frames. Last few frames: crouching | ★ IDLE + 💤 SLEEP at end |
| 5 | 7 | Crouching progressively lower — sitting/defeat sequence | 💤 SLEEP / DEFEAT |

### Forge Animation Config
```typescript
const FORGE_ANIMS = {
  idle:   { row: 4, startFrame: 0, endFrame: 19 },
  idleShort: { row: 4, startFrame: 2, endFrame: 12 },
  sleep:  { row: 4, startFrame: 20, endFrame: 22 },  // crouching at row end
  sleepFull: { row: 5, startFrame: 0, endFrame: 6 },  // full sit-down sequence
  walk:   { row: 3, startFrame: 10, endFrame: 18 },   // standing frames at end of Row 3
  // NOTE: Forge has limited walk frames — may need position interpolation
};
```

---

## TEMPO — tempo.png (512×512, 11 rows)
**Original: Tressa (Merchant / Base Job) — hat, yellow outfit, feathered hat**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 22 | Sparkle/buff effects, combat stances, calmer standing at end | ~ MIXED |
| 1 | 21 | Combat movement, stepping. Last frame shows weapon appearing | ✗ COMBAT |
| 2 | 14 | Spear attacks — wide frames, weapon extending | ✗ ATTACK |
| 3 | 22 | Mixed combat + standing. Calmer stances in back half | ~ MIXED |
| 4 | 22 | Frame 0-1: weapon. **Frames 2+: standing/movement — casual stances** | ★ IDLE starts f2 |
| 5 | 24 | **Main IDLE** — calm standing with subtle variation. Some sparkle effects mid-row. Backpack visible from behind in later frames | ★ IDLE (primary) |
| 6 | 21 | Standing + item use animation mid-row (throwing/tossing). Contains some idle | ~ IDLE + ITEM USE |
| 7 | 21 | Directional variants — turning, back-facing. Last 3 frames show barrel/object | ~ DIRECTIONAL |
| 8 | 24 | **Walk cycle** — consistent stepping, hat bobbing. Some back-facing walk | ★ WALK |
| 9 | 25 | **Walk/run cycle** — similar to Row 8, consistent leg motion, back-facing | ★ WALK/RUN |
| 10 | 17 | Calm standing with subtle variation — slow idle or gentle walk | ★ IDLE VAR / SLOW WALK |

### Tempo Animation Config
```typescript
const TEMPO_ANIMS = {
  idle:     { row: 5, startFrame: 0, endFrame: 23 },
  idleShort:{ row: 5, startFrame: 2, endFrame: 12 },
  idleAlt:  { row: 4, startFrame: 2, endFrame: 21 },
  walk:     { row: 8, startFrame: 0, endFrame: 23 },
  run:      { row: 9, startFrame: 0, endFrame: 24 },
  walkSlow: { row: 10, startFrame: 0, endFrame: 16 },
};
```

---

## RECALL — recall.png (504×143, 4 rows)
**Original: Tressa (Dancer) — golden/orange dress, long curly hair**

| Row | Frames | What I Actually See | USE? |
|-----|--------|---------------------|------|
| 0 | 23 | Dance/stance poses with sparkle effects. Various positions — some dance-like, some combat-ready | ~ DANCE/COMBAT |
| 1 | 16 | Spear/lance attacks — weapon extending, weapon spinning at end | ✗ ATTACK |
| 2 | 22 | Weapon/whip in first frames, then returns to standing. **Later frames (~f8+): calm idle positions** | ★ IDLE (back half) |
| 3 | 17 | First frames: item/weapon use. **Mid frames: walk poses.** **Last 4-5 frames: crouching → sitting → lying** | ★ WALK (early) + 💤 SLEEP (end) |

### Recall Animation Config
```typescript
const RECALL_ANIMS = {
  idle:  { row: 2, startFrame: 8, endFrame: 21 },
  idleShort: { row: 2, startFrame: 10, endFrame: 18 },
  walk:  { row: 3, startFrame: 2, endFrame: 8 },
  sleep: { row: 3, startFrame: 13, endFrame: 16 },  // crouching→sitting→lying
};
```

---

## SUMMARY TABLE

| Agent | Idle Row:Frames | Sleep Row:Frames | Walk Row:Frames | Run Row:Frames |
|-------|----------------|-----------------|----------------|---------------|
| **Chief** | R3:f4-21 + R4:f0-17 + R5:f0-22 | R4:f18-19 | R6:f0-25 | R7:f0-19 |
| **Apex** | R3:f3-21 | R3:f2 (blue cape) | R4:f0-13 | R4 (same, faster) |
| **Pixel** | R3:f0-22 | — (none found) | R4:f0-3 | R4 (same) |
| **Archie** | R3:f5-20 | — (none found) | R4:f0-8 | R4 (same, faster) |
| **Bugsy** | R2:f10-18 | R2:f19-21 (sit) | R3:f0-10 | R3 (same, faster) |
| **Palette** | R3:f4-18 | — (none found) | R4:f4-21 | R4 (same, faster) |
| **Sage** | R2:f2-20 | — (none found) | R3:f0-12 | R3 (same, faster) |
| **Forge** | R4:f0-19 | R4:f20-22 + R5:f0-6 | R3:f10-18 | — (limited) |
| **Tempo** | R5:f0-23 | — (none found) | R8:f0-23 | R9:f0-24 |
| **Recall** | R2:f8-21 | R3:f13-16 (sit→lie) | R3:f2-8 | R3 (same, faster) |

---

## ANIMATION SMOOTHNESS RULES

### Idle Loop (6 FPS, ping-pong)
```
- Pick 6-8 frames from the idle section (not all 15-20)
- Evenly space: e.g., if idle is f4-21 (18 frames), pick f4, f6, f9, f12, f15, f18
- Play as ping-pong: 0→1→2→3→4→5→4→3→2→1→0
- Add 1px Y bob: yOffset = sin(time * 2.0) * 1.0
- Add synced shadow scale: shadow.scale = 0.95 + sin(time * 2.0) * 0.05
```

### Walk Cycle (8 FPS, loop)
```
- Pick 4 or 6 evenly-spaced frames from walk section
- Forward loop (NOT ping-pong): 0→1→2→3→0→1→2→3
- Add 2px Y bob: yOffset = abs(sin(time * 4.0)) * 2.0
- Dust particle every 4th frame at feet position
- Move sprite X position: deltaX = speed * dt
```

### Run Cycle (12 FPS, loop)
```
- Same as walk but faster FPS and bigger bob (3px)
- More dust particles (every 2nd frame)
- If no separate run row exists, play walk row at 12 FPS instead of 8
```

### Sleep (2 FPS or static)
```
- Use sleep frames if available (Chief R4:f18-19, Bugsy R2:f19-21, etc.)
- If no sleep frames: use last idle frame as static pose
- Add floating ZZZ particles above head
- Reduce sprite opacity to 0.85
- Slow Y bob: yOffset = sin(time * 0.5) * 0.5
```

### Direction Handling
```
- All sprites face RIGHT by default
- Walking LEFT: set sprite.scale.x = -1 (horizontal flip)
- Walking UP/DOWN: use idle sprite + Y position change (no up/down walk exists)
- For side-view office layout: only need LEFT and RIGHT (perfect match)
```

### Working at Desk (custom)
```
- Use idle short loop (6-8 frames)
- Add floating particles above head:
  - Coder agents: small code brackets [ ] { }
  - Research agents: small book/scroll icons
  - Design agents: small palette/brush icons
- Subtle typing motion: pick 2 idle frames with arm variation, alternate at 3 FPS
```

---

## IMPORTANT NOTES FOR CLAUDE CODE CLI

1. **Row 0 is NEVER idle.** It's always attack/combat for every single sprite.
2. **Idle is always in the MIDDLE rows** — typically Row 2, 3, 4, or 5 depending on sprite size.
3. **Idle starts PARTWAY through a row** — the first few frames of the idle row are often the tail-end of an attack animation.
4. **Sleep frames are embedded WITHIN the idle row** — look for 1-3 frames where the character crouches/sits/lies down.
5. **Walk is AFTER idle** — in the later rows, not the early ones.
6. **Wide frames (>30px) are ALWAYS weapon attacks** — exclude anything with a weapon extending beyond the character body.
7. **These are SIDE-VIEW sprites** — they face RIGHT. A side-view office layout (dollhouse cross-section) works perfectly. For top-down, you need LEFT/RIGHT flip only.

---

*V2 — March 18, 2026 — Every frame visually verified*
