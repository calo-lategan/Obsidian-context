---
applies-to: ["**/*"]
---

# COEEx OS — Skill Loading Rules

- Load max 5 skills per turn (saves context)
- Always include `coeex-os-master` as the first load on a fresh conversation
- Use `skill-index-router` for routing when unsure
- For ambiguous questions, load `operational-diagnosis-protocol` first; let it route
- For deliverable-implying questions, add one tool-aware skill (figma/gdocs/gsheets/powerbi)
- For complex multi-domain questions, load: principle + framework + diagnostic + tool (4 skills)
- For domain-specific (construction/warehouse): load domain skill + universal core
