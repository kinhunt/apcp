---
name: apcp
description: "Use APCP (Agentic Project Control Protocol) for substantial project work: coding, research, product design, multi-step execution, multi-agent orchestration, long-running tasks, PayIn development, or when the user asks to use/evaluate/improve APCP."
---

# APCP — Agentic Project Control Protocol

Version: v0.4.1 stable.

APCP is a portable controller/worker protocol for keeping long-running work goal-directed, delegated, observable, evidence-backed, and recoverable.

## Core idea

APCP has two layers:

1. **Core protocol** — tool-agnostic: DAG goal management, Controller attention discipline, Worker delegation, durable state, evidence, review, and closeout.
2. **Runtime profile** — tool-specific: how a given agent environment should instantiate Controller/Workers, pointers, liveness checks, and recovery.

Current bundled runtime profile:

- **OpenClaw**: read `references/runtime-openclaw.md` when running in OpenClaw, spawning/steering OpenClaw subagents, handling OpenClaw heartbeat recovery, or managing OpenClaw `.apcp/current-run.md` pointers.

If no runtime profile fits, use the Core protocol and let the active main agent act as Controller.

## Core roles

- **Controller**: owns root goal, DAG, current state, Worker scheduling, evidence review, acceptance/rejection, blockers, and closeout.
- **Worker**: performs a bounded package: implementation, validation, research, source archaeology, or a human-gated decision.
- **User-facing operator**: may be the same as Controller or may launch/steer/audit a dedicated Controller, depending on runtime profile.

The invariant: Controller attention should stay on goals, DAG, dependencies, evidence, and decisions—not get buried in implementation details.

## Core loop

```text
Root goal → Baseline → DAG → Delegate → Review → Integrate → Continue/Block/Close
```

Mandatory Controller rules:

1. Lock one outcome-oriented root goal before expanding substantial work.
2. Show the DAG when planning or materially replanning.
3. Delegate substantial implementation/validation when the runtime supports it.
4. Keep durable state for meaningful work.
5. Accept Worker output only after checking evidence, validation, safety, and root-goal fit.
6. After every accept/reject/needs-revision decision, activate the next node, retry narrower, mark a blocker/human gate, or close.
7. Do not stop at `ready-for-worker-launch` when the user asked to continue and safe execution is possible.
8. Run the APCP checker before major handoff/closeout when state exists and the checker is available.

## Core state model

Use project-local APCP artifacts when work is meaningful:

- `.apcp/state-*.md` — root goal, DAG, validation matrix, evidence, decisions, closeout.
- `.apcp/current-run.md` — current node, status, Worker metadata, expected artifacts, review trigger, stale policy.

For multi-project workspaces or runtimes that need global recovery, also maintain a workspace-level `.apcp/current-run.md`.

A current-run pointer should include:

- status and current node;
- project root and state path;
- Controller/runtime profile when useful;
- Worker type and label/session/run/process id when available;
- expected report/log paths;
- review trigger;
- stale/timeout policy;
- safety constraints;
- closeout/continuation decision.

## Core Worker packet contract

APCP uses a small portable Worker taxonomy. The taxonomy is fixed enough for state/recovery to be machine-auditable, but each runtime may map these types to its own tools:

- `implementation` — edits product/source artifacts or creates deliverables.
- `validation` — runs tests, checks, audits, review, or evidence refresh.
- `research` — gathers information, inventories code/docs, compares references.
- `runtime-command` — long-running command, native executor, CI/job, or CLI client.
- `human-gate` — user/operator decision, approval, credential, external resource, or risk acceptance.

Concurrency is controlled by **conflict domain**, not by Worker type alone:

- Default: at most one active write-capable `implementation` Worker per repo/worktree/conflict domain.
- Read-only `research`/`validation` Workers may run in parallel when they do not mutate the same artifacts and their outputs have durable report paths.
- `runtime-command` Workers count against the conflict domain they affect; a test-only command can run beside read-only work, but not beside unsafe overlapping writes.
- `human-gate` can remain open while safe read-only work continues, but blocked decisions must not be bypassed.
- The Controller must record active Workers and conflict domains in state/current-run before launching parallel work.

Every delegated Worker gets:

- root-goal summary and local node goal;
- dependencies and why this node exists;
- acceptance criteria;
- non-goals and safety boundaries;
- files/areas to inspect or avoid;
- expected report path;
- expected validation log path;
- state/current-run files to update when applicable;
- required validation commands;
- stop/retry/blocker policy.

Chat-only summaries, raw grep dumps, and terminal tails are not completion evidence for implementation nodes. Require named report/log artifacts or equivalent durable evidence.

## Core liveness and recovery

When asked for status, answer from durable state plus one runtime/artifact check:

```text
APCP status:
- currentNode: ...
- status: running | ready-for-review | accepted | needs-retry | blocked | closed
- worker: <label/session/run id or none>
- last accepted: ...
- expected artifacts: report=..., log=...
- next trigger: ...
- next action: ...
```

Never claim a Worker is running from an old pointer alone. A running claim requires live runtime/process/session evidence or fresh expected artifact progress.

If a Worker disappears or completes without required artifacts:

1. Inspect expected report/log paths once.
2. If artifacts exist, review them.
3. If missing, mark `infrastructure_blocked` or `needs-retry` with the Worker id/label if known.
4. Retry only with a narrower bounded package or stop for a human gate.

## Core acceptance and closeout

Accept a node only when:

- criteria are satisfied;
- evidence is concrete and cited;
- validation is appropriate and passing, or a justified exception is recorded;
- safety/non-goals are preserved;
- downstream DAG dependencies are updated.

Close a run only with:

- accepted scope and evidence index;
- validation matrix summary;
- unresolved risks and human-gated residuals;
- cleanup/safety statement;
- final state/current-run status `closed` or equivalent.

## Safety defaults

- Do not read `.env*`, private keys, tokens, credential files, or credential stores.
- Do not deploy, push, create external resources, use real providers, production services, or mainnet without explicit approval.
- Do not copy/fork protected core internals; use approved seams/contracts or stop for a human gate.

## Tools and references

- OpenClaw runtime profile: `references/runtime-openclaw.md`
- State schema: `references/state-schema.md` — read when creating or repairing state files.
- Templates: `references/templates.md` — read when drafting delegation/checkpoint/closeout artifacts.
- Checker: `node .agents/skills/apcp/bin/apcp-check.js --state <state> --continuation`
- Watchdog: `node .agents/skills/apcp/bin/apcp-watch.js --pointer <current-run> --format json`
