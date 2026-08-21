# PIXEL HIVE — Complete Rebuild Master Prompt for Claude Code CLI

> **Copy this ENTIRE document into a Claude Code CLI session to build the webapp from scratch.**
> **Read EVERYTHING before writing a single line of code.**

---

## 0. WHAT YOU ARE BUILDING

**Pixel Hive** is a gamified HD-2D pixel art virtual office web app where 10+ AI agent characters live, work, collaborate, learn, and grow — all powered by Claude Code running locally on the user's machine.

The owner types messages in the browser. Those messages route to Claude Code Agent SDK running as a local backend. Orchestrator agents delegate to specialist agents. Agents complete real work (coding, research, design, QA) and the pixel world shows them doing it in real-time.

**Think: Octopath Traveler visual style + Stanford Generative Agents + Claude Code as the brain.**

### Core Loop
```
Owner types in browser chat
  → Message hits local Next.js API route
    → Routed to Claude Agent SDK query()
      → Orchestrator decides which agents respond
        → Agents execute tasks via Claude Code tools
          → Results stream back to browser
            → Pixel world updates: agents move, talk, work
              → Owner sees progress in real-time
```

### When Owner Presses "Go Home"
```
All agents find a stopping point for current operations
  → Each agent writes handoff notes to memory/
    → Orchestrators compile daily summary
      → All agent sprites walk to their cottages
        → All Claude Code subprocesses terminate
          → Token usage stops completely
            → State fully persisted to SQLite + JSON files
              → Owner can wake them later from browser — no CLI needed
```

---

## 1. HD-2D VISUAL STYLE — OCTOPATH TRAVELER REFERENCE

This is the **#1 visual priority**. Without these effects, it looks like a generic pixel game.

### Reference Images (Study These Before Coding)

**Official Sources:**
- Square Enix Press Assets: https://press.na.square-enix.com/OCTOPATH-TRAVELER-II/Focus/Pixel-Art
- Unreal Engine Spotlight (developer interview): https://www.unrealengine.com/en-US/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true
- Unreal Engine OT2 Interview: https://www.unrealengine.com/en-US/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style

**Sprite Sheets (actual game assets):**
- The Spriters Resource OT1: https://www.spriters-resource.com/nintendo_switch/octopathtraveler/
- The Spriters Resource OT2: https://www.spriters-resource.com/nintendo_switch/octopathtravelerii/
- Individual character sheets: Tressa, Primrose, Cyrus, Ophilia, etc.

**Community Screenshots:**
- RPGFan Gallery (OT2): https://www.rpgfan.com/gallery/octopath-traveler-ii-screenshots/
- Steam Community Screenshots: https://steamcommunity.com/app/1971650/screenshots/
- Alpha Coders HD Wallpapers: https://alphacoders.com/octopath-traveler
- Pinterest Collections: https://www.pinterest.com/ideas/octopath-traveler-pixel-art/938895293824/

### The 6 Pillars of HD-2D (ALL Required)

#### Pillar 1: Tilt-Shift Depth of Field (THE Signature Effect)
- Strong gaussian blur on top ~20% and bottom ~20% of viewport
- Sharp focus band in center ~60%
- Creates miniature/diorama feel
- Transition MUST be gradual (feathered), not hard line
- Top blur stronger (6-8px) than bottom blur (4-6px)
- **PixiJS**: Use `TiltShiftFilter` from `@pixi/filter-tilt-shift`

#### Pillar 2: Bloom and Glow on ALL Light Sources
- Every light gets warm golden bloom: windows, lanterns, monitors, lamps
- Bloom spills BEYOND source boundaries — that overflow IS the effect
- Bloom color: warm (#ffe4b5, #ffdd88) for interior lights
- Monitor screens get colored bloom matching screen color
- **PixiJS**: Use `AdvancedBloomFilter` from `@pixi/filter-advanced-bloom`

#### Pillar 3: Warm Earth Tone Palette
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
Water:              #3a6a8a, #4a7a9a (pond/stream blues)
```
**CRITICAL**: NO dark sci-fi colors (#0c0e1a, #2a2440). Think medieval European village.

#### Pillar 4: 3/4 Top-Down Perspective (NOT flat)
- Buildings show front face AND roof — slight isometric angle
- Objects have visible "thickness"
- Shadows cast DOWN and RIGHT (light from upper-left)
- Floor tiles have subtle 3D beveling
- Buildings sit ON ground with visible foundation/base shadow

#### Pillar 5: Rich Environmental Detail
- Ground NOT uniform — grass tufts, dirt with pebbles, stone with cracks
- Trees: 3-layer foliage (dark base, medium mid, bright highlights), visible bark
- Buildings: visible brick/wood grain, window frames, flower boxes
- Scattered props: barrels, crates, well, signposts, benches
- Flowers and small plants along paths and building edges

#### Pillar 6: Atmospheric Particles and Volumetric Light
- ~30 warm golden dust motes floating upward
- Light rays through windows (triangular glow cones on floor)
- Fireflies at evening/night
- Gentle fog/haze at scene edges
- Chimney smoke from main office

### PixiJS 8 Rendering Pipeline (Layer Stack)
```
Layer 0:  Sky gradient (Container with Graphics)
Layer 1:  Far background — pre-blurred distant trees/mountains
Layer 2:  Ground tiles — grass, dirt, cobblestone with detail
Layer 3:  Ground decorations — tufts, flowers, pebbles, puddles
Layer 4:  Building shadows — dark ellipses under structures
Layer 5:  Buildings/furniture — Tudor-style offices (Y-sorted)
Layer 6:  Building decorations — flower boxes, signs, barrels
Layer 7:  Agent shadows — soft ellipses under characters
Layer 8:  Agent sprites — Y-sorted for depth (lower Y = behind)
Layer 9:  Agent UI — name tags, speech bubbles, status icons
Layer 10: Foreground — close bushes/trees (slightly blurred)
Layer 11: Particles — dust motes, light rays, fireflies
Layer 12: Post-processing container with filters:
          ├── AdvancedBloomFilter (bloom on emissive layer)
          ├── TiltShiftFilter (depth of field)
          └── Custom vignette shader
Layer 13: Time-of-day color grading overlay
Layer 14: HUD/UI — clock, controls (NOT affected by filters)
```

### Building Style Reference
- **Tudor/half-timber** buildings (dark beams on plaster walls, X-pattern timber)
- Pitched thatch or tile roofs in gold-brown
- Small glowing windows with warm interior light
- Flower boxes under windows, lanterns by doors
- Chimney with smoke particles on main office
- Foundation stones visible at base
- Ambient occlusion shadows under all structures
- Multiple building types:
  - **Main Office**: large Tudor building, multiple desks inside
  - **Meeting Room**: smaller wing with round table, lanterns
  - **Break Room**: rustic hut with thatched roof, coffee cart, garden
  - **Agent Cottages**: 10+ small homes along a path, each with agent's color accent

### Character Sprite Specifications
- **Base size**: 16x24 pixels, rendered at 3x scale (48x72 on screen)
- **Directions**: 4 (down, left, right, up)
- **Walk cycle**: 4 frames per direction with arm swing
- **Idle**: 2-frame breathing/bob animation
- **Working**: 3-frame typing animation
- **Sleeping**: 2-frame with ZZZ particle
- Each agent has: unique hair, unique clothing color, unique accessory
- **Pre-made sprite sheets** required (see assets section below)

### Name Tags (MANDATORY on every agent)
- Dark semi-transparent pill (#00000099) with rounded corners
- Contents: [emoji] [Name] Lv.[N]
- Name in agent's color, level in gold (#d4a020)
- Below pill: small status icon (💻🗣️☕📖🚶💤)
- Gentle floating bob synced with character sprite
- Selected agent: golden glow ring + golden ellipse under feet

---

## 2. ARCHITECTURE

### Runtime Model
```
┌─────────────────────────────────────────────────────────┐
│  BROWSER (Vercel-hosted frontend)                       │
│  ├── PixiJS 8 Canvas (HD-2D pixel world)               │
│  ├── React UI (dashboard, chat, controls)              │
│  ├── Zustand (client state)                            │
│  └── SSE/WebSocket client → local backend              │
├─────────────────────────────────────────────────────────┤
│  LOCAL BACKEND (always running on laptop)               │
│  Next.js API routes on localhost:3001                   │
│  ├── /api/chat     — receives browser messages          │
│  ├── /api/agents   — agent commands & status            │
│  ├── /api/stream   — SSE stream of agent activity       │
│  ├── /api/state    — full world state snapshot          │
│  ├── /api/wake     — wake all agents from sleep         │
│  ├── /api/sleep    — trigger Go Home protocol           │
│  │                                                      │
│  ├── Claude Agent SDK (@anthropic-ai/claude-agent-sdk) │
│  │   ├── query() spawns Claude Code subprocess         │
│  │   ├── Typed message streaming                       │
│  │   ├── Session management (resume conversations)     │
│  │   └── Tool approval via allowedTools                │
│  │                                                      │
│  ├── Orchestrator Layer                                 │
│  │   ├── Code Orchestrator (manages: Apex, Pixel,      │
│  │   │   Bugsy, Forge)                                 │
│  │   └── Cowork Orchestrator (manages: Chief, Archie,  │
│  │       Palette, Sage, Tempo, Recall)                 │
│  │                                                      │
│  ├── SQLite (better-sqlite3)                           │
│  │   ├── agent_memories — long-term memory stream      │
│  │   ├── agent_reflections — higher-order thoughts     │
│  │   ├── tasks — kanban task board                     │
│  │   ├── messages — chat history                       │
│  │   ├── meetings — meeting logs                       │
│  │   └── handoff_notes — sleep/wake state              │
│  │                                                      │
│  └── Zustand store (server-side, synced to browser)    │
│      ├── Agent positions, status, mood, energy, XP     │
│      ├── World time, speed, pause state                │
│      └── Active conversations                          │
├─────────────────────────────────────────────────────────┤
│  TUNNEL (for remote access from phone)                  │
│  ngrok / Cloudflare Tunnel / Tailscale                  │
│  Exposes localhost:3001 → https://your-hive.ngrok.io   │
│  Vercel frontend configured to connect to tunnel URL    │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend Framework | Next.js 16 (App Router) | SSR, API routes, React 19 |
| Pixel Rendering | PixiJS 8 + @pixi/react | GPU WebGL, built-in bloom/tilt-shift filters |
| UI State | Zustand | Simple, fast, no boilerplate |
| Persistent State | better-sqlite3 | Local, fast, no cloud dependency |
| Agent Brains | @anthropic-ai/claude-agent-sdk | Official SDK, subprocess spawning, typed messages |
| Styling | Tailwind CSS 4 | Utility-first, dark theme support |
| Tunnel | ngrok / Cloudflare Tunnel | Remote access from phone |
| Deployment | Vercel (frontend) + Local (backend) | Free hosting + local compute |

### Project Structure
```
pixel-hive/
├── CLAUDE.md                          — Session context (READ FIRST)
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── public/
│   ├── sprites/                       — Pre-made sprite sheets
│   │   ├── chief.png                  — 4-dir × 4-frame walk + idle + work + sleep
│   │   ├── apex.png
│   │   ├── pixel.png
│   │   ├── archie.png
│   │   ├── bugsy.png
│   │   ├── palette.png
│   │   ├── sage.png
│   │   ├── forge.png
│   │   ├── tempo.png
│   │   └── recall.png
│   ├── tiles/                         — Tileset images
│   │   ├── ground.png                 — Grass, dirt, cobblestone tiles
│   │   ├── buildings.png              — Tudor building parts
│   │   ├── furniture.png              — Desks, chairs, tables
│   │   ├── decorations.png            — Flowers, barrels, signs
│   │   └── trees.png                  — Multi-layer tree sprites
│   ├── particles/
│   │   ├── dust.png                   — Dust mote particle
│   │   ├── firefly.png                — Firefly glow particle
│   │   └── smoke.png                  — Chimney smoke particle
│   └── audio/                         — (optional) ambient sounds
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 — Root layout with providers
│   │   ├── page.tsx                   — Main page: canvas + dashboard
│   │   ├── globals.css                — Tailwind + custom styles
│   │   └── api/
│   │       ├── chat/route.ts          — POST: receive browser messages
│   │       ├── agents/route.ts        — GET/POST: agent commands
│   │       ├── stream/route.ts        — GET: SSE event stream
│   │       ├── state/route.ts         — GET: full world snapshot
│   │       ├── wake/route.ts          — POST: wake protocol
│   │       └── sleep/route.ts         — POST: sleep protocol
│   │
│   ├── components/
│   │   ├── world/
│   │   │   ├── HiveCanvas.tsx         — Main PixiJS canvas (ALL rendering)
│   │   │   ├── GroundLayer.tsx        — Tile-based ground with detail
│   │   │   ├── BuildingLayer.tsx      — Tudor buildings with depth
│   │   │   ├── AgentSprites.tsx       — Animated character sprites
│   │   │   ├── ParticleLayer.tsx      — Dust, fireflies, smoke, light rays
│   │   │   ├── PostProcessing.tsx     — Bloom + TiltShift + Vignette
│   │   │   ├── TimeOfDay.tsx          — Color grading overlay
│   │   │   └── CameraController.tsx   — Zoom, pan, follow agent
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashPanel.tsx          — Tabbed sidebar panel
│   │   │   ├── TeamTab.tsx            — Agent roster with stats
│   │   │   ├── TasksTab.tsx           — Kanban task board
│   │   │   ├── ChatTab.tsx            — Live chat (THIS is the message box)
│   │   │   ├── MeetingsTab.tsx        — Meeting log
│   │   │   └── ProjectsTab.tsx        — Project overview
│   │   │
│   │   └── controls/
│   │       ├── Header.tsx             — Logo, speed slider, Go Home button
│   │       ├── StatusBar.tsx          — Bottom stats bar
│   │       └── CreditMeter.tsx        — Token usage gauge
│   │
│   ├── engine/                        — Agent brain logic (runs on local backend)
│   │   ├── orchestrator.ts            — Routes messages to correct orchestrator
│   │   ├── codeOrchestrator.ts        — Manages Apex, Pixel, Bugsy, Forge
│   │   ├── coworkOrchestrator.ts      — Manages Chief, Archie, Palette, Sage, Tempo, Recall
│   │   ├── agentLoop.ts              — Stanford-inspired observe→reflect→plan→act
│   │   ├── memory.ts                  — Memory stream with recency/importance/relevance
│   │   ├── reflection.ts             — Generate higher-order reflections
│   │   ├── planning.ts               — Create and execute plans
│   │   ├── social.ts                 — Conversation and meeting logic
│   │   ├── sleepWake.ts              — Full sleep/wake protocol
│   │   └── creditManager.ts          — Token tracking + auto-sleep trigger
│   │
│   ├── lib/
│   │   ├── agentSDK.ts               — Typed wrapper around Agent SDK query()
│   │   ├── agentProfiles.ts           — All 10 agent definitions + personalities
│   │   ├── constants.ts              — Tile sizes, room coords, palettes
│   │   ├── types.ts                  — All TypeScript interfaces
│   │   ├── store.ts                  — Zustand store definition
│   │   ├── db.ts                     — SQLite database setup + queries
│   │   └── tunnel.ts                 — Tunnel connection helper
│   │
│   └── assets/
│       └── maps/
│           └── office-world.json      — Tile map data (positions of everything)
│
├── memory/                            — Persisted agent state (gitignored)
│   ├── hive-sleep/                    — Handoff notes from sleep protocol
│   │   ├── chief-2026-03-18.md
│   │   ├── orchestrator-code-2026-03-18.md
│   │   └── orchestrator-cowork-2026-03-18.md
│   └── reflections/                   — Agent reflection logs
│
└── data/
    └── hive.db                        — SQLite database file
```

---

## 3. AGENT SYSTEM

### Agent Roster (10 Core Agents)

| ID | Name | Emoji | Role | Color | Orchestrator |
|----|------|-------|------|-------|-------------|
| chief | Chief | 👑 | CEO / Manager | Gold #ffd700 | Cowork |
| apex | Apex | 🔧 | CTO / Supervisor | Sky Blue #00bfff | Code |
| archie | Archie | 🔬 | Lead Researcher | Pink #ff6b9d | Cowork |
| pixel | Pixel | 🏗️ | Senior Builder | Green #00ff88 | Code |
| bugsy | Bugsy | 🧪 | QA Lead | Red #ff4444 | Code |
| palette | Palette | 🎨 | Creative Director | Purple #cc66ff | Cowork |
| sage | Sage | 📚 | Skill Architect | Orange #ffaa00 | Cowork |
| forge | Forge | 🔌 | Plugin Engineer | Blue #44aaff | Code |
| tempo | Tempo | 📅 | Operations Lead | Cyan #88ddff | Cowork |
| recall | Recall | 🗄️ | Knowledge Manager | Sage #aaddaa | Cowork |

### Agent Personality Summaries

**Chief** — Warm, decisive, big-picture thinker. Uses "team" language. Delegates, never codes. Runs standups.

**Apex** — Sharp, quality-focused, technical mentor. Reviews code, makes architecture calls. Never writes production code.

**Archie** — Curious, thorough researcher. Deep-dives into docs and papers. Cites sources. Validates assumptions.

**Pixel** — Prolific builder. Ships fast. Says "On it!" and "Just shipped..." Takes specs from Apex and implements.

**Bugsy** — Skeptical QA. Finds edge cases. Asks "What happens if..." Reports bugs with reproduction steps.

**Palette** — Aesthetic, UX-opinionated. Reviews UI before shipping. Thinks visually. Catches inconsistencies.

**Sage** — Pattern-spotter, knowledge distiller. Watches team and extracts reusable skills. Writes DO/DON'T lists.

**Forge** — Integration specialist. Connects systems. Builds API bridges (ClickUp, GitHub, Slack). Handles webhooks.

**Tempo** — Organized, deadline-aware. Tracks dependencies. Alerts on timeline slips. Runs sprint planning.

**Recall** — Meticulous archivist. Documents everything. Takes meeting notes. Flags past mistakes being repeated.

### Stanford-Inspired Decision Loop (per agent tick, ~30s real-time)
```
1. OBSERVE  → What's happening? Who's nearby? New messages? Tasks assigned?
2. RETRIEVE → Fetch relevant memories (weighted: recency × importance × relevance)
3. REFLECT  → If importance threshold crossed, generate higher-order reflection
4. PLAN     → Decide next action based on memories + current state + personality
5. ACT      → Execute: move, work, chat, attend meeting, help teammate
6. RECORD   → Store action as new memory in SQLite
```

### How Agent SDK Query Works
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Each orchestrator runs as a query() session
const agentQuery = query({
  prompt: buildAgentPrompt(agent, task, memories),
  options: {
    cwd: projectDir,
    allowedTools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    model: 'sonnet',  // or 'opus' for complex tasks
    sessionId: agent.sessionId,  // resume previous conversation
    continue: agent.hasActiveSession,
    systemPrompt: buildAgentSystemPrompt(agent),
    maxTurns: 25,
  }
});

// Stream messages back to browser
for await (const message of agentQuery) {
  if (message.type === 'assistant') {
    broadcastToSSE({ agent: agent.id, message });
    updateAgentActivity(agent.id, extractActivity(message));
  }
}
```

### Orchestrator Concurrency Model
```
User message arrives
  → Router inspects intent
    → Technical task? → Code Orchestrator (1 Claude session)
       → Apex reviews scope
       → Assigns to Pixel/Bugsy/Forge (sequential within orchestrator)
    → Research/creative? → Cowork Orchestrator (1 Claude session)
       → Chief delegates
       → Archie/Palette/Sage/Tempo/Recall work (sequential)
    → Complex project? → BOTH orchestrators run in parallel
       → Up to 2 concurrent Claude sessions
       → Each manages up to 5 agents sequentially
```

---

## 4. BROWSER ↔ LOCAL BACKEND PROTOCOL

### Message Flow
```
Browser (Vercel)                    Local Backend (localhost:3001)
     │                                        │
     │  POST /api/chat                        │
     │  { message: "Build auth module" }  ──→ │
     │                                        │ → orchestrator.route(message)
     │                                        │ → query() spawns Claude Code
     │                                        │ → Agent processes task
     │  GET /api/stream (SSE)             ←── │
     │  event: agent_message                  │
     │  data: { agentId, content, type }      │
     │                                        │
     │  event: agent_move                     │
     │  data: { agentId, location, status }   │
     │                                        │
     │  event: agent_stats                    │
     │  data: { agentId, xp, mood, energy }   │
     │                                        │
     │  event: task_update                    │
     │  data: { taskId, status, assignee }    │
     │                                        │
     │  POST /api/sleep                       │
     │  "Go Home button pressed"         ──→  │
     │                                        │ → sleepProtocol.execute()
     │  event: sleep_progress                 │
     │  data: { phase, agent, status }    ←── │
     │                                        │
     │  POST /api/wake                        │
     │  "Wake button pressed"            ──→  │
     │                                        │ → wakeProtocol.execute()
```

### SSE Event Types

| Event | Payload | Purpose |
|-------|---------|---------|
| `agent_message` | `{ agentId, content, type, to }` | Agent chat/status/knowledge |
| `agent_move` | `{ agentId, location, status, activity }` | Sprite movement command |
| `agent_stats` | `{ agentId, xp, mood, energy, level }` | Stats update |
| `task_update` | `{ taskId, status, assignee, deliverables }` | Kanban board update |
| `meeting_start` | `{ topic, attendees }` | Meeting room activation |
| `meeting_end` | `{ notes, decisions }` | Meeting completion |
| `sleep_progress` | `{ phase, agent, status }` | Go Home progress |
| `wake_progress` | `{ phase, agent, status }` | Wake-up progress |
| `system` | `{ type, message }` | System notifications |

### Remote Access (Phone)
```
Vercel Frontend (https://pixel-hive.vercel.app)
  ↓ connects to
Tunnel URL (https://your-hive.ngrok.io or Cloudflare Tunnel)
  ↓ forwards to
localhost:3001 (local Next.js backend with Claude Agent SDK)
```

The Vercel frontend reads `NEXT_PUBLIC_BACKEND_URL` from environment:
- Local dev: `http://localhost:3001`
- Remote: `https://your-hive.ngrok.io`

---

## 5. SLEEP/WAKE PROTOCOL (Go Home Button)

### Sleep Sequence (When Owner Presses "Go Home")

**Phase 1: Graceful Stop (5-10s)**
- All active Claude Code sessions receive abort signal
- Each session finds a natural stopping point (finish current tool call)
- No new queries are started

**Phase 2: Agent Notes (parallel, all agents simultaneously)**
Each agent writes to `memory/hive-sleep/[agent-id]-[date].md`:
```markdown
## [Agent Name] — End of Day Notes — [Date]

### What I Did Today
- [Specific completed work]

### What I'm In The Middle Of
- [Current task + exact state]
- [File/function being worked on]

### What Still Needs To Be Done
- [Remaining tasks with priority]
- [Blockers needing resolution]

### Key Decisions Made
- [Decisions affecting the project]

### Notes For Tomorrow
- [Context for seamless resumption]
```

**Phase 3: Orchestrator Handoff**
Each orchestrator compiles `memory/hive-sleep/orchestrator-[code|cowork]-[date].md`

**Phase 4: Visual Shutdown**
- All agent sprites walk to their cottages (pathfinding animation)
- Cottage windows glow warm when agent arrives
- ZZZ particles appear above sleeping agents
- Chief's final message: "Good night team! Great work today."

**Phase 5: Process Cleanup**
- All Claude Code subprocesses terminated
- All SSE connections send `sleep_complete` event
- Token meter stops

### Wake Sequence (When Owner Presses "Wake" or Sends Message)

**Phase 1: Load Context**
- Read most recent handoff files from `memory/hive-sleep/`
- Load agent individual notes
- Identify critical items and blockers

**Phase 2: Visual Wake-Up**
- Cottage windows brighten
- Agents walk from homes to desks
- Energy/mood set to rested values (energy: 100, mood: +10)

**Phase 3: Standup**
- Chief runs morning standup via agent_message events
- Each agent acknowledges their assigned work
- Displayed in ChatTab

**Phase 4: Resume**
- Orchestrators resume sessions using `sessionId` + `--continue`
- Agents pick up where they left off
- SSE stream resumes

**CRITICAL: The owner can wake agents by EITHER pressing the Wake button OR simply typing a new message. If a message arrives while agents are sleeping, auto-wake is triggered.**

---

## 6. SQLite SCHEMA

```sql
-- Agent memories (Stanford-style memory stream)
CREATE TABLE agent_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  importance REAL DEFAULT 5.0,    -- 1-10 scale
  recency REAL DEFAULT 1.0,       -- decays over time
  embedding TEXT,                   -- JSON array for similarity search
  created_at TEXT DEFAULT (datetime('now')),
  type TEXT DEFAULT 'observation'   -- observation, reflection, plan, action
);

-- Agent reflections (higher-order thoughts)
CREATE TABLE agent_reflections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  evidence_ids TEXT,               -- JSON array of memory IDs that triggered this
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tasks (Kanban board)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',      -- todo, in_progress, review, done
  assignee TEXT,
  priority TEXT DEFAULT 'normal',  -- urgent, high, normal, low
  deliverables TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Messages (chat history)
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT NOT NULL,           -- agent_id or 'owner'
  to_id TEXT DEFAULT 'all',
  content TEXT NOT NULL,
  type TEXT DEFAULT 'chat',        -- chat, meeting_note, status_update, question
  created_at TEXT DEFAULT (datetime('now'))
);

-- Meetings
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  attendees TEXT NOT NULL,         -- JSON array of agent IDs
  notes TEXT,
  decisions TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT
);

-- Handoff notes (sleep/wake state)
CREATE TABLE handoff_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  session_date TEXT NOT NULL,
  type TEXT DEFAULT 'agent',       -- agent, orchestrator
  created_at TEXT DEFAULT (datetime('now'))
);

-- Session tracking
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  claude_session_id TEXT,          -- Agent SDK session ID for --resume
  started_at TEXT DEFAULT (datetime('now')),
  last_active TEXT,
  status TEXT DEFAULT 'active'     -- active, paused, completed
);
```

---

## 7. IMPLEMENTATION ORDER (Strictly Sequential)

### Phase 1: Project Scaffold (Day 1)
```bash
npx create-next-app@latest pixel-hive --typescript --tailwind --app --src-dir
cd pixel-hive
npm install pixi.js@^8 @pixi/react @pixi/filter-advanced-bloom @pixi/filter-tilt-shift
npm install zustand better-sqlite3 @types/better-sqlite3
npm install @anthropic-ai/claude-agent-sdk
npm install nanoid
```
- Set up project structure as defined above
- Create CLAUDE.md with current state
- Implement SQLite schema + db.ts
- Implement Zustand store with all agent state
- Basic Next.js layout with sidebar + canvas area

### Phase 2: PixiJS HD-2D World (Days 2-4) — VISUAL PRIORITY
- HiveCanvas.tsx: PixiJS Application with proper layer ordering
- GroundLayer.tsx: Tile-based ground with grass tufts, cobblestone, flowers
- BuildingLayer.tsx: Tudor-style buildings with 3/4 perspective
- PostProcessing.tsx: TiltShiftFilter + AdvancedBloomFilter + vignette
- ParticleLayer.tsx: Dust motes, light rays, fireflies
- TimeOfDay.tsx: Morning/afternoon/evening/night color grading
- CameraController.tsx: Mouse wheel zoom, shift+drag pan, double-click-to-follow
- **VERIFY**: Take screenshots. Must look like Octopath Traveler, not a flat pixel game.

### Phase 3: Agent Sprites (Days 5-6)
- Create/acquire pre-made sprite sheets for all 10 agents
- AgentSprites.tsx: Animated sprites with walk/idle/work/sleep states
- Y-sorting for depth
- Name tags with emoji, name, level, status icon
- Selection highlight (golden glow)
- Pathfinding between rooms (A* or waypoint-based)

### Phase 4: Dashboard UI (Day 7)
- DashPanel.tsx: Tabbed sidebar (Team, Tasks, Chat, Meetings, Projects)
- ChatTab.tsx: THE message input box — owner types here to interact
- TeamTab.tsx: Agent roster with live stats (XP, mood, energy, level)
- TasksTab.tsx: Kanban board (todo, in_progress, review, done)
- Header.tsx: Logo, speed slider, Wake/Sleep buttons, credit meter
- StatusBar.tsx: Bottom bar with world time, active agent count, etc.

### Phase 5: Agent Brain Engine (Days 8-12)
- agentSDK.ts: Wrapper around `query()` with proper options
- orchestrator.ts: Message router (intent detection → orchestrator selection)
- codeOrchestrator.ts: Manages technical agents (Apex→Pixel→Bugsy→Forge)
- coworkOrchestrator.ts: Manages non-technical agents
- agentLoop.ts: Stanford observe→retrieve→reflect→plan→act loop
- memory.ts: SQLite-backed memory stream with importance scoring
- Each agent gets a unique system prompt incorporating their personality

### Phase 6: SSE Streaming (Day 13)
- /api/stream/route.ts: Server-Sent Events endpoint
- All agent actions broadcast as events
- Browser receives and updates Zustand store + PixiJS world in real-time
- Speech bubbles appear over agents when they talk
- Agents move to correct locations based on activity

### Phase 7: Sleep/Wake Protocol (Day 14)
- sleepWake.ts: Full implementation of Go Home / Wake Up
- Handoff notes written to memory/ directory
- Agent sprites walk home animation
- Session IDs persisted for --resume capability
- Auto-wake when message received while sleeping

### Phase 8: Remote Access (Day 15)
- Tunnel setup (ngrok or Cloudflare)
- Environment variable for backend URL
- Vercel deployment of frontend
- Mobile-responsive layout for phone access

### Phase 9: Polish (Days 16-20)
- Sound design (ambient, notification sounds)
- Performance optimization
- Error handling and recovery
- Agent personality fine-tuning
- Visual polish (more particles, better animations)

---

## 8. CRITICAL RULES

### DOs
- DO read CLAUDE.md before touching any code
- DO use the Octopath color palette (warm earth tones, NOT dark sci-fi)
- DO implement ALL 6 HD-2D pillars (tilt-shift, bloom, palette, perspective, detail, particles)
- DO use PixiJS 8 with built-in filter system
- DO Y-sort all sprites and buildings for depth
- DO use the Claude Agent SDK query() function for all agent interactions
- DO persist session IDs so agents can --resume conversations
- DO write handoff notes on every sleep
- DO support auto-wake from browser message
- DO take screenshots after visual changes to verify HD-2D quality
- DO make each agent speak differently based on their personality
- DO use SSE for real-time updates (not polling)
- DO implement the full Stanford memory/reflection/planning loop

### DON'Ts
- DON'T use Canvas 2D — use PixiJS 8 WebGL
- DON'T skip post-processing effects (they ARE the HD-2D look)
- DON'T use dark sci-fi colors (#0c0e1a, etc.)
- DON'T make flat top-down tiles (needs 3/4 perspective)
- DON'T hardcode agent count (system supports dynamic spawning)
- DON'T skip the standup meeting on wake
- DON'T let agents act identically (personality differentiation is key)
- DON'T poll for updates (use SSE)
- DON'T store Claude sessions in memory only (persist to SQLite)
- DON'T forget ground detail (tufts, flowers, pebbles)
- DON'T skip name tags on agents (they MUST always be visible)
- DON'T use browser automation (agents use typed SDK, never screenshots)

---

## 9. REFERENCE MATERIAL

### Key Research & Inspiration

| Resource | URL | What It Teaches |
|----------|-----|-----------------|
| Stanford Smallville Paper | https://arxiv.org/abs/2304.03442 | Agent memory, reflection, planning architecture |
| a16z AI Town (GitHub) | https://github.com/a16z-infra/ai-town | PixiJS + Convex + agent simulation reference |
| AI Town Architecture | https://github.com/a16z-infra/ai-town/blob/main/ARCHITECTURE.md | Tick-based engine, input system, historical values |
| Claude Agent SDK (npm) | https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk | Official SDK documentation |
| Agent SDK TypeScript Ref | https://platform.claude.com/docs/en/agent-sdk/typescript | query(), Options, SDKMessage types |
| Claude Code Headless | https://code.claude.com/docs/en/headless | CLI -p flag, streaming, session management |
| claude-code-web | https://github.com/vultuk/claude-code-web | WebSocket bridge reference architecture |
| claude-agent-server | https://github.com/dzhng/claude-agent-server | Sandbox + WebSocket control pattern |
| HD-2D Wikipedia | https://en.wikipedia.org/wiki/HD-2D | Technical style definition |
| Octopath Dev Interview | https://www.unrealengine.com/en-US/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true | How the team built HD-2D |
| OT2 Dev Interview | https://www.unrealengine.com/en-US/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style | Visual improvements in sequel |
| PixiJS TiltShift Filter | https://api.pixijs.io/@pixi/filter-tilt-shift/PIXI/filters/TiltShiftFilter.html | Depth of field implementation |
| PixiJS AdvancedBloom | https://api.pixijs.io/@pixi/filter-advanced-bloom/PIXI/filters/AdvancedBloomFilter.html | Bloom/glow implementation |
| PixiJS Filters Collection | https://github.com/pixijs/filters | All community filters |
| Octopath Sprites (OT1) | https://www.spriters-resource.com/nintendo_switch/octopathtraveler/ | Character sprite reference |
| Octopath Sprites (OT2) | https://www.spriters-resource.com/nintendo_switch/octopathtravelerii/ | Updated sprite reference |
| Square Enix Press OT2 | https://press.na.square-enix.com/OCTOPATH-TRAVELER-II/Focus/Pixel-Art | Official art assets |

### Agent SDK Quick Reference

```typescript
// Installation
npm install @anthropic-ai/claude-agent-sdk

// Basic query
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: "Fix the auth bug in auth.py",
  options: {
    cwd: '/path/to/project',
    allowedTools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    model: 'sonnet',
    maxTurns: 25,
    sessionId: 'previous-session-uuid',  // for --resume
    continue: true,                       // continue last conversation
    systemPrompt: 'You are Pixel, the Senior Builder...',
    abortController: new AbortController(),
  }
});

// Stream messages
for await (const message of result) {
  // message.type: 'user' | 'assistant' | 'result'
  // message has .content with text/tool_use blocks
  console.log(message);
}

// List past sessions
import { listSessions, getSessionMessages } from '@anthropic-ai/claude-agent-sdk';
const sessions = await listSessions({ dir: '/path/to/project', limit: 10 });

// Resume a specific session
const resumed = query({
  prompt: "Continue where you left off",
  options: { sessionId: sessions[0].sessionId }
});
```

---

## 10. FIRST SESSION CHECKLIST

When you start a new Claude Code session with this prompt:

1. ✅ Read this ENTIRE document
2. ✅ Run `npx create-next-app@latest pixel-hive --typescript --tailwind --app --src-dir`
3. ✅ Install all dependencies (see Phase 1)
4. ✅ Create the folder structure
5. ✅ Set up SQLite schema
6. ✅ Implement Zustand store with agent state
7. ✅ Build HiveCanvas.tsx with PixiJS 8
8. ✅ Implement the first HD-2D pillar (ground layer with earth tones)
9. ✅ Take a screenshot — verify it looks warm and medieval, NOT dark and sci-fi
10. ✅ Continue with Phase 2 rendering pipeline

**The visual quality is the TOP priority. If it doesn't look like Octopath Traveler, everything else is worthless.**

---

*Generated by Pixel Hive Cowork Session — March 18, 2026*
*Based on deep research into: HD-2D rendering, Claude Agent SDK, Stanford Smallville, a16z AI Town, PixiJS 8 filters*
