---
name: pixel-hive
description: >
  Pixel Hive is a gamified HD-2D pixel art virtual office web app where AI Code and Cowork
  sub-agents live as characters in a top-down pixel world inspired by Octopath Traveler's visual
  style. Agents autonomously work, meet, chat, learn, and collaborate — all visible in real-time.

  Use this skill for ANY work related to the Pixel Hive project: building the web app, designing
  agents, implementing the simulation engine, creating integrations (ClickUp, GitHub, Slack),
  building the Cowork plugin bridge, designing the HD-2D rendering pipeline, implementing the
  Stanford-inspired memory/reflection/planning architecture, or managing the agent community system.

  Also trigger on: virtual office, pixel office, agent simulation, AI town, agent workspace,
  gamified AI, agent collaboration, Hive project, agent characters, pixel agents, octopath style,
  pixel hive, hive office, agent hive.
---

# Pixel Hive — Complete Project Specification & Implementation Guide

## Quick Start for New Sessions

Before writing ANY code, do these in order:
1. Read `pixel-hive/CLAUDE.md` for current implementation state
2. Start the dev server: `preview_start` with name `pixel-hive-dev`
3. Take a screenshot to see current visual state
4. Then proceed with the requested work

## 1. Vision

A **Vercel-deployed web app** where 10+ AI agent characters live in a top-down **HD-2D pixel art
office** styled after Octopath Traveler. The agents autonomously work on real tasks, hold meetings,
share knowledge, create skills, and grow — all visible in real-time.

## 2. HD-2D Visual Style — OCTOPATH TRAVELER REFERENCE

This is the #1 priority. The visual style MUST match Octopath Traveler's signature look:

### What Makes Octopath Look Like Octopath
- **Rich warm earth tones** — browns, golds, deep greens, warm stone colors
- **Detailed pixel buildings** — visible brick/wood textures, thatched roofs, timber frames
- **Lush vegetation** — multiple tree varieties, tall grass, flowers, vines on walls
- **Heavy depth-of-field** — strong tilt-shift blur on top ~20% and bottom ~20%
- **Volumetric light** — visible light rays coming through windows/trees
- **Bloom on all light sources** — warm golden glow on lanterns, windows, torches
- **Atmospheric particles** — dust motes, pollen, fireflies at night
- **Parallax depth** — background elements shift slightly vs foreground
- **3/4 top-down perspective** — NOT flat top-down, slight isometric feel
- **Ground detail** — cobblestone paths, grass tufts, dirt with pebbles
- **Shadow depth** — strong ambient occlusion under objects, cast shadows

### Color Palette Reference
```
Background/Sky:     #4a6741, #5a7a52 (deep forest greens)
Stone/Buildings:    #c4a882, #a8946e, #8b7a5e (warm sandstone)
Wood/Timber:        #6b4e32, #8b6914, #5a3a1e (rich browns)
Roofs:              #b8860b, #8b6914 (thatch/tile gold-brown)
Grass:              #4a8b3a, #3a7a2a, #5a9b4a (varied greens)
Paths:              #8b7a5e, #a89070, #7a6a4e (dirt/cobblestone)
Light/Glow:         #ffdd88, #ffcc66, #ffe4b5 (warm golden)
Night Accents:      #4466aa, #3355aa (cool blue contrast)
Foliage Shadow:     #2a4a1a, #1a3a0a (deep green shadows)
```

### Rendering Pipeline (Canvas 2D — to be migrated to PixiJS later)
```
Layer Stack (bottom to top):
├── Sky gradient background
├── Far background (blurred distant trees/mountains)
├── Mid background (trees, fences) — slight blur
├── Ground layer (grass, dirt, cobblestone) — full detail
├── Buildings/furniture — full detail, ambient occlusion
├── Agent sprites — Y-sorted for depth
├── Foreground elements (close trees, bushes) — slight blur
├── Particle layer (dust, light rays)
├── Bloom post-process (glow on lights)
├── Tilt-shift blur (top/bottom bands)
├── Vignette
└── Time-of-day color grading
```

### Building Style
- Tudor/medieval style buildings (half-timber with plaster)
- Visible roof tiles or thatch texture
- Small glowing windows (warm interior light leaking out)
- Signs and decorative elements
- Flower boxes, barrels, crates near doorways

## 3. Agent Architecture

### Roster (10 agents)

| ID | Name | Emoji | Role | Color |
|----|------|-------|------|-------|
| chief | Chief | 👑 | CEO / Manager | Gold #ffd700 |
| apex | Apex | 🔧 | CTO / Supervisor | Sky Blue #00bfff |
| archie | Archie | 🔬 | Lead Researcher | Pink #ff6b9d |
| pixel | Pixel | 🏗️ | Senior Builder | Green #00ff88 |
| bugsy | Bugsy | 🧪 | QA Lead | Red #ff4444 |
| palette | Palette | 🎨 | Creative Director | Purple #cc66ff |
| sage | Sage | 📚 | Skill Architect | Orange #ffaa00 |
| forge | Forge | 🔌 | Plugin Engineer | Blue #44aaff |
| tempo | Tempo | 📅 | Operations Lead | Cyan #88ddff |
| recall | Recall | 🗄️ | Knowledge Manager | Sage #aaddaa |

### Character Sprites
- 16x24px base, rendered at 3x (48x72 on screen)
- 4-direction movement (down, left, right, up)
- 4-frame walk cycle per direction
- Idle: breathing/bobbing (2 frames)
- Working: typing (3 frames)
- Sleeping: ZZZ particle + closed eyes (2 frames)
- Each agent: unique color palette, hairstyle, accessory

### Stanford-Inspired Decision Loop (per tick, ~30s real-time)
```
1. OBSERVE  → What's happening? Who's nearby? New messages?
2. RETRIEVE → Fetch relevant memories (recency + importance + relevance)
3. REFLECT  → If importance threshold crossed, generate reflection
4. PLAN     → Decide next action based on memories + current state
5. ACT      → Execute action (move, work, chat, attend meeting)
6. RECORD   → Store action as new memory
```

## 4. Current Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Rendering | Canvas 2D (PixiJS planned) |
| State | Zustand (Convex planned) |
| Styling | Tailwind CSS |
| Agent Brains | Claude API (planned) |
| Auth | Clerk (planned) |
| Deploy | Vercel (planned) |

## 5. File Structure

```
pixel-hive/
├── CLAUDE.md                    — Session context (READ FIRST)
├── src/
│   ├── app/
│   │   ├── layout.tsx           — Root layout
│   │   ├── page.tsx             — Main page (canvas + dashboard)
│   │   └── globals.css          — Global styles
│   ├── components/
│   │   ├── world/
│   │   │   └── HiveCanvas.tsx   — Main canvas renderer
│   │   ├── dashboard/
│   │   │   ├── DashPanel.tsx    — Tabbed sidebar
│   │   │   ├── TeamTab.tsx      — Agent roster
│   │   │   ├── TasksTab.tsx     — Kanban board
│   │   │   ├── ChatTab.tsx      — Live chat
│   │   │   ├── MeetingsTab.tsx  — Meeting log
│   │   │   └── ProjectsTab.tsx  — Project tracker
│   │   └── controls/
│   │       ├── Header.tsx       — Top bar controls
│   │       └── StatusBar.tsx    — Bottom stats
│   └── lib/
│       ├── constants.ts         — Tile sizes, rooms, palettes
│       ├── types.ts             — All interfaces
│       ├── agents.ts            — Agent definitions
│       └── store.ts             — Zustand store + simulation
```

## 6. Critical Rules

### DOs
- DO read CLAUDE.md before touching any code
- DO use the Octopath Traveler color palette (warm earth tones, NOT dark sci-fi)
- DO implement heavy depth-of-field (tilt-shift blur)
- DO add volumetric light and bloom on light sources
- DO Y-sort agents for depth rendering
- DO save full agent mental state on sleep
- DO make social behavior memory-driven (not random)
- DO use typed SDK for agent actions (never browser automation)
- DO support dynamic agent count
- DO take screenshots after visual changes to verify

### DON'Ts
- DON'T use dark sci-fi colors (the current palette is wrong)
- DON'T skip post-processing effects (they ARE the Octopath look)
- DON'T make flat top-down tiles (needs 3/4 perspective feel)
- DON'T forget ground detail (grass tufts, pebbles, flowers)
- DON'T hardcode agent count to 10
- DON'T skip the standup meeting on wake
- DON'T let agents act identically (personality differentiation)

## 7. Implementation Phases

### Phase 1: Visual Overhaul [CURRENT PRIORITY]
- Rewrite HiveCanvas.tsx with Octopath-quality rendering
- Rich building textures (Tudor-style office, cozy break room)
- Lush environment (trees, grass, flowers, stone paths)
- Full post-processing (bloom, DOF, vignette, particles, light rays)
- Proper 3/4 perspective building rendering
- Agent sprites with detailed animations

### Phase 2: Convex Backend
- Replace Zustand with Convex real-time DB
- Schema from section 9 of the original spec
- Real-time subscriptions for UI reactivity

### Phase 3: Agent Brains
- Claude API integration for decision-making
- Memory/reflection/planning system
- Real social interactions

### Phase 4: Integrations
- ClickUp task sync
- GitHub PR/commit automation
- Cowork plugin bridge (MCP server)

### Phase 5: Polish
- Sound design
- Mobile responsive
- Performance optimization
- Vercel deployment
