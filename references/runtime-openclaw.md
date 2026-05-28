# APCP Runtime Profile — OpenClaw

Use this profile when APCP runs inside OpenClaw.

## Runtime shape

Default substantial-run architecture:

```text
User ↔ main assistant ↔ APCP Manager subagent ↔ bounded Workers
```

- **Main assistant**: user-facing operator. Clarifies root goal, starts/steers/audits APCP Manager, delivers concise updates to the user.
- **APCP Manager subagent**: dedicated Controller. Owns DAG, state, current-run pointers, Worker scheduling, evidence review, acceptance, retries, blockers, and closeout.
- **Workers**: OpenClaw subagents, native executor/Codex CLI runs, scripts, or humans.
- **Heartbeat**: recovery/reconciliation only. It is not the scheduler.

For small tasks, main may use minimal APCP inline. For substantial, long-running, multi-step, PayIn, or coding projects, prefer APCP Manager.

## Controller boundary

APCP Manager should directly edit only APCP/control artifacts unless the user explicitly overrides:

- project `.apcp/current-run.md`
- workspace `.apcp/current-run.md`
- `.apcp/state-*.md`
- `.apcp/reports/*.md`
- `.apcp/logs/*` when recording controller evidence
- explicit controller handoff/checklist docs

Implementation/product source changes should be delegated to Workers.

## Worker choices

- Use OpenClaw `sessions_spawn` / subagents for substantial research, review, validation, and controller-managed work.
- For coding implementation Workers, instruct them to use Codex CLI per workspace policy when applicable.
- Use the core Worker taxonomy in state/pointers: `implementation`, `validation`, `research`, `runtime-command`, `human-gate`.
- Keep one write-capable `implementation` Worker active per repo/worktree/conflict domain.
- Multiple read-only `research` or `validation` Workers may run in parallel when they have separate report/log artifacts and do not mutate shared files.
- Treat long Codex/CLI/background commands as `runtime-command` Workers unless they are clearly wrapped by a higher-level `implementation` or `validation` Worker.
- For each active Worker, record both its type and its OpenClaw identity: subagent label/session key, exec/process id, or human gate owner.
- Prefer narrower retry packages after worker loss or missing artifacts.

## Current-run pointers

For any run that may outlive the turn or needs heartbeat recovery, maintain both:

- project pointer: `<projectRoot>/.apcp/current-run.md`
- workspace pointer: `/data/openclaw/workspace/.apcp/current-run.md`

Pointers should agree with the state closeout and include:

- status;
- project root;
- state path;
- current node and node status;
- root goal and root-goal status;
- last accepted node;
- active Worker type/label/session/run/process id when available;
- conflict domain when more than one Worker may be active;
- expected report/log paths;
- review trigger;
- stale policy;
- safety constraints;
- updated timestamp.

If project pointer, workspace pointer, and state disagree, reconcile them before reporting progress.

## OpenClaw liveness checks

When the user asks “有 worker 在工作吗 / 进度如何 / 完成了吗”:

1. Read the active current-run pointer.
2. Do one runtime lookup when useful (`subagents list`, `sessions_list`, or `process poll`) using the recorded label/session/process id.
3. Inspect expected report/log artifacts if runtime state is missing or ambiguous.
4. Answer with the compact APCP status.

Never claim a Worker is running from an old pointer alone. Require live runtime evidence or fresh expected artifact progress.

## Worker loss policy

If an OpenClaw Worker disappears or returns without required artifacts:

1. Inspect expected report/log paths once.
2. If artifacts exist, review them as controller evidence.
3. If artifacts are missing, mark node `infrastructure_blocked` or `needs-retry` with exact Worker label/session/run id.
4. Retry only with a narrower package or stop for a human gate.
5. Send the user a concise update; do not leave liveness ambiguous.

## Heartbeat policy

Heartbeat should:

- follow current-run pointers, not scan arbitrary stale `.apcp` trees;
- not revive closed pointers unless the user asks;
- perform at most one runtime/artifact reconciliation pass per heartbeat;
- report only material events: accepted/rejected node, retry, blocker, human gate, next slice launch, or closeout;
- reply `NO_REPLY` when closed/no meaningful change.

## OpenClaw status response template

```text
APCP status:
- currentNode: ...
- status: ...
- worker: <label/session/run id or none>
- last accepted: ...
- expected artifacts: report=..., log=...
- next trigger: ...
- next action: ...
```

## OpenClaw safety additions

- Do not use `exec`/curl for provider messaging; use OpenClaw tools.
- Do not deploy, push, use production secrets, real providers, external resources, or mainnet unless the user explicitly approves.
