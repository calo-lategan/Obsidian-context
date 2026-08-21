# COEEx OS v1.1 — Operational Excellence Cognitive Operating System

> Installable Cowork plugin (also Claude Code compatible). Converts the full mental model of a Certified Operational Efficiency Expert into a modular, hookable, command-driven cognitive OS.

## What's new in v1.1

- **167 skills** (up from 134) — added antifragility, Wardley, Cynefin, SMED, 8D, Shainin, QFD, TWI, Yokoten, Nemawashi, QRM, Beyond Budgeting, CCPM, 7 Management Tools (affinity, interrelationship, tree, prioritization matrix, PDPC), LPA, SWCS, visual management board, field service, call center, pharma GxP, restaurant, banking back-office
- **7 executable scripts** in `scripts/` — Little's Law, OEE, ABC, RPN, Cp/Cpk, takt, Kingman wait (output enters context, source doesn't)
- **References-pattern** progressive disclosure on deep skills (TOC, Queueing, Diagnosis protocol)
- **Expanded knowledge graph** — 167 nodes, 124 edges with cross-concept relationships
- **5 meta skills** — skill-index-router, knowledge-graph-router (GraphRAG-lite), compaction-protocol, references-pattern, cowork-mcp-orchestration
- **MCP setup plan** at `tools/mcp/` — Cowork registry + Claude Code MCP compatible

## What's in the box

| Layer | Count | Notes |
|------|------|------|
| Skills | **167** | 20 principles · 40 frameworks · 5 change · 25 analysis · 10 wastes · 18 documentation · 15 diagnostics · 15 domain · 13 tools · 5 meta · 1 master |
| Commands | 12 | `/fullsystem` (21 steps) + `/diagnose` `/map` `/rootcause` `/optimize` `/audit` `/waste` `/kpi` `/flow` `/document` `/automate` `/scale` |
| Scripts | 7 | Executable Python helpers — output-only into context |
| Templates | 15 | SOP, RACI, SIPOC, VSM, A3, FMEA, control plan, charter, risk register, KPI scorecard, capability matrix, work instruction, decision tree, audit log, operational scorecard |
| Case studies | 10 | Toyota, Amazon, Walmart, FedEx, Tesla, McDonald's, construction LPS, warehouse FC, Virginia Mason, Spotify |
| Knowledge graph | 167 nodes · 124 edges | Cross-concept routing |
| Tool integration | 4 systems | Figma · Google Docs · Google Sheets · Power BI |
| MCP plan | 15 connectors | Ranked by ROI, Cowork + Claude Code compatible |

## Install
- **Cowork**: open the `coeex-os.plugin` file → click Install plugin
- **Claude Code**: unzip into `~/.claude/plugins/coeex-os/`

## Master command
`/fullsystem` — runs the 21-step end-to-end operational diagnosis with tool-stack deliverables.

## License
MIT
