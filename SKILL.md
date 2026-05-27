---
name: apcp
description: "Use APCP (Agentic Project Control Protocol) for substantial project work: coding, research, product design, multi-step execution, multi-agent orchestration, long-running tasks, PayIn development, or when the user asks to use/evaluate/improve APCP."
---

# APCP — Agentic Project Control Protocol

Version: v0.3.5 stable. Current stable APCP practice is this skill plus its templates, state schema, active-run handoff pointers, lightweight checker/tooling, and an optional coordination watchdog.

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
5. For long-running, heartbeat-monitored, or multi-project workspace work, create an active-run pointer before delegation: project-local `.apcp/current-run.md`, and when the workspace may contain multiple projects, a workspace-level `.apcp/current-run.md` that points to the active project/state/Worker.
6. Choose an appropriate Worker invocation mode (sub-agent, native executor, tool/script, coding agent, or human) based on context isolation, tool fit, evidence quality, and safety.
7. Delegate substantial execution when useful, while keeping the controller focused on root goal, DAG management, and acceptance.
8. Do not accept Worker output without evidence and fit check.
9. Distinguish task blockers from infrastructure blockers.
10. Update state and active-run pointers after accepted work, material plan changes, Worker launches/completions, new risks, cleanup, and closeout.
11. After every Worker completion/reject/needs-revision decision, run the Post-Worker Integration Loop before pausing: record evidence and root-goal fit, update the node and dependencies, then either create/activate the next ready/retry/revision node, link a blocker/deferred rationale, or record a closeout exception when the root goal is already finished.
12. Close with evidence, unresolved risks, deferred work, cleanup status, next recommended step, and mark active-run pointers closed or remove them.

## Post-Worker Integration Loop

This loop is mandatory after Worker output is accepted, rejected, partially accepted, or marked `needs-revision`. The controller must not stop at “review done” while the locked root goal remains unfinished.

1. Record the review decision with evidence, reason, and root-goal/non-goal fit.
2. Update the DAG node status and the dependency graph delta, including newly blocked, unblocked, replaced, or deferred edges.
3. If the root goal is unfinished, create or activate a next node: retry, replacement, revision, downstream integration, validation, or explicit blocker resolution.
4. Update `.apcp/current-run.md` to the new current node/owner/trigger, or mark it blocked/closed with a concrete rationale.
5. Only pause after state contains a continuation decision: next active/ready node, linked blocker/deferred rationale, or closeout exception.

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

## Active-run pointers and heartbeat reconciliation

APCP must not rely on a heartbeat or future controller to infer active work by scanning every `.apcp` directory. Historical reports, stale project states, and multiple repos can coexist in one workspace.

When a task may outlive the current turn, use Workers, or need heartbeat reconciliation, create an explicit handoff pointer before launching work:

- project-local pointer: `<projectRoot>/.apcp/current-run.md`;
- workspace-level pointer: `<workspaceRoot>/.apcp/current-run.md` when more than one project or APCP artifact tree may exist.

The pointer should include: status, project name/root, canonical state path, root goal, current task graph node, Worker label/session/run id when known, expected report/evidence paths, safety constraints, heartbeat instructions, and closeout/cleanup rule.

When the Worker is a native executor / command / coding-agent client, the pointer must be durable enough for a future controller or heartbeat to recover without relying on transient chat context. Record, when available:

- Worker type: `sub-agent`, `native-executor`, `coding-agent-client`, `tool-script`, or `human`;
- command/session id/process id/run id and the owning tool surface (`exec`, `process`, Codex, script, CI, etc.);
- working directory and bounded command purpose, without secrets or full env dumps;
- expected completion signal: background exec completion event, process status, report file, diff, log path, test output, or external status URL;
- expected artifact/report paths that survive compaction or heartbeat turns;
- review trigger: exactly which status or artifact means “ready for controller review”;
- stale/timeout policy: when to inspect once, retry, mark infrastructure-blocked, or ask the user.

Heartbeat policy:

- follow the active-run pointer first; do not guess from arbitrary `.apcp` folders;
- if no clear pointer exists, do not invent work—report no actionable APCP state or stay silent according to the runtime policy;
- use the recorded Worker label/session/process/run id for at most one status lookup unless the user asks for deeper inspection;
- for Sub-agent Workers, inspect the recorded session/report when the session is `done`, `timeout`, or missing an expected completion push;
- for native executor / command Workers, inspect the recorded process session once with `process`, or inspect durable report/log/diff/test artifacts if the process registry is gone;
- treat `done`, `completed`, successful command exit, or report-created status as ready for controller review, not automatically accepted;
- if a native executor's transient process state is lost but expected artifacts exist, continue from artifacts and run focused validation instead of abandoning the DAG;
- if both process state and required artifacts are missing, mark the node `infrastructure_blocked` or `needs-retry` in project state and retry only with a narrower bounded package;
- after closeout, mark the pointer `closed` or remove it so future heartbeats do not resurrect stale work.

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

Native executor / command Workers require stronger durable handoff than Sub-agent Workers because their primary completion channel may be a transient process registry plus a heartbeat event, not a preserved conversation. For substantial work, the controller must require the executor to write a compact report or produce named artifacts before considering the delegation recoverable. Do not rely only on a PID, terminal tail, or model memory.

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

Default posture: the controller should preserve its context for root goal, DAG, decisions, risks, integration, acceptance, and human-facing synthesis. Delegate context-heavy execution whenever practical, not only implementation.

Delegate or isolate work when it may produce large intermediate context, including:

- browser automation, UI exploration, screenshots, DOM/A2UI trees, and multi-step login/session recovery;
- broad research, search result triage, document/PDF sweeps, or source-code archaeology;
- long test runs, CI/log analysis, flaky-test investigation, benchmark output, or generated diffs;
- event streams, transcripts, telemetry, database dumps, and large command outputs.

Worker reports should be compact by default: outcome, changed artifacts, evidence index, validation result, risks, and the smallest excerpts needed for acceptance. Raw logs, screenshots, traces, generated outputs, and search corpora should stay in files/artifacts unless the controller needs them for ambiguity, dispute, debugging, safety review, or acceptance failure.

The controller may still perform small inspections, focused edits, and lightweight validation directly when that is cheaper than delegation. If a Worker or browser session is likely to compact before finishing, split the task or require a durable checkpoint artifact before continuing.

### Context-aware work packaging

Before assigning a Worker package, estimate whether it can complete within one context window. If not, split the package by artifact boundary, dependency boundary, or validation boundary. Avoid assigning work that is likely to compact mid-task unless the Worker has a durable state handoff.

A good Worker packet includes only the context needed to complete the local goal: root-goal summary, parent linkage, acceptance criteria, constraints, relevant files/areas, evidence required, stop conditions, and context budget. Do not dump the controller's full history into Workers by default.


## Optional coordination watchdog

`apcp-watch` is a conservative support tool for heartbeat/reconciliation checks. It reads only the active-run pointer and referenced APCP state, verifies recoverability fields, and checks whether expected report/evidence artifact paths exist. It never executes Worker commands, never reads secret/env-like files, never accepts work, and never mutates project state unless the controller explicitly passes a safe `--write-report` path for a compact markdown reconciliation report.

Use it as advisory input, not authority:

```bash
node .agents/skills/apcp/bin/apcp-watch.js --root .
node .agents/skills/apcp/bin/apcp-watch.js --pointer .apcp/current-run.md --format json
```

Statuses are `closed`, `no-pointer`, `active`, `blocked`, `infrastructure-blocked`, `needs-retry`, `ready-for-controller-review`, and `review-recorded-needs-continuation` when state shows a rejected/needs-revision current node without continuation. The controller still owns review, acceptance, and state updates.

## v0.3 checker/tooling

APCP v0.3 adds a local checker for common control drift. When a project has an APCP state file and the tool is available, run it before major handoff, compaction, or closeout:

```bash
node .agents/skills/apcp/bin/apcp-check.js --state .apcp/state.md --continuation
node .agents/skills/apcp/bin/apcp-check.js --root . --format json
```

The checker validates required state headings, accepted work without evidence, rejected/needs-revision rows without evidence or continuation, stale active work/checkpoints, open cleanup drift, and can emit a compact continuation summary. Treat checker errors as blockers for closeout unless a controller records a justified exception.

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
- `v0.3.2`: prior stable practice: clarifies default context window budget as 200000 tokens and keeps it user/runtime-overridable.
- `v0.3.3`: prior stable practice: adds active-run pointers and heartbeat reconciliation rules so controllers do not infer active work from stale APCP artifacts.
- `v0.3.4`: prior stable practice: strengthens native executor / command Worker recoverability, durable completion artifacts, and heartbeat reconciliation after transient process state loss.
- `v0.3.5`: current stable practice: requires Post-Worker Integration Loop continuation after rejected/needs-revision reviews and teaches checker/watchdog to surface review-recorded-but-uncontinued states.

## References

Read only when needed:

- `references/templates.md` — delegation, checkpoint, integration, change, closure templates.
- `references/state-schema.md` — canonical `.apcp/state.md` schema.
- `bin/apcp-check.js` — v0.3 lightweight APCP checker/tooling.
