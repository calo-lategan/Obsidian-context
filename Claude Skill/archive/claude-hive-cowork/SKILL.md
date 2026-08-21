---
name: claude-hive-cowork
description: |
  Claude Hive Cowork Integration — connects Claude Cowork sessions to the Claude Hive virtual office.
  Use this skill when starting or managing a Cowork session that interacts with the Hive pixel-art office.
  Handles agent communication via the /api/chat endpoint, meeting scheduling, task coordination,
  and team management through the Hive web app at localhost:3000.
trigger_on:
  - cowork hive
  - hive cowork
  - cowork session
  - hive chat
  - talk to agents
  - agent chat
  - hive meeting
  - cowork agents
  - hive team
  - start cowork
  - connect cowork
  - hive integration
---

# Claude Hive Cowork Integration

## Purpose
Bridge between Claude Cowork and the Claude Hive virtual office web app. When activated, this skill enables real-time communication between a Cowork session and the 10 AI agent characters in the Hive.

## Architecture

```
Claude Cowork Session
       |
       v
  POST /api/chat (localhost:3000)
       |
       v
  Next.js API Route → Anthropic Claude API
       |
       v
  Agent Responses → Zustand Store → Canvas + Dashboard UI
```

## API Endpoint

**POST http://localhost:3000/api/chat**

Request:
```json
{
  "userMessage": "What's the sprint status?",
  "recentMessages": [
    { "from": "Chief", "content": "Sprint 3 is underway." }
  ],
  "agents": [
    { "id": "chief", "name": "Chief", "role": "CEO / Manager", "activity": "Reviewing project pipeline" }
  ]
}
```

Response:
```json
{
  "responses": [
    { "agentId": "chief", "content": "Sprint 3 is on track! Auth system at 80%.", "type": "status_update" }
  ],
  "meeting": null
}
```

## Agent Roster

| ID | Name | Role | Responds To |
|----|------|------|-------------|
| chief | Chief | CEO/Manager | meetings, status, planning, team coordination |
| apex | Apex | CTO/Supervisor | code review, architecture, PRs, quality |
| archie | Archie | Lead Researcher | research, investigation, evaluation |
| pixel | Pixel | Senior Developer | coding, building, implementing, features |
| bugsy | Bugsy | QA Engineer | testing, bugs, edge cases, quality |
| palette | Palette | UI/UX Designer | design, UI, layout, colors, mockups |
| sage | Sage | Skill Creator | patterns, best practices, skills |
| forge | Forge | Integration Engineer | APIs, webhooks, integrations, sync |
| tempo | Tempo | Project Manager | timelines, sprints, deadlines, velocity |
| recall | Recall | Documentation | ADRs, docs, knowledge base, notes |

## Setup

1. Set `ANTHROPIC_API_KEY` in your environment
2. Start the Hive: `cd claude-hive && npm run dev`
3. Open http://localhost:3000 and use the Chat tab

## Cowork Session Protocol

When starting a Cowork session connected to the Hive:

1. **Verify the Hive is running** — Check localhost:3000 responds
2. **Send initial greeting** — POST to /api/chat with a greeting message
3. **Route messages intelligently** — Use agent keyword routing (code→Pixel, test→Bugsy, etc.)
4. **Handle meetings** — When meeting is requested, the API returns a meeting object to add
5. **Track context** — Send last 15 messages as context for continuity

## Message Types

- `chat` — General conversation
- `status_update` — Progress reports
- `question` — Asking for help/input
- `knowledge_share` — Sharing findings/research
- `meeting_note` — Meeting-related communication
