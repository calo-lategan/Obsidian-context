# Ω-AGI-v4 — Reasoning Protocol
# Global CLAUDE.md — Load on every session, every task, every sub-task

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
