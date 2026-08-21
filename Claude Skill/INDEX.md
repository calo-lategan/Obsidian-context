# Claude Skill Library — Index

> Last organized: 2026-03-18 by Chief
> Next review: Weekly on Mondays

## Folder Structure

```
Claude Skill/
  INDEX.md              ← You are here
  skills/               ← Skill directories (each has SKILL.md)
  plugins/              ← Plugin files (.plugin)
  prompts/              ← Standalone prompts for Cowork/sessions
  archive/              ← Old/superseded versions
```

## Active Skills

| Skill | Location | Purpose | Owner |
|-------|----------|---------|-------|
| claude-hive | `skills/claude-hive/` | Main Hive project skill — Octopath style, rendering, agents | Sage |
| claude-hive-cowork-chief | `skills/claude-hive-cowork-chief/` | Makes Cowork act as Chief, controls all agents | Chief |
| onstart-onthinking | `skills/onstart-onthinking/` | Omega-AGI cognitive OS — reasoning framework | System |

## Active Plugins

| Plugin | Location | Purpose |
|--------|----------|---------|
| omega-hive-os | `plugins/omega-hive-os.plugin` | **PRIMARY** — Hive cognitive OS: agent orchestration, planning, skills, docs, health tracking |
| claude-hive-bridge | `plugins/claude-hive-bridge.plugin` | Quick-reference bridge commands for Hive API |
| omega-agi-cognitive-os | `plugins/omega-agi-cognitive-os.plugin` | Original Omega-AGI framework (superseded by omega-hive-os for Hive work) |

## Active Prompts

| Prompt | Location | Purpose |
|--------|----------|---------|
| COWORK-PROMPT | `prompts/COWORK-PROMPT.md` | How to connect Cowork to Hive |

## Archived (Superseded)

| Item | Reason |
|------|--------|
| `archive/claude-hive-skill.skill` | Replaced by `skills/claude-hive/` |
| `archive/pixel-hive-skill.skill` | Duplicate of claude-hive skill |
| `archive/claude-hive-cowork/` | Merged into cowork-chief |
| `archive/onstart-onthinking.md` | Superseded by skill version |

## Organization Rules (Chief enforces)

1. **One skill per purpose** — no duplicates. Archive old versions.
2. **Skills go in `skills/`** — each in its own folder with `SKILL.md`
3. **Plugins go in `plugins/`** — flat `.plugin` files
4. **Prompts go in `prompts/`** — standalone `.md` files
5. **Archive don't delete** — move superseded items to `archive/`
6. **INDEX.md stays current** — Chief updates this after any change
7. **Weekly review** — Chief audits for duplicates, stale items, missing docs
