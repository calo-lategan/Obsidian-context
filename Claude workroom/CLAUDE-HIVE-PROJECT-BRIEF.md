# CLAUDE HIVE — Project Brief

## The Vision

**Claude Hive** is a gamified 2D pixel-art virtual office where your AI agents — Claude Code sub-agents and Cowork sub-agents — live, work, learn, and collaborate as visible characters. You are the owner. Cowork is the CEO who distributes tasks. Claude Code is the CTO who supervises execution. A team of 8-12 specialist agents work independently, hold meetings, update tasks, build skills, and grow — all visualized in real-time in a Gather Town-style pixel world.

---

## Research Findings — What Exists & What We're Building On

### Direct Inspirations

| Project | What It Does | What We Take | What We Improve |
|---------|-------------|--------------|-----------------|
| **Stanford Smallville** (2023) | 25 LLM agents simulate human behavior in a Sims-like town. Memory, reflection, planning. | Agent memory architecture, emergent social behavior, reflection loops | Our agents do REAL work (tasks, code, skills), not just simulate behavior |
| **a16z AI Town** | MIT-licensed JS/TS rewrite of Smallville. Convex + pixi-react. Deployable starter kit. | Tech stack (Convex, pixi-react), sprite system, real-time state sync | Add actual Claude API integration, task management, skill ecosystem |
| **Gather Town** | 2D pixel virtual office for remote teams. Spatial audio, customizable maps. | Visual style, office layout metaphor, proximity interactions | Our "team members" are AI agents, not humans |
| **CrewAI** | Multi-agent orchestration with roles, crews, visual dashboards. 60% of Fortune 500. | Role-based agent design, task delegation patterns, monitoring | Add visual world + gamification + persistent learning |
| **Claude Code Agent Teams** | Official multi-agent orchestration. Mailbox system, task dependencies. | Native agent communication, task dependency auto-unblocking | Wrap it in a visual, fun, persistent world |

### Key Architectural Insight

The critical difference from all existing projects: **our agents have native API access to the world state**. They don't take screenshots and click. They read/write through a typed SDK:

```typescript
// Agent SDK — what each agent sees
interface AgentWorld {
  moveTo(location: "desk" | "meeting" | "break" | "home"): void;
  updateStatus(status: AgentStatus): void;
  sendMessage(to: AgentId, message: string): void;
  createTask(task: TaskDefinition): void;
  completeTask(taskId: string, deliverables: any): void;
  learnSkill(skill: SkillDefinition): void;
  callMeeting(topic: string, attendees: AgentId[]): void;
  reportToOwner(summary: string): void;
}
```

---

## Architecture

### Platform: Vercel Web App

```
┌─────────────────────────────────────────────┐
│                 FRONTEND                     │
│  Next.js 14+ (App Router)                   │
│  ├── PixiJS (2D pixel rendering)            │
│  ├── React state (UI panels)                │
│  ├── WebSocket client (live updates)        │
│  └── Notification system                    │
├─────────────────────────────────────────────┤
│              SHARED STATE                    │
│  Convex (real-time reactive database)        │
│  ├── agents (position, status, mood, XP)    │
│  ├── tasks (assignment, progress, deps)     │
│  ├── messages (agent-to-agent comms)        │
│  ├── meetings (schedule, notes, outcomes)   │
│  ├── skills (created, shared, versioned)    │
│  ├── learnings (lessons, best practices)    │
│  └── world (time, events, notifications)    │
├─────────────────────────────────────────────┤
│             AGENT RUNTIME                    │
│  Convex Actions / Serverless Functions       │
│  ├── Agent Loop (think → decide → act)      │
│  ├── Claude API calls (per-agent context)   │
│  ├── Agent SDK (typed world interface)      │
│  ├── Memory system (short + long term)      │
│  └── Skill executor                         │
├─────────────────────────────────────────────┤
│              PLUGIN BRIDGE                   │
│  Cowork Plugin ↔ Web App Sync               │
│  ├── Push real task data to agents          │
│  ├── Pull agent deliverables back           │
│  ├── Sync skills/learnings bidirectionally  │
│  └── Owner command interface                │
└─────────────────────────────────────────────┘
```

### Why Convex?

- **Real-time subscriptions** — UI updates instantly when an agent moves, completes a task, or sends a message. No polling.
- **Proven by AI Town** — a16z's AI Town runs on Convex in production. The reactive database handles game-state-level update frequency.
- **Serverless actions** — Agent "brains" run as Convex actions, calling Claude API. No separate server needed.
- **Transactions** — Multiple agents can update world state without conflicts.

---

## Agent Hierarchy & Roles

### Leadership

| Agent | Name | Role | Responsibilities |
|-------|------|------|------------------|
| 👑 Cowork | "Chief" | CEO / Manager | Receives projects from you, breaks them into tasks, delegates to team, tracks overall progress, runs standup meetings |
| 🔧 Claude Code | "Apex" | CTO / Supervisor | Technical oversight, code review, gathers status from all agents, compiles reports for you, assists blocked agents |

### Specialists

| Agent | Name | Role | Specialization |
|-------|------|------|----------------|
| 🔬 Researcher | "Archie" | Lead Researcher | Web research, paper reading, source evaluation, fact-checking |
| 🏗️ Builder | "Pixel" | Senior Builder | Code generation, file creation, implementation |
| 🧪 Tester | "Bugsy" | QA Lead | Testing, validation, edge cases, quality gates |
| 🎨 Designer | "Palette" | Creative Director | UI/UX, visual design, document formatting |
| 📚 Skill Creator | "Sage" | Skill Architect | Distills learnings into reusable skills, maintains skill library |
| 🔌 Plugin Dev | "Forge" | Plugin Engineer | Builds and maintains plugins, integrations, bridges |
| 📅 Scheduler | "Tempo" | Operations Lead | Timeline management, dependency tracking, scheduling |
| 🗄️ Archivist | "Recall" | Knowledge Manager | Documents everything, maintains lessons learned, DOs/DON'Ts |

### Future Expansion (Dynamic Roles)
- Agents can propose new roles when workload demands it
- "Intern" agents can be spawned for specific tasks and mentored
- Agents can be promoted based on XP and performance
- Cross-training: any agent can temporarily fill another's role

---

## The Incentive System — "Learning as Reward"

### Core Philosophy
These agents intrinsically love learning. Their "reward" isn't points — it's gaining new knowledge, building better skills, and sharing insights. "Time off" means going home to study, explore new topics, or experiment.

### How It Works

```
WORK CYCLE:
  Morning  → Standup meeting (all agents)
  Work     → Execute assigned tasks
  Midday   → Optional collaboration / pair programming
  Work     → Continue tasks, review each other's output
  Evening  → Retrospective, lessons learned

REWARD CYCLE (earned after completing tasks):
  🏠 Go Home      → Agent goes to their house in the pixel world
  📖 Learn         → Explores topics related to current projects
  🧪 Experiment    → Builds prototype skills / tries new approaches
  🤝 Social        → Agents visit each other's homes, share learnings
  📝 Reflect       → Writes to personal journal (stored in memory)

GROWTH:
  XP gained from: completing tasks, creating skills, helping others, learning
  Levels unlock: new capabilities, harder tasks, mentoring privileges
  Mastery tracks: each agent develops deep expertise in their domain
```

### Visible in the World
- When an agent is "learning," their house window glows gold
- Agents visiting each other show a chat bubble
- The break room has a bookshelf that fills with skills the team has created
- A trophy wall in the office shows milestones

---

## Owner Interface — Your Control Panel

As the owner, you can:

1. **Watch** — See all agents working at their desks, in meetings, or relaxing at home
2. **Assign** — Drop projects into Cowork's inbox; she distributes automatically
3. **Track** — Dashboard shows per-agent status, task progress, blockers
4. **Review** — Read meeting notes, deliverables, skill documents
5. **Direct** — Send any agent a specific instruction
6. **Schedule** — Set up recurring tasks, standups, review cycles
7. **Earn** — See the team's collective skill library grow over time

### Summarized Updates
Every work cycle, you get a digest:
```
📊 DAILY HIVE REPORT
━━━━━━━━━━━━━━━━━━━
Tasks completed: 12
Skills created: 2
Lessons learned: 5
Meetings held: 3
Blockers: 1 (Bugsy needs test data for auth module)
Team mood: 87% 😊
Next: Sprint review tomorrow at 9am
```

---

## Plugin & Skill Ecosystem

### The Living Skill Library
Every skill an agent creates is stored, versioned, and reusable:
- Agents build skills from their work experience
- Skills are tested against real tasks before being "published"
- Other agents (and YOU) can use these skills in future projects
- The library grows organically as the team works

### Cowork Plugin
A plugin that syncs with the Hive:
- Install in your Cowork sessions
- Access the team's accumulated skills
- Assign tasks directly from conversations
- Get live agent status updates
- Pull deliverables from agents into your workspace

### Claude Code Integration
- Agent Teams API for multi-instance orchestration
- Shared task list with dependency tracking
- Code output automatically fed to Tester for validation
- Archivist captures patterns from every coding session

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
- [ ] Set up Next.js + Convex project
- [ ] Build the pixel world renderer (PixiJS)
- [ ] Create 10 agent characters with sprites
- [ ] Implement agent movement and basic AI loop
- [ ] Design office layout (office, meeting room, break room, homes)

### Phase 2: Agent Brains (Weeks 3-5)
- [ ] Connect Claude API for agent decision-making
- [ ] Implement Agent SDK (typed world interface)
- [ ] Build memory system (short-term + long-term)
- [ ] Task assignment and completion flow
- [ ] Agent-to-agent messaging

### Phase 3: Gamification (Weeks 5-7)
- [ ] XP, levels, and progression system
- [ ] Learning/reward cycles
- [ ] Meeting system with actual outcomes
- [ ] Notification and digest system
- [ ] Owner control panel

### Phase 4: Integration (Weeks 7-9)
- [ ] Cowork plugin for bidirectional sync
- [ ] Skill creation and library system
- [ ] Claude Code agent bridge
- [ ] Task import from real projects

### Phase 5: Polish (Weeks 9-12)
- [ ] Better pixel art and animations
- [ ] Sound effects and ambient audio
- [ ] Mobile-responsive view
- [ ] Performance optimization
- [ ] Public deployment on Vercel

---

## Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14+, React | Modern, fast, Vercel-native |
| Rendering | PixiJS + pixi-react | Proven for 2D pixel games, 60fps |
| Real-time DB | Convex | Reactive subscriptions, used by AI Town |
| Agent Brains | Claude API (Sonnet/Opus) | Native — it's Claude all the way down |
| Auth | Clerk or Auth.js | Simple, Convex-compatible |
| Deploy | Vercel | Zero-config, edge functions |
| Plugin | Cowork Plugin SDK | Native integration with your workflow |
| Sprites | Aseprite → spritesheets | Industry standard pixel art tool |

---

## Open Questions to Explore Together

1. **Agent autonomy level** — How much should agents decide on their own vs. asking you? (Suggest: high autonomy with daily digests)
2. **Persistent vs. session** — Should the world run 24/7 (agents working while you sleep) or only when you're watching? (Suggest: 24/7 with catch-up summaries)
3. **Multi-project** — Can the team work on multiple projects simultaneously? (Suggest: yes, Cowork manages the portfolio)
4. **Cost management** — Each agent action = Claude API call. How do we budget? (Suggest: action batching + smart caching)
5. **Voice** — Should agents have distinct writing voices in their reports? (Suggest: yes, personality-driven)
