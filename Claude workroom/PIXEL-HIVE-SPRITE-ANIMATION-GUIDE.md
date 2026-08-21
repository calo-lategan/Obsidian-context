# Pixel Hive — Sprite Animation Guide for Claude Code CLI

> **CRITICAL**: Read this BEFORE touching any animation code.
> These are Octopath Traveler BATTLE sprites (side-view facing right).
> They are NOT top-down overworld sprites. Handle accordingly.

---

## 1. SPRITE FORMAT

All sprites are **packed variable-width frames** on a transparent background.
- Frames are NOT on a uniform grid — each frame has different pixel width
- Frames ARE organized into horizontal rows, separated by transparent gaps
- Each row = one animation sequence
- Frame height is consistent within a row (~32-38px)
- Frame width varies (narrow = idle/walk, wide = weapon attacks)
- All sprites face RIGHT by default. Flip horizontally for left-facing.

### How to Extract Frames

```typescript
// DO NOT use fixed grid slicing. Frames are variable-width.
// Instead, scan each row for content boundaries:

function extractFrames(spriteSheet: HTMLImageElement): AnimationRow[] {
  const canvas = document.createElement('canvas');
  canvas.width = spriteSheet.width;
  canvas.height = spriteSheet.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(spriteSheet, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Step 1: Find row bands (groups of consecutive rows with content)
  const rowBands = findRowBands(imageData);

  // Step 2: For each row band, find individual frames
  return rowBands.map(band => {
    const frames = findFramesInBand(imageData, band.yStart, band.yEnd);
    return { yStart: band.yStart, yEnd: band.yEnd, frames };
  });
}

function findRowBands(data: ImageData): { yStart: number; yEnd: number }[] {
  const bands: { yStart: number; yEnd: number }[] = [];
  let inBand = false;
  let start = 0;

  for (let y = 0; y < data.height; y++) {
    let hasContent = false;
    for (let x = 0; x < data.width; x++) {
      if (data.data[(y * data.width + x) * 4 + 3] > 0) {
        hasContent = true;
        break;
      }
    }
    if (hasContent && !inBand) { start = y; inBand = true; }
    if (!hasContent && inBand) { bands.push({ yStart: start, yEnd: y - 1 }); inBand = false; }
  }
  if (inBand) bands.push({ yStart: start, yEnd: data.height - 1 });
  return bands;
}

function findFramesInBand(
  data: ImageData, yStart: number, yEnd: number
): { x: number; width: number }[] {
  const frames: { x: number; width: number }[] = [];
  let inFrame = false;
  let frameStart = 0;

  for (let x = 0; x < data.width; x++) {
    let hasContent = false;
    for (let y = yStart; y <= yEnd; y++) {
      if (data.data[(y * data.width + x) * 4 + 3] > 0) {
        hasContent = true;
        break;
      }
    }
    if (hasContent && !inFrame) { frameStart = x; inFrame = true; }
    if (!hasContent && inFrame) {
      frames.push({ x: frameStart, width: x - frameStart });
      inFrame = false;
    }
  }
  if (inFrame) frames.push({ x: frameStart, width: data.width - frameStart });
  return frames;
}
```

---

## 2. ANIMATION ROW MAP — ALL 10 AGENTS

### Key
- ★ = **USE THIS** (idle, walk, transition)
- ✗ = **EXCLUDE** (weapon attacks, magic, battle-only)
- ~ = **OPTIONAL** (inspect — may contain usable hit-react or victory poses)

---

### chief.png (512×512) — 14 rows
**Original character: Cyrus (Scholar / Base)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 2–35 | 20 | 24px | ★ IDLE | **Primary idle loop** — first 4-6 frames are stance, subtle breathing |
| 1 | 38–71 | 22 | 21px | ★ WALK | **Walk/run cycle** — use 4-frame or 8-frame subsets |
| 5 | 182–215 | 24 | 19px | ★ WALK | **Secondary walk variant** |
| 6 | 218–252 | 26 | 18px | ★ WALK | **Run cycle** (more frames = faster legs) |
| 7 | 255–289 | 20 | 23px | ★ TRANSITION | **Movement transitions** — usable for "arriving at desk" |
| 8 | 292–326 | 26 | 17px | ★ WALK | Another walk variant |
| 9 | 329–363 | 21 | 22px | ★ WALK | Another walk variant |
| 2 | 74–107 | 21 | 22px | ~ | Inspect — may have casting/gesture frames |
| 3 | 110–143 | 22 | 21px | ✗ | Mixed attack — contains weapon frames |
| 4 | 146–179 | 22 | 21px | ~ | Inspect manually |
| 10 | 366–399 | 26 | 17px | ★ WALK | Compact walk variant |
| 11 | 402–435 | 24 | 19px | ★ WALK | Compact walk variant |
| 12 | 439–475 | 14 | 34px | ✗ | Weapon attack (wide frames) |
| 13 | 478–509 | 4 | 37px | ✗ | Weapon attack (wide frames) |

**Chief recommendation**: Row 0 frames 0-5 for idle, Row 1 frames 0-7 for walk, Row 6 frames 0-7 for run.

---

### apex.png (512×256) — 5 rows
**Original character: Ophilia (Warmaster)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 2–35 | 21 | 22px | ★ IDLE | **Primary idle** — first 4-6 frames |
| 3 | 116–149 | 22 | 21px | ~ GENERAL | Inspect — may have usable movement |
| 4 | 152–186 | 14 | 22px | ~ GENERAL | Inspect — possible transition |
| 1 | 38–74 | 12 | 40px | ✗ | Weapon attack (very wide) |
| 2 | 77–113 | 14 | 33px | ✗ | Weapon attack |

**Apex recommendation**: Row 0 for idle. Limited walk frames — reuse Row 0 with horizontal position interpolation, or extract frames 8-15 from Row 0 if they show stepping motion.

---

### pixel.png (508×191) — 5 rows
**Original character: Tressa (Hunter)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 0–34 | 22 | 21px | ★ IDLE | **Primary idle** — frames 0-5 |
| 3 | 117–152 | 23 | 20px | ~ GENERAL | Inspect — possibly walk |
| 4 | 155–190 | 4 | 19px | ~ SHORT | Victory/faint pose |
| 1 | 37–77 | 16 | 29px | ✗ | Weapon attack |
| 2 | 80–114 | 17 | 27px | ✗ | Mixed attack |

**Pixel recommendation**: Row 0 for idle, Row 3 for walk (23 frames — likely contains movement cycle).

---

### archie.png (500×175) — 5 rows
**Original character: Tressa (Scholar)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 0–31 | 22 | 21px | ★ IDLE | **Primary idle** |
| 3 | 107–139 | 21 | 22px | ~ GENERAL | Inspect — possible walk |
| 4 | 142–174 | 9 | 21px | ★ TRANSITION | Short movement — usable for "arriving" |
| 1 | 34–70 | 15 | 30px | ✗ | Weapon attack |
| 2 | 73–104 | 18 | 25px | ✗ | Mixed attack |

**Archie recommendation**: Row 0 for idle, Row 3 for walk, Row 4 for transition.

---

### bugsy.png (512×256) — 4 rows
**Original character: Ophilia (Sorcerer)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 2–35 | 20 | 23px | ★ IDLE | **Primary idle** |
| 2 | 77–111 | 22 | 21px | ~ GENERAL | Inspect — may contain walk |
| 3 | 114–148 | 11 | 22px | ★ TRANSITION | Usable movement/reaction |
| 1 | 38–74 | 16 | 29px | ✗ | Weapon attack |

**Bugsy recommendation**: Row 0 for idle, Row 2 for walk, Row 3 for transition/react.

---

### palette.png (507×212) — 6 rows
**Original character: Primrose (Starseer)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 0–33 | 21 | 22px | ★ IDLE | **Primary idle** |
| 4 | 142–175 | 22 | 21px | ★ WALK | **Walk cycle** — best motion row |
| 3 | 106–139 | 21 | 22px | ~ GENERAL | Inspect — may have gesture |
| 5 | 178–211 | 1 | 20px | ~ | Single frame — possible final pose |
| 1 | 36–68 | 14 | 34px | ✗ | Weapon attack |
| 2 | 71–103 | 18 | 26px | ✗ | Mixed attack |

**Palette recommendation**: Row 0 for idle, Row 4 for walk (22 frames = rich cycle).

---

### sage.png (512×256) — 4 rows
**Original character: Cyrus (Cleric)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 2–34 | 22 | 20px | ★ IDLE | **Primary idle** |
| 2 | 77–108 | 21 | 21px | ~ GENERAL | Inspect — possible walk |
| 3 | 111–143 | 13 | 23px | ~ GENERAL | Inspect — possible transition |
| 1 | 37–74 | 17 | 27px | ✗ | Mixed attack |

**Sage recommendation**: Row 0 for idle, Row 2 for walk.

---

### forge.png (512×256) — 6 rows
**Original character: Cyrus (Warrior)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 2–38 | 22 | 21px | ★ IDLE | **Primary idle** |
| 4 | 154–187 | 23 | 19px | ~ GENERAL | Inspect — compact frames, possible walk |
| 5 | 190–223 | 7 | 19px | ~ GENERAL | Short animation |
| 1 | 41–73 | 15 | 31px | ✗ | Weapon attack |
| 2 | 76–116 | 15 | 31px | ✗ | Weapon attack |
| 3 | 119–151 | 19 | 24px | ✗ | Mixed attack |

**Forge recommendation**: Row 0 for idle, Row 4 for walk.

---

### tempo.png (512×512) — 11 rows
**Original character: Tressa (Merchant / Base)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 2–35 | 22 | 21px | ★ IDLE | **Primary idle** |
| 5 | 182–215 | 24 | 19px | ★ WALK | **Walk cycle** |
| 8 | 291–325 | 24 | 19px | ★ WALK | **Run cycle** |
| 9 | 328–362 | 25 | 18px | ★ WALK | **Compact run variant** |
| 10 | 365–398 | 17 | 17px | ★ WALK | **Fast run** |
| 6 | 218–252 | 21 | 22px | ~ GENERAL | Inspect |
| 7 | 255–288 | 21 | 22px | ~ GENERAL | Inspect |
| 1 | 38–71 | 21 | 20px | ✗ | Mixed attack |
| 2 | 74–107 | 14 | 34px | ✗ | Weapon attack |
| 3 | 110–143 | 22 | 21px | ✗ | Mixed attack |
| 4 | 146–179 | 22 | 21px | ✗ | Mixed attack |

**Tempo recommendation**: Row 0 for idle, Row 5 for walk, Row 8 for run. Richest animation set.

---

### recall.png (504×143) — 4 rows
**Original character: Tressa (Dancer)**

| Row | Y Range | Frames | Avg Width | Category | Use For |
|-----|---------|--------|-----------|----------|---------|
| 0 | 0–33 | 23 | 20px | ★ IDLE | **Primary idle** |
| 3 | 108–142 | 17 | 21px | ~ GENERAL | Inspect — possible walk/transition |
| 1 | 36–69 | 16 | 29px | ✗ | Weapon attack |
| 2 | 72–105 | 22 | 21px | ✗ | Mixed attack |

**Recall recommendation**: Row 0 for idle, Row 3 for walk. Smallest sprite set.

---

## 3. HOW TO MAKE ANIMATIONS SMOOTH

### Idle Animation (All Agents)

```typescript
// RULE: OT idle is NOT just static standing. It's a breathing loop.
// Extract frames 0-5 from Row 0 of each agent.
// The cycle is typically: stand → slight inhale → exhale → return
// Play at 6-8 FPS for gentle breathing feel.

const IDLE_CONFIG = {
  frameStart: 0,      // First frame index in Row 0
  frameCount: 4,      // Use 4-6 frames (NOT all 20+, most are transitions)
  fps: 6,             // Slow and gentle
  loop: true,
  pingPong: true,     // Play forward then backward for seamless loop
  // This creates: 0→1→2→3→2→1→0→1→2→3... = smooth breathing
};
```

### Walk Animation

```typescript
// RULE: Pick 4 or 8 evenly-spaced frames from the walk row.
// OT walk rows have 15-26 frames, but many are in-betweens.
// For pixel art, 4-frame walk looks better than 8 at low res.

const WALK_CONFIG = {
  fps: 8,             // 8 FPS for walk (faster than idle)
  loop: true,
  pingPong: false,    // Walk cycles are looping, not ping-pong

  // Frame selection strategy:
  // If row has N frames, pick every N/4th frame for a 4-frame cycle:
  // e.g., 24 frames → use frame 0, 6, 12, 18
  // This gives: contact, passing, contact, passing (standard walk cycle)
};

function selectWalkFrames(totalFrames: number, desiredCount: number = 4): number[] {
  const step = Math.floor(totalFrames / desiredCount);
  return Array.from({ length: desiredCount }, (_, i) => i * step);
}
```

### Run Animation

```typescript
// RULE: Same as walk but faster FPS and use a different row if available.
const RUN_CONFIG = {
  fps: 12,            // 12 FPS for run
  loop: true,
  pingPong: false,
};
```

### Side-View to Top-Down Workaround

These sprites are SIDE-VIEW (character faces right). For a top-down office game:

```typescript
// Option A: Use as side-scrolling view (simplest — looks great)
// The office is viewed from the side, like a dollhouse cross-section.
// Agents walk left/right. This matches the sprite perspective perfectly.

// Option B: Pseudo-isometric with sprite flipping
// - Walking RIGHT: use sprites as-is
// - Walking LEFT: flip sprites horizontally (scaleX = -1)
// - Walking UP/DOWN: use idle sprite with y-position change only
//   (OT battle sprites don't have up/down walk — this is acceptable)

// Option C (recommended): Side-view office with depth
// Rooms are arranged horizontally. Camera shows side cross-section.
// Characters walk left/right between rooms.
// This is the MOST AUTHENTIC use of these battle sprites.

const DIRECTION_CONFIG = {
  right: { flipX: false, useRow: 'walk' },
  left:  { flipX: true,  useRow: 'walk' },
  up:    { flipX: false, useRow: 'idle', yOffset: -1 }, // subtle bob
  down:  { flipX: false, useRow: 'idle', yOffset: +1 },
};
```

### PixiJS Implementation

```typescript
import { AnimatedSprite, Texture, Rectangle, BaseTexture } from 'pixi.js';

class AgentSprite {
  private sheet: BaseTexture;
  private animations: Map<string, Texture[]> = new Map();
  private sprite: AnimatedSprite;

  constructor(sheetUrl: string, config: AgentSpriteConfig) {
    this.sheet = BaseTexture.from(sheetUrl);
    this.extractAnimations(config);
  }

  private extractAnimations(config: AgentSpriteConfig) {
    // For each animation (idle, walk, run), extract frames from the correct row
    for (const [name, rowConfig] of Object.entries(config.animations)) {
      const frames = this.extractRowFrames(
        rowConfig.yStart,
        rowConfig.yEnd,
        rowConfig.frameIndices // which frames to use (e.g., [0,1,2,3])
      );
      this.animations.set(name, frames);
    }
  }

  private extractRowFrames(
    yStart: number, yEnd: number, indices?: number[]
  ): Texture[] {
    // Scan the row for frame boundaries (same algorithm as above)
    const frameBounds = this.detectFrameBounds(yStart, yEnd);

    // Select specific frames or all
    const selected = indices
      ? indices.map(i => frameBounds[i]).filter(Boolean)
      : frameBounds;

    // Create textures with PADDING for uniform size
    const maxWidth = Math.max(...selected.map(f => f.width));
    const height = yEnd - yStart + 1;

    return selected.map(frame => {
      return new Texture(this.sheet, new Rectangle(
        frame.x, yStart, frame.width, height
      ));
    });
  }

  play(animation: string) {
    const textures = this.animations.get(animation);
    if (!textures) return;

    this.sprite.textures = textures;
    this.sprite.animationSpeed = animation === 'idle' ? 0.1 : 0.15;
    this.sprite.play();
  }
}
```

### Frame Timing for Smoothness

```typescript
// CRITICAL: These values make OT sprites look alive vs robotic

const ANIMATION_SPEEDS = {
  idle: {
    fps: 6,
    // Add subtle Y bob: sin(time * 2) * 1px
    yBob: { amplitude: 1, frequency: 2 },
    // Add subtle shadow pulse synced to bob
    shadowScale: { min: 0.9, max: 1.0 },
  },
  walk: {
    fps: 8,
    // Add Y bob synced to step: sin(time * 4) * 2px
    yBob: { amplitude: 2, frequency: 4 },
    // Dust particles every 4th frame
    dustParticles: { interval: 4 },
  },
  run: {
    fps: 12,
    yBob: { amplitude: 3, frequency: 6 },
    dustParticles: { interval: 2 },
  },
  working: {
    // Reuse idle frames but add:
    // - Floating code/book particles above head
    // - Occasional "typing" frame (use frame 2-3 from idle which may show arm motion)
    fps: 4,
    yBob: { amplitude: 0.5, frequency: 1 },
  },
  sleeping: {
    // Use frame 0 from idle (standing still)
    // Add ZZZ particle system floating upward
    // Reduce opacity slightly (0.85)
    // Slower breathing bob
    fps: 2,
    yBob: { amplitude: 1, frequency: 0.5 },
    opacity: 0.85,
  },
};
```

---

## 4. QUICK REFERENCE — WHICH ROWS TO USE

| Agent | Idle Row | Walk Row | Run Row | Notes |
|-------|----------|----------|---------|-------|
| **chief** | Row 0 (f0-5) | Row 1 (f0-7) | Row 6 (f0-7) | Richest set — 14 rows total |
| **apex** | Row 0 (f0-5) | Row 0 (f8-15) | Row 0 (f8-15) | Limited — reuse idle row subsets |
| **pixel** | Row 0 (f0-5) | Row 3 (f0-7) | Row 3 (f8-15) | Row 3 has 23 frames — split walk/run |
| **archie** | Row 0 (f0-5) | Row 3 (f0-7) | Row 4 (f0-8) | Row 4 for transition/arriving |
| **bugsy** | Row 0 (f0-5) | Row 2 (f0-7) | Row 2 (f8-15) | Row 2 has 22 frames — split |
| **palette** | Row 0 (f0-5) | Row 4 (f0-7) | Row 4 (f8-15) | Row 4 is the dedicated walk row |
| **sage** | Row 0 (f0-5) | Row 2 (f0-7) | Row 2 (f8-15) | Row 2 has 21 frames |
| **forge** | Row 0 (f0-5) | Row 4 (f0-7) | Row 4 (f8-15) | Row 4 has 23 compact frames |
| **tempo** | Row 0 (f0-5) | Row 5 (f0-7) | Row 8 (f0-7) | Best variety — separate walk & run |
| **recall** | Row 0 (f0-5) | Row 3 (f0-7) | Row 3 (f8-15) | Smallest set — Row 3 only option |

---

## 5. MEDIEVAL OFFICE BACKGROUNDS

These sprites are side-view battle sprites. The best matching background approach:

### Option A: Side-View Cross-Section Office (RECOMMENDED)
Build a "dollhouse" view — rooms visible from the side, walls cut away:

**Best matching tilesets:**
- [Mucho Pixels Medieval Interiors ($4.95)](https://muchopixels.itch.io/medieval-interiors-tileset-pack) — Writing desks, bookshelves, chairs, chandeliers, fireplaces. 16x16 grid. **Best match for OT style.**
- [CraftPix Medieval Interior ($9.99)](https://craftpix.net/product/medieval-interior-top-down-pixel-art-tileset/) — Walls, stairs, windows, doors, shelves. 16/32/48/64px.
- [Elthen Medieval Shop Interior](https://elthen.itch.io/2d-pixel-art-medieval-shop) — Side-view shop interior. Closest perspective match to battle sprites.
- [Free Medieval Tileset (CraftPix)](https://craftpix.net/freebies/free-medieval-tileset-pixel-art-pack/) — Free exterior tiles + doors, barrels, torches.

### Option B: Top-Down Office with Side-View Sprites
If you want top-down world view, the sprites still work — they just face sideways while the world is top-down (like classic Final Fantasy battle transitions). Many JRPGs do this.

**Best tilesets for top-down:**
- [LimeZu Modern Office ($2.50)](https://limezu.itch.io/modernoffice) — 300+ office sprites, desks, computers, chairs
- [Free RPG Interior Pack (itch.io)](https://itch.io/game-assets/free/tag-interior/tag-tileset) — Browse free options
- [Mini Medieval Interior Expansion](https://itch.io/game-assets/tag-medieval/tag-tileset) — Browse medieval tilesets

### My Recommendation
**Go side-view cross-section.** It matches the sprites perfectly — no perspective clash. Build the office as horizontal rooms connected by hallways, viewed from the side like a platformer. Agents walk left/right. This looks most like an actual Octopath Traveler scene.

---

*Sprite Animation Guide v1.0 — March 18, 2026*
*Frame data extracted via automated pixel-level transparency scanning*
