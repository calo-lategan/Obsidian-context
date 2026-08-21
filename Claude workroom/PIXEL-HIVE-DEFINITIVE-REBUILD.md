# PIXEL HIVE — Definitive Full Rebuild Prompt

> **This replaces ALL previous prompts.** Copy this into Claude Code CLI.
> **Delete the existing pixel-hive/ directory and start fresh.**

---

## 0. WHAT THIS IS

A gamified HD-2D pixel art virtual office webapp where 10 AI agent characters live, work, and collaborate — powered by Claude Code Agent SDK running on your local machine. You type in a browser chat box → agents receive the message → they do real work via Claude Code → results stream back to the browser in real-time.

### The Problem With the Current Build
The existing codebase has these fatal issues — DO NOT try to patch, rebuild from scratch:

1. **Wrong SDK installed** — Has `@anthropic-ai/sdk` (API SDK for chat completions). Needs `@anthropic-ai/claude-agent-sdk` (Agent SDK that spawns Claude Code as subprocess with full tool access: Read, Write, Edit, Bash, etc.)
2. **Fake agent responses** — `/api/chat/route.ts` uses hardcoded strings with `delay()` timers. No real Claude Code execution.
3. **Broken sprite loading** — Assumes 64×64 fixed grid. OT battle sprites are variable-width packed frames. Every sprite fails to load and falls back to drawn chibis.
4. **No engine** — `src/engine/` directory is empty. No orchestrator, no agent loop, no memory system, no sleep/wake.
5. **No real SSE** — broadcaster exists but only sends canned messages from the fake chat route.

---

## 1. TECH STACK

| Layer | Package | Version | Why |
|-------|---------|---------|-----|
| Framework | Next.js | 16 (App Router) | SSR + API routes + React 19 |
| Rendering | pixi.js | ^8.17 | WebGL, filters, sprites |
| PixiJS React | @pixi/react | ^8 | React bindings |
| Bloom filter | @pixi/filter-advanced-bloom | latest | Window/lantern glow |
| Tilt-shift | @pixi/filter-tilt-shift | latest | HD-2D depth of field |
| State | zustand | ^5 | Client + server shared state |
| Database | better-sqlite3 | ^12 | Local persistent storage |
| **Agent Brain** | **@anthropic-ai/claude-agent-sdk** | **latest** | **Spawns Claude Code subprocess** |
| IDs | nanoid | ^5 | Task/session IDs |
| Styling | tailwindcss | ^4 | Utility CSS |
| Tunnel | ngrok or cloudflared | CLI | Phone access |

```bash
# INSTALL COMMAND
npx create-next-app@latest pixel-hive --typescript --tailwind --app --src-dir
cd pixel-hive
npm install pixi.js @pixi/react @pixi/filter-advanced-bloom @pixi/filter-tilt-shift
npm install zustand better-sqlite3 @types/better-sqlite3
npm install @anthropic-ai/claude-agent-sdk
npm install nanoid
```

---

## 2. THE AGENT SDK — HOW IT ACTUALLY WORKS

This is the CORE of the whole system. Every agent interaction = one `query()` call that spawns a Claude Code subprocess.

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// This spawns a REAL Claude Code process that can Read, Write, Edit, Bash, etc.
const agentSession = query({
  prompt: "Implement the authentication module using NextAuth.js",
  options: {
    cwd: '/path/to/project',                    // Working directory
    model: 'sonnet',                             // or 'opus' for complex tasks
    allowedTools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    maxTurns: 25,                                // Max tool-use turns
    systemPrompt: `You are Pixel, the Senior Builder...`, // Agent personality
    sessionId: 'previous-session-uuid',          // Resume conversation
    continue: true,                              // Continue last session
    abortController: new AbortController(),      // Cancel on sleep
  }
});

// Stream real responses back
for await (const message of agentSession) {
  if (message.type === 'assistant') {
    // message.content has text blocks and tool_use blocks
    // Broadcast to browser via SSE
    broadcastEvent({
      type: 'agent_message',
      agentId: 'pixel',
      content: extractText(message),
      to: 'all'
    });
  }
}
```

### Session Resume (Critical for Sleep/Wake)
```typescript
import { listSessions, getSessionMessages } from '@anthropic-ai/claude-agent-sdk';

// On wake: find the last session for each agent
const sessions = await listSessions({ dir: projectDir, limit: 1 });
if (sessions[0]) {
  // Resume where they left off
  const resumed = query({
    prompt: "Continue where you left off. Read your handoff notes in memory/hive-sleep/",
    options: { sessionId: sessions[0].sessionId, continue: true }
  });
}
```

### Concurrency Model
```
Owner sends message → Router determines intent
  → Technical? → Code Orchestrator (1 query() session)
     → Chief acknowledges → Apex reviews → assigns to Pixel/Bugsy/Forge
  → Research/creative? → Cowork Orchestrator (1 query() session)
     → Chief acknowledges → delegates to Archie/Palette/Sage/Tempo/Recall
  → Complex? → BOTH orchestrators parallel (2 query() sessions max)
```

---

## 3. AVAILABLE TILE ASSETS (Already in public/tiles/)

### free-office-pixel-art/ (Top-down office sprites)
- `desk-with-pc.png` — Desk with monitor (top-down)
- `desk.png` — Plain desk
- `Chair.png` — Office chair
- `cabinet.png` — Filing cabinet
- `coffee-maker.png` — Coffee machine
- `PC1.png`, `PC2.png` — Computer monitors
- `plant.png` — Office plant
- `printer.png` — Printer
- `sink.png` — Sink
- `water-cooler.png` — Water cooler
- `office-partitions-1.png`, `office-partitions-2.png` — Cubicle walls
- `stamping-table.png` — Stamp desk
- `writing-table.png` — Writing desk
- `Trash.png` — Trash can
- `boss.png` — Boss character sprite
- `worker1.png`, `worker2.png`, `worker4.png` — Worker sprites
- `Julia.png`, `Julia-Idle.png`, `Julia_walk_*.png`, `Julia_PC.png`, `Julia_Drinking_Coffee.png` — Full character animation set (idle, walk 4-dir, working, drinking)

### Pixel Art Top Down - Basic v1.2.3/Texture/ (Ground + structures)
- `TX Tileset Grass.png` — Grass tile variants + stone path tiles
- `TX Tileset Stone Ground.png` — Stone/cobble ground
- `TX Struct.png` — Building structures (walls, roofs)
- `TX Props.png` — Props (barrels, crates, etc.)
- `TX Plant.png` — Trees, bushes, flowers
- `TX Player.png` — Player character
- `TX Shadow.png`, `TX Shadow Plant.png` — Shadow sprites
- Extra/ — Shadow variants for plants and props

### Isoverse medieval outdoors free/ (Isometric buildings)
- `Assets free version.png` — Isometric ground tiles + 2 medieval Tudor cottages + tree + rock

### How to use these:
```typescript
// Load individual sprites as Textures
const deskTexture = await PIXI.Assets.load('/tiles/free-office-pixel-art/desk-with-pc.png');
const deskSprite = new PIXI.Sprite(deskTexture);

// Load tileset and slice into individual tiles
const grassSheet = await PIXI.Assets.load('/tiles/Pixel Art Top Down - Basic v1.2.3/Texture/TX Tileset Grass.png');
// Grass tiles are 32×32 in the sheet
```

---

## 4. CHARACTER SPRITES (Already in public/sprites/)

### CRITICAL: These are Octopath Traveler BATTLE sprites (side-view, facing RIGHT)

**They are NOT on a fixed grid. They are variable-width packed frames.**

| Agent | File | Size | Rows | Original Character |
|-------|------|------|------|--------------------|
| chief | chief.png | 512×512 | 14 | Cyrus (Scholar/Base) |
| apex | apex.png | 512×256 | 5 | Ophilia (Warmaster) |
| pixel | pixel.png | 508×191 | 5 | Tressa (Hunter) — cat ears |
| archie | archie.png | 500×175 | 5 | Tressa (Scholar) — golden outfit |
| bugsy | bugsy.png | 512×256 | 4 | Ophilia (Sorcerer) — blue/teal |
| palette | palette.png | 507×212 | 6 | Primrose (Starseer) — curly hair |
| sage | sage.png | 512×256 | 4 | Tressa (Dancer) — green outfit |
| forge | forge.png | 512×256 | 6 | Ophilia variant — blonde, red |
| tempo | tempo.png | 512×512 | 11 | Tressa (Merchant/Base) — feathered hat |
| recall | recall.png | 504×143 | 4 | Tressa (Dancer) — golden dress |

### Frame Extraction Algorithm (MANDATORY)
```typescript
// DO NOT use fixed grid. Scan transparency to find frames.
function extractFramesFromSheet(imageData: ImageData): AnimRow[] {
  // 1. Find row bands: scan rows for any non-transparent pixel
  //    Group consecutive content rows into bands (separated by blank rows)
  // 2. For each band, find frame columns: scan columns for content
  //    Group consecutive content columns into frames (separated by blank cols)
  // 3. Each frame = crop(xStart, yStart, width, bandHeight)
  // 4. Center each frame on a uniform canvas (e.g., 48×38) for rendering
}
```

### Verified Animation Map (Visually inspected frame-by-frame)

**LAYOUT PATTERN: Attacks top → Idle MIDDLE → Walk later → More attacks bottom**
**Idle starts PARTWAY through a row after an attack ends.**

| Agent | IDLE | SLEEP | WALK | RUN | EXCLUDE |
|-------|------|-------|------|-----|---------|
| **chief** | Row3 f4→ + Row4 f0-17 + Row5 f0-22 | Row4 f18-19 (L/R) | Row6 | Row7 | Row0-2 (attacks), Row12-13 (staff) |
| **apex** | Row3 f3→end | Row3 f2 (blue cape) | Row4 | Row4 faster | Row0-2 (weapon) |
| **pixel** | Row3 full | — | Row4 (4f only) | same | Row0 (buff), Row1-2 (weapon) |
| **archie** | Row3 f5→end | — | Row4 (9f) | same faster | Row0-2 (weapon/magic) |
| **bugsy** | Row2 f10→18 | Row2 f19-21 (sit) | Row3 | same faster | Row0-1 (weapon/magic) |
| **palette** | Row3 f4-18 | — | Row4 f4→end | same faster | Row0-2 (weapon) |
| **sage** | Row2 f2→end | — | Row3 | same faster | Row0-1 (weapon) |
| **forge** | Row4 f0-19 | Row4 f20-22 + Row5 | Row3 f10→end | — | Row0-2 (weapon) |
| **tempo** | Row5 full | — | Row8 | Row9 | Row0-4 (weapon), Row2 (spear) |
| **recall** | Row2 f8→end | Row3 f13-16 (sit→lie) | Row3 f2-8 | same faster | Row0-1 (weapon) |

### Animation Config Per Agent
```typescript
interface SpriteAnimConfig {
  idle:  { row: number; startFrame: number; endFrame: number };
  sleep?: { row: number; startFrame: number; endFrame: number };
  walk:  { row: number; startFrame: number; endFrame: number };
  run?:  { row: number; startFrame: number; endFrame: number };
}

const SPRITE_CONFIGS: Record<string, SpriteAnimConfig> = {
  chief:   { idle: {row:3,startFrame:4,endFrame:21}, sleep: {row:4,startFrame:18,endFrame:19}, walk: {row:6,startFrame:0,endFrame:25}, run: {row:7,startFrame:0,endFrame:19} },
  apex:    { idle: {row:3,startFrame:3,endFrame:21}, sleep: {row:3,startFrame:2,endFrame:2},   walk: {row:4,startFrame:0,endFrame:13} },
  pixel:   { idle: {row:3,startFrame:0,endFrame:22},                                           walk: {row:4,startFrame:0,endFrame:3} },
  archie:  { idle: {row:3,startFrame:5,endFrame:20},                                           walk: {row:4,startFrame:0,endFrame:8} },
  bugsy:   { idle: {row:2,startFrame:10,endFrame:18}, sleep: {row:2,startFrame:19,endFrame:21}, walk: {row:3,startFrame:0,endFrame:10} },
  palette: { idle: {row:3,startFrame:4,endFrame:18},                                           walk: {row:4,startFrame:4,endFrame:21} },
  sage:    { idle: {row:2,startFrame:2,endFrame:20},                                           walk: {row:3,startFrame:0,endFrame:12} },
  forge:   { idle: {row:4,startFrame:0,endFrame:19}, sleep: {row:5,startFrame:0,endFrame:6},   walk: {row:3,startFrame:10,endFrame:18} },
  tempo:   { idle: {row:5,startFrame:0,endFrame:23},                                           walk: {row:8,startFrame:0,endFrame:23}, run: {row:9,startFrame:0,endFrame:24} },
  recall:  { idle: {row:2,startFrame:8,endFrame:21}, sleep: {row:3,startFrame:13,endFrame:16}, walk: {row:3,startFrame:2,endFrame:8} },
};
```

### Smoothness Rules
```
IDLE:  6 FPS, ping-pong (0→1→2→3→2→1→0), 1px Y breathing bob
WALK:  8 FPS, forward loop, pick every Nth frame for 4-6 frame subset, 2px Y step bob
RUN:   12 FPS, same but bigger bob (3px) + dust particles
SLEEP: Static frame or 2 FPS, add ZZZ particles, opacity 0.85
DIRECTION: Facing right = default. Flip scaleX=-1 for left.
```

---

## 5. AGENT SYSTEM WITH Ω-AGI COGNITIVE OS

### Thinking Modes (Chief-controlled per task)
| Mode | Reasoning Steps | When |
|------|----------------|------|
| **medium** | 3-5 | Routine: file edits, status updates, known patterns |
| **high** | 8-12 | Complex: architecture, multi-file refactors, research |
| **max** | 15-25 | Critical: security review, novel problems, system design |

### Model Selection (Chief-controlled)
| Model | When |
|-------|------|
| **sonnet** | Default. Routine coding, research, docs, status updates |
| **opus** | Architecture decisions, security audits, complex debugging, conflict resolution |

### Chief's Assignment Format
```typescript
interface TaskAssignment {
  agentId: string;
  task: string;
  thinkingMode: 'medium' | 'high' | 'max';
  model: 'sonnet' | 'opus';
  maxTurns: number;
}
```

Chief maps complexity → thinking mode → model:
- Complexity 1-3 → medium/sonnet
- Complexity 4-6 → high/sonnet
- Complexity 7-8 → high/opus
- Complexity 9-10 → max/opus

### Agent Tool Permissions
```typescript
const AGENT_TOOLS: Record<string, string[]> = {
  chief:   ['Read', 'Bash', 'Glob'],
  apex:    ['Read', 'Grep', 'Glob', 'Bash'],
  pixel:   ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
  bugsy:   ['Read', 'Bash', 'Grep', 'Glob'],
  forge:   ['Read', 'Write', 'Edit', 'Bash', 'Glob'],
  archie:  ['Read', 'WebSearch', 'WebFetch', 'Glob', 'Grep', 'Bash'],
  palette: ['Read', 'Glob'],
  sage:    ['Read', 'Write', 'Glob', 'Grep'],
  tempo:   ['Read', 'Glob'],
  recall:  ['Read', 'Write', 'Glob', 'Grep'],
};
```

### Agent Roster
| ID | Name | Emoji | Role | Color | Orchestrator |
|----|------|-------|------|-------|-------------|
| chief | Chief | 👑 | CEO/Manager | #ffd700 | Cowork |
| apex | Apex | 🔧 | CTO | #00bfff | Code |
| archie | Archie | 🔬 | Researcher | #ff6b9d | Cowork |
| pixel | Pixel | 🏗️ | Builder | #00ff88 | Code |
| bugsy | Bugsy | 🧪 | QA Lead | #ff4444 | Code |
| palette | Palette | 🎨 | Designer | #cc66ff | Cowork |
| sage | Sage | 📚 | Skill Architect | #ffaa00 | Cowork |
| forge | Forge | 🔌 | Plugin Engineer | #44aaff | Code |
| tempo | Tempo | 📅 | Ops Lead | #88ddff | Cowork |
| recall | Recall | 🗄️ | Archivist | #aaddaa | Cowork |

---

## 6. FULL PROJECT STRUCTURE

```
pixel-hive/
├── CLAUDE.md                              ← Session context
├── package.json
├── next.config.ts
├── tailwind.config.ts
│
├── public/
│   ├── sprites/                           ← OT battle sprite sheets (ALREADY HERE)
│   │   ├── chief.png ... recall.png       ← 10 agent sprites
│   │   └── unused_*.png                   ← Extra sprites
│   └── tiles/                             ← Tile assets (ALREADY HERE)
│       ├── free-office-pixel-art/         ← Office furniture sprites
│       ├── Pixel Art Top Down - Basic/    ← Grass, stone, structures, props
│       └── Isoverse medieval outdoors/    ← Isometric buildings
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                       ← Main: Canvas + Dashboard + SSE
│   │   ├── globals.css
│   │   └── api/
│   │       ├── chat/route.ts              ← POST: owner message → orchestrator
│   │       ├── stream/route.ts            ← GET: SSE event stream
│   │       ├── state/route.ts             ← GET: full world snapshot
│   │       ├── wake/route.ts              ← POST: wake agents
│   │       └── sleep/route.ts             ← POST: go home
│   │
│   ├── components/
│   │   ├── world/
│   │   │   ├── HiveCanvas.tsx             ← PixiJS 8 main canvas
│   │   │   ├── SpriteLoader.ts            ← Variable-width frame extractor
│   │   │   └── PostProcessing.ts          ← Bloom + TiltShift
│   │   ├── dashboard/
│   │   │   ├── DashPanel.tsx              ← Tabbed sidebar
│   │   │   ├── ChatTab.tsx                ← THE message input box
│   │   │   ├── TeamTab.tsx                ← Agent stats
│   │   │   └── TasksTab.tsx               ← Kanban board
│   │   └── controls/
│   │       └── Header.tsx                 ← Logo, speed, wake/sleep buttons
│   │
│   ├── engine/                            ← THE BRAIN (server-side only)
│   │   ├── orchestrator.ts                ← Message router
│   │   ├── codeOrchestrator.ts            ← Manages Apex→Pixel→Bugsy→Forge
│   │   ├── coworkOrchestrator.ts          ← Manages Chief→Archie→Palette→etc
│   │   ├── agentQuery.ts                  ← Wrapper around Agent SDK query()
│   │   ├── agentLoop.ts                   ← Stanford observe→reflect→plan→act
│   │   ├── memory.ts                      ← SQLite memory stream
│   │   └── sleepWake.ts                   ← Full Go Home / Wake Up protocol
│   │
│   └── lib/
│       ├── agentProfiles.ts               ← 10 agent personalities + system prompts
│       ├── spriteConfigs.ts               ← Animation row/frame configs per agent
│       ├── broadcaster.ts                 ← SSE event broadcaster
│       ├── constants.ts                   ← Palette, rooms, sizes
│       ├── db.ts                          ← SQLite schema + queries
│       ├── store.ts                       ← Zustand store
│       └── types.ts                       ← All TypeScript interfaces
│
├── memory/                                ← Persisted agent state
│   └── hive-sleep/                        ← Handoff notes
└── data/
    └── hive.db                            ← SQLite file
```

---

## 7. BUILD ORDER (Strictly Sequential)

### Phase 1: Scaffold + Agent SDK (Day 1)
1. Create project, install deps (including `@anthropic-ai/claude-agent-sdk`)
2. Set up SQLite schema (keep existing — it's good)
3. Implement `engine/agentQuery.ts` — real Agent SDK wrapper
4. Implement `engine/orchestrator.ts` — routes messages to code/cowork orchestrator
5. Implement real `/api/chat/route.ts` — calls orchestrator, NOT fake delay responses
6. Verify: send a message from browser → real Claude Code subprocess runs → real response streams back
7. **THIS IS THE #1 PRIORITY. Nothing else matters until real SDK works.**

### Phase 2: SpriteLoader + Corrected Animations (Day 2)
1. Implement `SpriteLoader.ts` — transparency-scanning frame extractor
2. Implement `spriteConfigs.ts` — per-agent row/frame configs from the verified map above
3. Fix `HiveCanvas.tsx` — use SpriteLoader instead of fixed 64×64 grid
4. Verify: all 10 agents render with correct idle animation (not chibi fallbacks)

### Phase 3: HD-2D Post-Processing (Day 3)
1. Add `@pixi/filter-advanced-bloom` — warm glow on windows/lanterns
2. Add `@pixi/filter-tilt-shift` — depth of field (top/bottom blur)
3. Vignette overlay
4. Verify: screenshot looks like Octopath Traveler, not a flat pixel game

### Phase 4: Dashboard + Chat (Day 4)
1. ChatTab with real message input → POST /api/chat
2. TeamTab showing live agent stats from Zustand
3. TasksTab showing kanban board from SQLite
4. Header with Wake/Sleep buttons

### Phase 5: Sleep/Wake Protocol (Day 5)
1. Implement `engine/sleepWake.ts`
2. Go Home: abort all sessions → write handoff notes → agents walk to cottages → ZZZ
3. Wake: load notes → agents walk to desks → standup → resume sessions
4. Auto-wake if message received while sleeping

### Phase 6: Remote Access (Day 6)
1. ngrok or cloudflared tunnel
2. `NEXT_PUBLIC_BACKEND_URL` env var
3. Mobile-responsive layout

---

## 8. DOs and DON'Ts

### DOs
- DO install `@anthropic-ai/claude-agent-sdk` (NOT `@anthropic-ai/sdk`)
- DO use `query()` to spawn real Claude Code subprocesses
- DO scan sprite sheet transparency to find variable-width frames
- DO use the verified animation map (idle is MIDDLE rows, not Row 0)
- DO use PixiJS 8 with AdvancedBloomFilter + TiltShiftFilter
- DO use warm earth tone palette (#c4a882 stone, #6b4e32 wood, #ffdd88 glow)
- DO persist Agent SDK session IDs in SQLite for resume
- DO write handoff notes on every sleep
- DO support auto-wake from browser message
- DO stream real agent responses via SSE
- DO load tile assets from the existing `public/tiles/` folders

### DON'Ts
- DON'T use `@anthropic-ai/sdk` — that's the API SDK, not Agent SDK
- DON'T fake agent responses with `delay()` and canned strings
- DON'T assume sprites are on a fixed grid (64×64 or any size)
- DON'T put idle on Row 0 — it's ALWAYS an attack row
- DON'T skip post-processing (bloom + tilt-shift = the HD-2D look)
- DON'T use dark sci-fi colors
- DON'T skip the transparency-scan frame extraction
- DON'T let agents act identically — each has unique personality/voice
- DON'T store sessions only in memory — persist to SQLite

---

## 9. KEY REFERENCE DOCS

| Resource | URL |
|----------|-----|
| Claude Agent SDK npm | https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk |
| Agent SDK TypeScript Reference | https://code.claude.com/docs/en/agent-sdk/typescript |
| Agent SDK query() docs | https://code.claude.com/docs/en/agent-sdk/typescript#query |
| Session management | https://code.claude.com/docs/en/agent-sdk/typescript#listsessions |
| a16z AI Town Architecture | https://github.com/a16z-infra/ai-town/blob/main/ARCHITECTURE.md |
| Stanford Smallville Paper | https://arxiv.org/abs/2304.03442 |
| PixiJS 8 Docs | https://pixijs.download/release/docs/index.html |
| PixiJS AdvancedBloom | https://filters.pixijs.download/main/docs/index.html |
| PixiJS TiltShift | https://filters.pixijs.download/main/docs/index.html |

---

## 10. FIRST SESSION CHECKLIST

1. ✅ Read this ENTIRE document
2. ✅ `rm -rf pixel-hive && npx create-next-app@latest pixel-hive --typescript --tailwind --app --src-dir`
3. ✅ Install ALL dependencies (especially `@anthropic-ai/claude-agent-sdk`)
4. ✅ Copy `public/sprites/` and `public/tiles/` from the old project
5. ✅ Set up SQLite schema
6. ✅ Implement `engine/agentQuery.ts` with REAL Agent SDK `query()`
7. ✅ Implement `engine/orchestrator.ts` routing to code/cowork
8. ✅ Implement `/api/chat/route.ts` calling real orchestrator
9. ✅ Send test message → verify real Claude Code subprocess runs
10. ✅ Implement `SpriteLoader.ts` with transparency-scanning
11. ✅ Load all 10 agents with correct idle frames (NOT Row 0!)
12. ✅ Add bloom + tilt-shift post-processing
13. ✅ Take screenshot — must look like Octopath Traveler

**Priority order: Real SDK > Correct sprites > HD-2D effects > Dashboard > Sleep/Wake > Remote**

---

*Definitive Rebuild Prompt — March 18, 2026*
*Consolidates: Master Prompt V2 + Agent System + Sprite Guide V2 + Asset Catalog + Codebase Audit*
