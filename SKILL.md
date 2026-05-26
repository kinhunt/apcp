---
name: apcp
description: "Use APCP (Agentic Project Control Protocol) for substantial project work: coding, research, product design, multi-step execution, multi-agent orchestration, long-running tasks, PayIn development, or when the user asks to use/evaluate/improve APCP."
---

# APCP — Agentic Project Control Protocol

Version: v0.3 stable. Current stable APCP practice is this skill plus its templates, state schema, and lightweight checker/tooling.

APCP makes the main agent the project controller. Sub-agents, Codex, tools, and humans are scheduled resources. The controller owns goal, baseline, dependency graph, state, evidence, integration, change control, and user-facing synthesis.

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
5. Delegate substantial coding to Codex by default when available; delegate bounded research/review to sub-agents when useful.
6. Do not accept worker output without evidence and fit check.
7. Distinguish task blockers from infrastructure blockers.
8. Update state after accepted work, material plan changes, major decisions, new risks, and cleanup.
9. Close with evidence, unresolved risks, deferred work, cleanup status, and next recommended step.


## Profile selection

Use **compact spike profile** for short local spikes, feasibility checks, focused validations, or single-controller tasks. Keep the state/report small: Baseline, Workspace Baseline, Task Graph, Validation Matrix, Evidence, Decisions/Blockers, Artifact Hygiene, Closeout. Compact Workspace Baseline must explicitly include `secretsPolicy`, `changedFiles`, and `artifactDelta` when edits or artifacts are possible.

Use **full project profile** for multi-agent, long-running, high-risk, external-resource, or product-delivery work.

Always include a **Workspace Baseline** before editing repos: repo roots, dirty state, protected areas, generated artifact policy, and secret policy.

Always include a **Validation Matrix** when commands/checks matter: command/check, purpose, result, evidence path, notes.

For substantial work, APCP state should include a root-goal field such as:

```markdown
- rootGoal: <one short outcome-oriented sentence>
- rootGoalStatus: proposed | locked | changed
- rootGoalConfirmation: <user message, timestamp, or controller rationale if unambiguous>
```

If `rootGoalStatus` changes from `locked` to `changed`, record the user-facing rationale and confirmation before proceeding.

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
- owner;
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
- `v0.3`: current stable practice: v0.2 compatibility plus lightweight checker/tooling for required headings, stale work, missing evidence, cleanup drift, and continuation summaries.

## References

Read only when needed:

- `references/templates.md` — delegation, checkpoint, integration, change, closure templates.
- `references/state-schema.md` — canonical `.apcp/state.md` schema.
- `bin/apcp-check.js` — v0.3 lightweight APCP checker/tooling.
