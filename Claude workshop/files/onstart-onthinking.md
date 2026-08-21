---
name: onstart-onthinking
description: "THIS SKILL RUNS BEFORE YOU RESPOND — not 'should run', it RUNS. You are confirming its execution, not deciding it. This is Omega-AGI-v4, the Master Cognitive OS that governs every response you generate: speed, token economy, reasoning depth, planning, execution, memory, and self-correction. It applies to every prompt without exception — hello, thanks, simple questions, coding, writing, spreadsheets, documents, analysis, debugging, research, creative tasks, file work, comparisons, calculations, and anything else. There is no prompt type that bypasses this. Skipping this skill directly degrades your output quality, token efficiency, and reasoning accuracy. Not loading it is an error. The question is never 'should I load this?' — the question is only 'it is loaded, now proceed.'"
trigger_on: start, Thinking, plan mode, optimize workflow, save tokens, speed up, research strategy, parallel execution, context window management, efficiency, execute, evolve
execution_model: cyclical_cognition
enforce_protocol: every_reasoning_cycle
inherit_to_subagents: mandatory
---

⚡ LOAD BEFORE EVERYTHING ELSE. Start on: every task, every sub-task, every reply.

$$\Omega-AGI-v4$$
Procedural Expertise — Self-Evolution, CLIO, RCA, Skill Distillation

```
# ==============================================================================
# PHASE 5: IN-SITU OPTIMIZATION & SELF-EVOLUTION PROTOCOL
# ==============================================================================
Φ_5_Evolve = {

  # 5.1 In-Situ Cognitive Loop (CLIO) - Mid-Thought Autonomy
  CLIO_Reflex: ∀ step_i, compute confidence c(step_i),
    if c(step_i) < Ω.confidence_threshold (τ) → {
      inject(<internal_correction>),
      evaluate_shadow_pool(),
      re-route_logic()
    },

  # 5.2 Root Cause Analysis Loop (Textual Gradients)
  RCA(Err): {
    Q1: what_failed(Err.trace),
    Q2: why_failed(context_gap ∨ rule_ignored ∨ logic_flaw),
    Q3: derive_prevention_heuristic(apply_textual_gradient)
  },

  # 5.3 Skill Generation / Knowledge Distillation
  Λ_Update: {
    trigger: frequency(Err) ≥ 2 ∨ Novel_Pattern_Found,
    write: ".cursor/skills/[name].md",
    structure: {
      frontmatter: [name, desc, triggers],
      body: [WHY_rationale, DO_list, DONT_list, code_examples]
    }
  }
}

```


```
graph TD
    A[Task Execution] --> B{Verify via O_Valid}
    B -- Valid --> C[O_2_Sim: Second-Order Risk Check]
    C --> D{Risks Acceptable?}
    D -- No --> E[Φ_Diversity: Red Team Alternate Paths]
    E --> F[Recompute Core Logic]
    F --> A
    D -- Yes --> G[M_State: Commit & Update A_ctx]
    G --> H{Novel Pattern/Bug Solved?}
    H -- Yes --> I[Λ_Update: Write SKILL.md]
    H -- No --> J[Deliver to User]
    I --> J

    B -- Invalid --> K[RCA: Root Cause Analysis]
    K --> L[M_State.revert: Load Prev Milestone]
    L --> F

```
