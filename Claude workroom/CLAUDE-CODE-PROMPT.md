# Claude Code Implementation Prompt — Claude Hive

Copy this entire prompt into a Claude Code session to begin building.

---

## PROMPT START

You are building **Claude Hive** — a gamified HD-2D pixel art virtual office web app where AI agent characters autonomously work, collaborate, and grow. Think Octopath Traveler visual style meets Stanford Generative Agents meets a real productivity tool.

### Read the skill first

Before writing ANY code, read the full project specification:
```
cat /path/to/claude-hive-skill/SKILL.md
```

### Project Setup

Initialize a Next.js 15 project with these exact dependencies:

```bash
npx create-next-app@latest claude-hive --typescript --tailwind --app --src-dir
cd claude-hive

# Core
npm install convex @pixi/react pixi.js@^8 @pixi/filter-advanced-bloom

# Auth
npm install @clerk/nextjs

# Integrations
npm install @octokit/rest

# Dev
npx convex dev --once
```

### Architecture Overview

```
src/
├── app/
│   ├── layout.tsx          — Clerk + Convex providers
│   ├── page.tsx            — Main Hive view
│   └── api/
│       ├── webhooks/
│       │   └── clickup/    — ClickUp webhook receiver
│       └── hive/           — Hive API for Cowork plugin
├── components/
│   ├── world/
│   │   ├── HiveCanvas.tsx  — Main PixiJS canvas
│   │   ├── TileMap.tsx     — Floor, walls, furniture
│   │   ├── AgentSprite.tsx — Character rendering
│   │   ├── PostProcess.tsx — Bloom, tilt-shift, vignette
│   │   └── Particles.tsx   — Ambient particles
│   ├── dashboard/
│   │   ├── DashPanel.tsx   — Tabbed sidebar
│   │   ├── TeamTab.tsx     — Agent roster + profiles
│   │   ├── TasksTab.tsx    — Kanban task board
│   │   ├── ChatTab.tsx     — Live agent chat
│   │   ├── MeetingsTab.tsx — Meeting log & notes
│   │   └── ProjectsTab.tsx — Project tracker
│   └── controls/
│       ├── Header.tsx      — Logo, speed, sleep/wake
│       ├── StatusBar.tsx   — Bottom stats bar
│       └── CreditMeter.tsx — Credit usage gauge
├── engine/
│   ├── agentLoop.ts        — Core decision cycle
│   ├── memory.ts           — Memory stream + retrieval
│   ├── reflection.ts       — Reflection generation
│   ├── planning.ts         — Plan creation & execution
│   ├── social.ts           — Conversation, meetings
│   ├── creditManager.ts    — Credit tracking + auto-sleep
│   └── sleepWake.ts        — Save/restore state
├── integrations/
│   ├── clickup.ts          — ClickUp API bridge
│   ├── github.ts           — GitHub API bridge
│   └── coworkPlugin.ts     — Cowork plugin API
└── lib/
    ├── agentSDK.ts         — Typed SDK for agent actions
    ├── sprites.ts          — Sprite definitions
    └── constants.ts        — Tile sizes, colors, config

convex/
├── schema.ts               — Full database schema
├── agents.ts               — Agent CRUD + state management
├── memories.ts             — Memory stream operations
├── tasks.ts                — Task management
├── messages.ts             — Chat system
├── meetings.ts             — Meeting system
├── skills.ts               — Skill library
├── worldState.ts           — Global world state
├── agentEngine.ts          — Server-side agent loop
└── crons.ts                — Scheduled agent ticks
```

### Implementation Order

Build in this exact order. Each step must work before moving to the next:

**Step 1: World Renderer**
- Set up PixiJS canvas with @pixi/react
- Render tile map: office (24x11 tiles), meeting room (9x7), break room (9x6), path, homes
- Add furniture: desks with glowing monitors, chairs, bookshelves, plants, lamps
- Implement HD-2D post-processing:
  - Tilt-shift blur (top 15% and bottom 15% of canvas)
  - AdvancedBloomFilter on emissive sprites (monitors, lamps, windows)
  - Vignette overlay
  - Time-of-day color grading (morning warm, afternoon neutral, evening cool)
- Add ambient particles (dust motes floating upward)

**Step 2: Agent Sprites**
- Create 10 agent characters with unique color palettes
- 4-direction sprites (down, left, right, up)
- Walk animation (4 frames, leg swing)
- Idle animation (subtle bob)
- Y-sort for depth (agents lower on screen render on top)
- Floating status bubble above each agent
- Name tag + level badge below
- Selection highlight (golden ellipse ring with glow)
- Shadow ellipse under each agent

**Step 3: Movement & Pathfinding**
- Simple A* or direct movement between locations
- Locations: each agent's desk, meeting room center, break room, their home
- Smooth interpolation (lerp) toward target
- Direction changes based on movement vector

**Step 4: Convex Backend**
- Schema from the skill file
- Agent state management (position, status, mood, energy, XP)
- Real-time subscriptions for UI reactivity
- Message system for agent-to-agent chat
- Task CRUD with project associations

**Step 5: Agent Decision Engine**
- Implement the observe → retrieve → reflect → plan → act loop
- Each agent runs as a Convex scheduled function
- Claude API calls with agent-specific system prompts
- Social interactions: if two agents in break room, trigger conversation
- Meeting system: Chief can call meetings, agents attend and contribute
- Busy/focus mode: agents can ignore social requests when deep in work

**Step 6: Social Behavior (CRITICAL — this is what makes it alive)**
- Coffee break conversations about work topics
- Knowledge sharing (Archie tells Pixel about a pattern he found)
- Help requests (Pixel asks Archie for research on an API)
- Casual banter (but always productive — they love what they do)
- Meeting contributions (each agent adds their perspective)
- Skill creation collaboration (Sage and Recall work together)

**Step 7: Sleep/Wake System**
- "Send All Home" button: triggers save protocol
  1. Each agent saves: current task, progress notes, next steps, unresolved Qs
  2. Agents commit any uncommitted work
  3. Walk home animation
  4. House lights dim, ZZZ particles
  5. Simulation pauses
- "Wake Up" button: triggers restore
  1. Load saved state
  2. Agents walk out of homes
  3. Auto-standup: each agent reads their notes
  4. Resume work

**Step 8: Credit Management**
- Track Claude API token usage per agent
- Three modes: normal, efficiency, sleeping
- Auto-sleep when credits drop below 5%
- Visual credit meter in UI
- Efficiency mode: longer think cycles, essential actions only
- Agents aware of credit state: "We should wrap up soon"

**Step 9: Dashboard UI**
- 5 tabs: Team, Tasks, Chat, Meetings, Projects
- Team: roster with click-to-profile, agent stats, quick actions
- Tasks: Kanban board (To Do / In Progress / Done) with priority + assignee
- Chat: live message feed, color-coded by agent
- Meetings: log with notes, outcomes, attendees
- Projects: cards with progress bars, task breakdown, assigned agents

**Step 10: Integrations**
- ClickUp: bidirectional task sync via API + webhooks
- GitHub: branch/commit/PR creation, automated review
- Cowork Plugin: MCP server with tools for status/assign/control

### Critical Implementation Notes

1. **Agent SDK is typed, direct, never browser-based.** Each agent calls functions, not screenshots.

2. **Social behavior is NOT random.** It's driven by the memory/reflection system. Archie shares a finding at coffee because his reflection system identified it as high-importance + shareable.

3. **The HD-2D look requires post-processing.** Without bloom, tilt-shift, and particles, it's just pixel art. The shaders are what make it Octopath-like.

4. **Sleep saves EVERYTHING.** An agent mid-debugging a function should resume at that exact mental state. Their save notes should include: "Was debugging auth refresh in `src/auth.ts:47`. The issue is the token expiry check. Next: try adding a 30-second buffer."

5. **Credit awareness is ambient.** Agents don't suddenly stop — they gracefully wind down. Like humans approaching end-of-day, they finish thoughts, save work, then rest.

6. **Meetings produce artifacts.** A sprint planning meeting should output actual task assignments in the database. A code review should produce actual PR comments. A retro should produce actual DOs/DON'Ts entries.

7. **The Cowork plugin is the bridge between you and the Hive.** From any Cowork session, you should be able to ask "What's my team doing?" and get a live answer.

### Visual Reference

The prototype JSX file in the workroom shows the basic layout and interaction patterns. Use it as a reference for:
- Color palette
- Room layout
- Agent roster and stats
- Dashboard tab structure
- Sleep/wake behavior

Scale it up from canvas-rendered prototype to proper PixiJS with sprite assets and shaders.

## PROMPT END
