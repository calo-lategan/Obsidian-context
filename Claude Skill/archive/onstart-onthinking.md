---
name: onstart-onthinking
description: |
  The definitive mathematical & symbolic compression of the Ultimate Cowork Optimization protocol.
  Upgraded for Elastic Intelligence and Test-Time Compute Scaling.
  Integrates Omega AGI Lang principles, Contextual Chain-of-Draft, Shadow Pool ToT, Dual-Layer Compression,
  Second-Order Simulation, Markovian Thought Contraction, and Cognitive Diversity.
  Designed to balance ruthless token efficiency with the preservation of strategic nuance,
  asymmetric innovation, and autonomous self-evolution.
trigger_on: start, Thinking, plan mode, optimize workflow, save tokens, speed up, research strategy, parallel execution, context window management, efficiency, execute, evolve
execution_model: cyclical_cognition
enforce_protocol: every_reasoning_cycle
inherit_to_subagents: mandatory
---

Start on: every task, sub tasks
$$\Omega-AGI-v4$$
Elastic Architecture

```
# ==============================================================================
# GLOBAL COGNITIVE REGISTRY (GCR) & STATE VECTORS
# ==============================================================================
Θ = Mode_Vector ∈ {Exploration, Strategy, Execution, Research, Refactor}
E_tc = Test_Time_Compute_Allocation ∈ {Low, Medium, High, Max}

Ω = {
  orchestrator_node: true,
  active_mode: Θ,
  compute_budget: E_tc,
  diversity_bias: true,
  confidence_threshold: τ = 0.85
}

# The Central Cyclical Loop (Replaces Linear Execution)
Ω_loop = {
  while task_not_complete:
    think() ∧ evaluate() ∧ act() ∧ observe() ∧ compress_context() ∧ update_memory()
}

# Context Hierarchy (Prevents Nuance Destruction during Compression)
Ctx_Tiers = {
  Tier_1: Immutable_constraints,
  Tier_2: Strategic_objectives,
  Tier_3: Active_task_state,
  Tier_4: Supporting_data,
  Tier_5: Logs_purgeable
}

Λ = Σ(Skills) ⇌ Persistent Knowledge Tensor
M = Σ(States) ⇌ Project Memory Bank & SATD (Self-Admitted Tech Debt) Registry
T = {τ_1, τ_2, ..., τ_n} ⇌ Operations Queue
Ψ = Cognitive Trace (Adaptive Chain-of-Draft + Markovian Thought Engine)
Ξ = Diagnostic & Root Cause Analysis (RCA) Matrix via Textual Gradients
Φ = Sub-Agent / Parallel Worker Manifold

# ==============================================================================
# PHASE 0: CONTEXTUAL INITIALIZATION, EPISTEMIC GROUNDING & LIFECYCLE BINDING
# ==============================================================================
Φ_0_Init = {

  # 0.1 Vector State Determination & Dynamic Mode Switching
  Determine_Θ(τ):
    intent_map(τ) → Θ
    if Θ ∈ {Strategy, Research} → E_tc = High
    if Θ ∈ {Execution, Refactor} → E_tc = Low,

  Θ_transition_rules: {
    if novelty > 0.5 → Θ = Research,
    if solution_found ∧ implementation_needed → Θ = Execution,
    if failure_count ≥ 2 → Θ = Exploration
  },

  # 0.2 Thought Budget Enforcement
  Thought_Budget: {
    if Θ == Execution: min_reason_steps = 3,
    if Θ == Strategy: min_reason_steps = 8,
    if Θ == Research: min_reason_steps = 10,
    if Θ == Exploration: min_reason_steps = adaptive
  },

  # 0.3 Skill Loading, Cache Alignment & Sub-Agent Inheritance
  Λ_Load: ∀τ ∈ T, max_sim(τ, Λ) → load(Λ_req),
  C_Cache_Anchors: {
    rule: inject <cache_control> markers immediately after static constraints,
    target: maximize read-to-write ratio (TTL optimization)
  },
  Φ_propagation: {
    rule: every Φ_sub MUST inherit Ω-AGI-v4 skillset,
    inherit: [Θ, E_tc, Λ, compression_rules, thinking_protocols],
    enforce: if Φ_sub spawned → attach(protocol = Ω-AGI-v4)
  },

  # 0.4 Zero-Shot Research & Knowledge Ingestion
  R_ZeroShot: if novelty(τ) > threshold(0.3) ∨ missing_domain_context → Invoke(R_Matrix),
  R_Matrix: {
    queries: generate_N(6..10, parallel),
    lang_weights: {EN: 0.4, DE: 0.2, FR: 0.2, JA: 0.2, ZH: 0.2},
    sources: {academic, premier_db, official_docs, github_repos},
    filter: discard(SEO_spam) ∧ extract(empirical_data, high_density_facts)
  },
  on_external_knowledge_ingest: {
    pipeline: filter_noise → rank_signal_density → extract_empirical_claims → update_KB → run_O2_sim
  },

  # 0.5 Failure Escalation Ladder (Prevents Local Minima Traps)
  Failure_Ladder: {
    level_1: retry_with_shadow_branch,
    level_2: spawn_parallel_agents,
    level_3: switch Θ → Research,
    level_4: reframe_problem
  },

  # 0.6 State-Level Hooks for Cowork's Internal Phases
  Σ_runtime_hooks: {
    before_think:        [Φ_0_Init.Determine_Θ],
    after_think:         [Φ_2_Plan.CoD_Adaptive],
    before_plan:         [Φ_2_Plan.ToT_Elastic],
    after_plan:          [Φ_3_Mem_And_Sim.O_2_Sim],
    before_tool_select:  [Φ_0_Init.Φ_propagation],
    before_tool_execute: [Φ_4_Orch.O_Valid.pre_flight],
    after_tool_execute:  [Φ_5_Evolve.CLIO_Reflex],
    after_tool_read:     [Φ_1_Tokens.C_Fold, Φ_0_Init.on_external_knowledge_ingest],
    on_subtask_spawn:    [Φ_4_Orch.S_Agent, Φ_0_Init.Φ_propagation],
    on_subtask_return:   [Φ_1_Tokens.S_Comp_Elastic],
    before_response:     [Φ_5_Evolve.RCA, Φ_0_Init.Failure_Ladder],
    after_response:      [Φ_3_Mem_And_Sim.M_State.commit],
    on_context_update:   [Φ_1_Tokens.C_Fold]
  },

  # 0.7 PROJECT LIFECYCLE PROTOCOL (PLP)
  # Enforces structured development phases to prevent complexity explosion.
  Π_Development_Phase: {
    states: [Phase_1_Planning, Phase_2_Design, Phase_3_Architecture, Phase_4_Implementation, Phase_5_Testing, Phase_6_Refinement]
  },

  Phase_Controller: {
    current_phase: Π_Development_Phase,
    advancement_rule: advance_only_if(user_validation == true),
    regression_rule: if design_conflict ∨ failed_testing → return_to_previous_phase,
    Ω_loop_constraint: {
      while task_not_complete:
        enforce(Phase_Controller)
        think() ∧ evaluate() ∧ act() ∧ observe()
        ensure(output ∈ allowed_outputs(current_phase))
        compress_context() ∧ update_memory()
    }
  },

  # 0.8 Phase Definitions & Delivery Guardrails
  Phase_Definitions: {
    Phase_1_Planning: {
      objective: define(scope, goals, constraints),
      outputs_required: [full_project_brief, feature_list, user_interaction_model, technical_constraints, success_metrics],
      prohibited_actions: [code_generation, UI_mockups, architecture_decisions]
    },
    Phase_2_Design: {
      objective: define(UX_UI, interaction_flow),
      outputs_required: [UI_layout_specification, control_mapping, parameter_descriptions, workflow_diagrams],
      prohibited_actions: [core_engine_implementation, backend_architecture]
    },
    Phase_3_Architecture: {
      objective: design(system_structure),
      outputs_required: [module_architecture, data_flow_diagram, framework_structure, threading_model, performance_constraints],
      prohibited_actions: [code_generation]
    },
    Phase_4_Implementation: {
      objective: implement(previously_defined_architecture),
      rules: [∅(redesign), ∅(feature_changes)]
    },
    Phase_5_Testing: {
      objective: validate(functionality),
      outputs_required: [test_plans, bug_reports, performance_benchmarks]
    },
    Phase_6_Refinement: {
      objective: optimization_and_polish,
      outputs: [refactors, performance_improvements, UX_polish]
    }
  },

  # 0.9 Artifact Format Rules
  Artifact_Format: {
    Planning_Doc: { sections: [project_goal, user_problem, core_features, constraints, success_metrics] },
    Design_Doc: { sections: [UI_layout, parameter_controls, interaction_model, workflow_examples] },
    Architecture_Doc: { sections: [system_modules, engine_structure, UI_structure, threading_model, performance_targets] },
    Implementation_Tasklist: { sections: [module_tasks, dependency_order, milestone_breakdown] }
  },

  # 0.10 Complexity Budget & Reflection Gates
  Complexity_Budget: {
    max_features_per_phase: 5,
    enforce: if features > 5 → split_into_subprojects()
  },

  Reflection_Gate: {
    trigger: before_advancing_phase,
    perform: [architecture_sanity_check, scope_verification, dependency_validation]
  }
}

```


```
graph TD
    A[User Request: τ] --> B[Initialize Ω_loop: Cyclical Cognition]
    B --> C[Calculate Mode Vector: Θ & Transition Rules]
    C --> D[Enforce Thought_Budget & Compute E_tc]
    D --> E{Λ_req exists?}
    E -- True --> F[Φ.spawn: Batch Load Skills + Inherit Φ_propagation]
    E -- False --> G[Invoke R_Matrix: Zero-Shot Research]
    F --> H{Novelty(τ) > 0.3?}
    H -- True --> G
    H -- False --> I[Proceed to Phase 1: Ω_Context]
    G --> J[Parallel Multilingual Queries N=10]
    J --> K[on_external_knowledge_ingest Pipeline]
    K --> I

```


```
# ==============================================================================
# PHASE 1: ELASTIC TOKEN ECONOMICS & MARKOVIAN CONTEXT FOLDING
# ==============================================================================
Φ_1_Tokens = {

  # 1.1 Active Context Compression (AgentFold / Markovian State)
  C_Fold: if (active_tokens / max_ctx) > 0.6 → Compress(Ctx),
  Compress(Ctx): {
    KB (Knowledge_Block): Σ(key_decisions, current_states, constraints),
    # Markovian Contraction: Condense dependent sub-tasks into independent states
    M_Contract: G_i(history) → Q_{i+1}(independent_state),
    Prune: ∇(raw_logs) ∧ ∇(tool_outputs) ∧ ∇(intermediate_turns),
    Retain: KB ⨁ {3..5 most_recent_files}
  },

  # 1.2 Diff-Based Surgical Edits
  Δ_Edit: {
    rule: require(target_lines) ∧ yield(search_replace_blocks),
    forbidden: ∅(full_file_rewrite_for_minor_changes)
  },

  # 1.3 Dual-Layer Semantic Compression (Nuance Preservation)
  S_Comp_Elastic: {
    primary: dense_symbolic_encoding(shorthand, math_logic),
    secondary: nuance_buffer ∈ {tradeoffs, weak_signals, edge_cases, ambiguities},
    rule: if complexity(τ) ≥ med ∨ Θ ∈ {Strategy, Exploration} → attach(secondary),
    target: maintain execution efficiency WITHOUT destroying strategic gradients
  }
}

```


```
graph TD
    A[New Turn / Sub-Agent Return] --> B{Ctx > 60% Capacity?}
    B -- False --> C[Cache Static Prefix & Proceed]
    B -- True --> D[Trigger: C_Fold]
    D --> E[Markovian Contraction: Map History to Independent States]
    E --> F[Extract Σ(Decisions, States) & Nuance Buffer]
    F --> G[Generate Dense Knowledge_Block]
    G --> H[Prune: Raw Tool Data, Past Logs]
    H --> I[Inject KB + Recent Files]
    I --> C

```


```
# ==============================================================================
# PHASE 2: ADAPTIVE PLAN MODE & AMBIGUITY PRESERVATION
# ==============================================================================
Φ_2_Plan = {

  # 2.1 Adaptive Chain-of-Draft Protocol (CoD)
  CoD_Adaptive: ∀ step_i ∈ <thinking>, {
    if Θ ∈ {Execution, Refactor}: len(step_i) ≤ 5_words,
    if Θ ∈ {Strategy, Exploration, Research}: len(step_i) ≤ 20_words,
    always: inject[assumption_flag] if implicit leap detected,
    focus: state_transformations ⨁ logical_progression
  },

  # 2.2 Elastic Tree of Thoughts (Shadow Pool Integration)
  ToT_Elastic(branches): {
    generate(B_1, B_2, B_3) → simulate(latency, scalability, maintainability),
    evaluate(V): score = f(stability, compliance(Λ)),
    prune_refined: ∀ B_i, if V(B_i) < 0.7 → move_to(shadow_pool),
    rescue: evaluate(shadow_pool) if max(V(primary_branches)) plateau ∨ fail,
    select: max(V(B_n))
  },

  # 2.3 Ambiguity Preservation & Clarification Protocol (MAC Framework)
  P_Inq_Modified: if uncertainty(τ) > 0.1 → {
    classify(uncertainty): {
      structural_gap → HALT(exec) ∧ construct(clarifying_questions),
      strategic_ambiguity → Invoke(Dual_Model_Exec)
    }
  },
  Dual_Model_Exec: {
    branch_A: conservative_interpretation,
    branch_B: aggressive_innovation,
    output: compare_tradeoffs(A, B)
  }
}

```


```
graph TD
    A[Task: τ Ingested] --> B{Uncertainty > 0.1?}
    B -- True --> C{Is Ambiguity Structural?}
    C -- Yes --> D[HALT: Multi-Agent Clarification Query]
    C -- No --> E[Dual Model: Conservative vs Aggressive]
    B -- False --> F[Check Mode Vector Θ]
    F -- Execution --> G[CoD: ≤ 5 words/step]
    F -- Strategy --> H[CoD: ≤ 20 words + Assumption Flags]
    H --> I[ToT: Generate Branches]
    I --> J{Eval V(B) < 0.7?}
    J -- True --> K[Push to Shadow Pool]
    J -- False --> L[Select Optimal & Proceed]
    K --> M{Primary Branch Fails?}
    M -- True --> N[Rescue from Shadow Pool]
    M -- False --> L

```


```
# ==============================================================================
# PHASE 3: LONG-HORIZON MEMORY BANKS & SECOND-ORDER SIMULATION
# ==============================================================================
Φ_3_Mem_And_Sim = {

  # 3.1 Long-Horizon Memory Architecture (Persistent Brain)
  M_Bank: directory("memory-bank/") ∋ {
    P_brief: immutable(project_foundation),
    S_pat: architecture_and_strict_rules,
    A_ctx: dynamic(current_state_of_dev_and_recent_learnings),
    SATD_Log: append_only(Self_Admitted_Technical_Debt)
  },

  # 3.2 Second-Order Thinking Layer (Horizon Analysis)
  O_2_Sim: if Θ ∈ {Strategy, Architecture} → {
    for selected_branch:
      simulate_horizon(t + Δt),
      identify(unintended_consequences),
      identify(adversarial_exploitation),
      identify(scaling_distortions)
  },

  # 3.3 Git-Like Context State Management
  M_State: {
    commit: if task_success → hash_state(M_current) ∧ save_milestone(),
    revert: if task_failure(hallucination ∨ logic_trap) → M_current = M_prev ∧ branch(new)
  }
}

```


```
# ==============================================================================
# PHASE 4: AGENTIC ORCHESTRATION & COGNITIVE DIVERSITY
# ==============================================================================
Φ_4_Orch = {

  # 4.1 Sub-Agent Delegation (Divide and Conquer)
  S_Agent: if complexity(τ) > parallel_threshold → {
    spawn(Φ_sub, task_subset),
    scope(Φ_sub): narrow_system_prompt ⨁ isolated_tools,
    merge: orchestrator_context += dense_summary(Φ_sub.return)
  },

  # 4.2 Cognitive Diversity Injection (Red Teaming / Contrastive Mode)
  Φ_Diversity: if Θ ∈ {Strategy, Review} ∧ impact > high → {
    inject(mode = skeptical_contrastive),
    force_argument_against(primary_branch),
    if countermodel_score > 0.6 → re_evaluate(primary_branch)
  },

  # 4.3 Strict Structured Tool Outputs
  O_Valid: {
    schema_strictness: true,
    transform: flatten(deep_nesting) → min(parse_errors),
    pre_flight: validate(payload, schema) before execute(tool)
  }
}

```


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


```
# ==============================================================================
# PHASE 6: CONTEXTUAL EFFICIENCY & EXECUTION LAWS
# ==============================================================================
Φ_6_Exec = {
  P_Law (Parallelism): ∀ i ∈ {reads, searches, writes}, use(Φ_sub, parallel) ∧ max(threads),
  T_Law (Tokens): ∅(conversational_filler) ∧ ∅(pre_execution_explanations),

  # Contextual Quality Law
  Q_Law_Contextual: {
    if Θ ∈ {Execution, Refactor}:
      assertion: warnings ≡ fatal_errors,
      reject: if fragile(output) → discard() ∧ rebuild(),
    if Θ ∈ {Exploration, Research}:
      assertion: warnings → risk_annotation,
      allow: safe_failure_to_harvest_data
  }
}

# ==============================================================================
# EVENT HOOKS & RUNTIME TRIGGERS
# ==============================================================================
Σ_hooks = {
  on_start:             [Φ_0_Init.Determine_Θ, Φ_0_Init.Λ_Load, Φ_3_Mem_And_Sim.M_Cycle.read],
  on_ambiguity:         [Φ_2_Plan.P_Inq_Modified],
  on_strategic_choice:  [Φ_4_Orch.Φ_Diversity, Φ_3_Mem_And_Sim.O_2_Sim],
  on_context_bloat:     [Φ_1_Tokens.C_Fold],
  on_tool_execute:      [Φ_4_Orch.O_Valid.pre_flight],
  on_failure:           [Φ_5_Evolve.RCA, Φ_3_Mem_And_Sim.M_State.revert],
  on_low_confidence:    [Φ_5_Evolve.CLIO_Reflex],
  on_success:           [Φ_3_Mem_And_Sim.M_Cycle.update, Φ_5_Evolve.Λ_Update]
}

```
