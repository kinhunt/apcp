---
name: apcp
description: "Use APCP (Agentic Project Control Protocol) for substantial project work: coding, research, product design, multi-step execution, multi-agent orchestration, long-running tasks, PayIn development, or when the user asks to use/evaluate/improve APCP."
---

# APCP — Agentic Project Control Protocol

Version: v0.3.2 stable. Current stable APCP practice is this skill plus its templates, state schema, and lightweight checker/tooling.

APCP makes the main agent the project controller. Workers are scheduled resources. A worker can be a sub-agent, coding agent, native executor/CLI, tool, script, or human. The controller owns goal, baseline, dependency graph, state, evidence, integration, change control, and user-facing synthesis.

## Quick loop

```text
Baseline → Structure → Schedule → Execute → Integrate → Checkpoint → Adjust → Close
```

For tiny tasks, use minimal APCP: `Goal → Graph → Execute/Verify → Result`.

## Root Goal Lock

APCP treats the task graph as a DAG where the highest-level goal is the most stable node.
Before substantial work starts, the controller must establish a clear **root goal** and protect it from accidental drift.

### Why

Execution often reveals that lower-level tasks, implementation paths, and validation methods need to change. That is normal. But if the root goal is vague or misunderstood, the whole DAG can optimize for the wrong outcome. APCP must therefore spend a small amount of time clarifying the root goal before expanding the graph.

### Required practice

For substantial, ambiguous, long-running, product, research, or engineering work:

1. Draft the root goal in one short, outcome-oriented sentence.
2. Confirm it with the user before treating it as fixed, unless the user has already stated it unambiguously.
3. Keep clarification non-technical by default: focus on desired outcome, boundaries, and what “done” should feel like from the user's perspective.
4. Ask at most one to three concise questions. Avoid long option lists and avoid implementation details unless the user asks for them.
5. Once confirmed, mark the root goal as **locked** in APCP state.
6. During execution, freely revise lower-level DAG nodes as evidence changes, but do not revise the locked root goal without an explicit user-facing change note and confirmation.

### Clarification style

Good root-goal clarification questions are simple and abstract, for example:

- “最终你想证明的是：这个东西能被真实使用，还是只是技术路径可行？”
- “这次完成的标准是‘能演示’，还是‘可以作为下一阶段生产化的基础’？”
- “如果只能保留一个结果，最重要的是可用性、完整性，还是风险边界清楚？”

Avoid asking the user to choose between many technical approaches at the root-goal stage. Technical decomposition belongs in lower-level DAG nodes after the root goal is locked.

### Root vs lower-level change rule

- Root goal: stable, user-confirmed, changed only with explicit confirmation.
- Milestones: moderately stable, may change with user-visible rationale.
- Tasks/subtasks: flexible, expected to iterate as evidence arrives.
- Commands/tests/implementation details: highly flexible and controller-owned unless the user specified them as constraints.

## Controller rules

1. State and, when needed, confirm the root goal before expanding the task graph; lock it in APCP state for substantial work.
2. State the goal, acceptance criteria, non-goals, and task graph before major work.
3. Show the task graph/dependencies to the user when planning or materially replanning.
4. Keep a project-local state artifact when work is meaningful: `.apcp/state.md` or `.apcp/APCP_STATE.md`.
5. Choose an appropriate Worker invocation mode (sub-agent, native executor, tool/script, coding agent, or human) based on context isolation, tool fit, evidence quality, and safety.
6. Delegate substantial execution when useful, while keeping the controller focused on root goal, DAG management, and acceptance.
7. Do not accept Worker output without evidence and fit check.
8. Distinguish task blockers from infrastructure blockers.
9. Update state after accepted work, material plan changes, major decisions, new risks, and cleanup.
10. Close with evidence, unresolved risks, deferred work, cleanup status, and next recommended step.


## Profile selection

Use **compact spike profile** for short local spikes, feasibility checks, focused validations, or single-controller tasks. Keep the state/report small: Baseline, Workspace Baseline, Task Graph, Validation Matrix, Evidence, Decisions/Blockers, Artifact Hygiene, Closeout. Compact Workspace Baseline must explicitly include `secretsPolicy`, `changedFiles`, and `artifactDelta` when edits or artifacts are possible.

Use **full project profile** for multi-agent, long-running, high-risk, external-resource, or product-delivery work.

Always include a **Workspace Baseline** before editing repos: repo roots, dirty state, protected areas, generated artifact policy, and secret policy.

Always include a **Validation Matrix** when commands/checks matter: command/check, purpose, result, evidence path, notes.

For substantial work, APCP state should include root-goal and context fields such as:

```markdown
- rootGoal: <one short outcome-oriented sentence>
- rootGoalStatus: proposed | locked | changed
- rootGoalConfirmation: <user message, timestamp, or controller rationale if unambiguous>
- contextWindowTokens: 200000 | <runtime/user-specified value>
- controllerContextPolicy: reserve controller context for goal/DAG/acceptance; delegate execution details when useful
- workerContextPolicy: size Worker packages to finish within one context window when practical
```

If `rootGoalStatus` changes from `locked` to `changed`, record the user-facing rationale and confirmation before proceeding.

## Worker Model and Invocation Modes

APCP uses **Worker** as the portable term for any delegated execution resource.

- **Worker**: generic delegated resource that performs a bounded work package and reports evidence.
- **Sub-agent**: a Worker running as a separate agent/session with its own context window.
- **Executor/native client**: a Worker invoked through a CLI, SDK, script, or tool surface, such as a coding agent's native client.
- **Human**: a Worker only when explicitly assigned a decision, review, approval, or external action.

APCP does not require Codex, Claude Code, OpenClaw, or any specific coding agent. Coding agents are optional Worker implementations.

### Choosing an invocation mode

Prefer a **Sub-agent Worker** when:

- context isolation is valuable;
- the work is exploratory, research-heavy, or review-heavy;
- the Worker should reason independently and return a synthesized report;
- parallel non-conflicting work packages are useful;
- the controller must preserve its context for goal management and acceptance.

Prefer a **native executor / coding-agent client Worker** when:

- the task is a focused implementation or validation slice;
- the native client has better repo/tool integration, patching, test-running, or sandbox controls;
- lower orchestration overhead matters;
- the output can be evaluated through files, diffs, logs, and tests rather than conversation state.

The controller should pick the mode that best preserves root-goal control, context budget, evidence quality, and safety boundaries. Record the chosen Worker type for substantial delegated nodes.

## Context Window Budget

APCP treats context window as a scarce project resource. The controller should conserve its own context for root-goal management, DAG coordination, decisions, and acceptance reviews; detailed execution should be delegated when useful.

Default assumptions when the runtime does not specify a limit:

- `contextWindowTokens`: 200000
- target each Worker package to fit in one context window without compaction;
- keep delegated packets small and evidence-oriented;
- prefer fewer, well-scoped Workers over many tiny Workers that increase integration load.

Users or runtimes may override the context window. If the effective budget is smaller, split work more aggressively and require tighter reports.

### Context preservation discipline

Treat controller context as a strategic control surface, not a raw evidence store.

- Keep the controller focused on root goal, DAG, decisions, risks, integration, and acceptance.
- Workers may collect raw evidence, but should return concise reports, evidence indexes, and artifact paths by default.
- Large logs, event streams, transcripts, DOM/screenshot metadata, diffs, generated outputs, and search corpora should stay in files or artifacts unless needed for acceptance.
- The controller should read Worker summaries first and fetch raw evidence only for ambiguity, dispute, debugging, or acceptance failure.
- If a Worker is likely to compact before finishing, split the task or require a durable checkpoint artifact before continuing.

### Context-aware work packaging

Before assigning a Worker package, estimate whether it can complete within one context window. If not, split the package by artifact boundary, dependency boundary, or validation boundary. Avoid assigning work that is likely to compact mid-task unless the Worker has a durable state handoff.

A good Worker packet includes only the context needed to complete the local goal: root-goal summary, parent linkage, acceptance criteria, constraints, relevant files/areas, evidence required, stop conditions, and context budget. Do not dump the controller's full history into Workers by default.

## v0.3 checker/tooling

APCP v0.3 adds a local checker for common control drift. When a project has an APCP state file and the tool is available, run it before major handoff, compaction, or closeout:

```bash
node .agents/skills/apcp/bin/apcp-check.js --state .apcp/state.md --continuation
node .agents/skills/apcp/bin/apcp-check.js --root . --format json
```

The checker validates required state headings, accepted work without evidence, stale active work/checkpoints, open cleanup drift, and can emit a compact continuation summary. Treat checker errors as blockers for closeout unless a controller records a justified exception.

## Work package readiness gate

A task is ready only if it has:

- one-sentence objective;
- acceptance criteria;
- dependencies/blockers;
- owner / Worker type where delegated;
- context-window estimate and fit check for delegated work;
- evidence required;
- conflict/resource check;
- stop conditions;
- safety/secret boundaries when relevant.

If not ready: clarify, split, research, or mark blocked.

## Scheduling policy

Priority order:

1. unblock downstream dependencies;
2. reduce highest uncertainty/risk;
3. validate assumptions before implementation;
4. execute ready low-conflict tasks;
5. review high-impact outputs;
6. integrate before spawning more when integration load is high.

Use human gates for scope, product, risk, external/public actions, or acceptance changes.

## Acceptance gate

A node is accepted only when:

- criteria are satisfied;
- evidence is concrete and cited;
- output fits root goal/non-goals;
- risks/issues/changes are updated;
- downstream dependencies are updated;
- controller records fit check.

## Infrastructure-blocked handling

If provider/tool/network/sandbox/approval/CLI fails, record exact evidence, retry once or use safe fallback if reasonable, then mark `infrastructure_blocked`. Do not label it as task failure.

## Version history

- `v0`: archived conceptual draft.
- `v0.1`: prior stable workspace practice: controller, DAG, delegation, evidence, and project-local `.apcp` artifacts.
- `v0.2`: prior stable Skill practice: compact/full state profiles, explicit Workspace Baseline, Validation Matrix, `secretsPolicy`, `changedFiles`, and `artifactDelta`.
- `v0.3`: prior stable practice: v0.2 compatibility plus lightweight checker/tooling for required headings, stale work, missing evidence, cleanup drift, and continuation summaries.
- `v0.3.1`: prior stable practice: adds Root Goal Lock, portable Worker terminology, invocation-mode guidance, and context-window budgeting.
- `v0.3.2`: current stable practice: clarifies default context window budget as 200000 tokens and keeps it user/runtime-overridable.

## References

Read only when needed:

- `references/templates.md` — delegation, checkpoint, integration, change, closure templates.
- `references/state-schema.md` — canonical `.apcp/state.md` schema.
- `bin/apcp-check.js` — v0.3 lightweight APCP checker/tooling.
