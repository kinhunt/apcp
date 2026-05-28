# APCP State Schema

Use this for `.apcp/state.md` or `.apcp/APCP_STATE.md`.

APCP v0.4.0 keeps the v0.2 state profiles, adds lightweight checker/tooling, expects root-goal, context-budget metadata, active-run pointers, and requires explicit continuation after Worker rejection or revision decisions. The checker expects these headings to remain recognizable and tolerates extra project-specific sections.

APCP supports two profiles:

1. **Compact spike profile** — for short local spikes, feasibility checks, focused validations, and single-controller tasks.
2. **Full project profile** — for long-running, multi-agent, multi-phase, risky, or user-facing delivery work.

## Compact spike profile

Use this when the task is bounded and likely to close in one controller session or one Worker run.

```markdown
# APCP State — <project/task>

## Baseline
- rootGoal:
- rootGoalStatus: proposed | locked | changed
- rootGoalConfirmation:
- contextWindowTokens: 200000
- controllerContextPolicy:
- workerContextPolicy:
- activeRunPointer: `.apcp/current-run.md` | none
- goal:
- successCriteria:
- nonGoals:
- constraints:
- approvedBy:
- approvedAt:

## Workspace Baseline
- repos:
- dirtyState:
- protectedAreas:
- secretsPolicy:
- generatedArtifactsPolicy:
- changedFiles:
- artifactDelta:

## Task Graph
| ID | Node | Status | Depends on | Owner/Worker | Context fit | Acceptance | Evidence |

## Integration Loop
| Reviewed node | Decision | Evidence | Root-goal fit | DAG delta | Dependency delta | Continuation decision | Next node/owner/trigger | Pointer update |

## Validation Matrix
| Command/check | Purpose | Result | Evidence | Notes |

## Evidence Ledger
| Claim | Evidence | Status |

## Decisions / Blockers
| ID | Type | Description | Decision/Needed action | Status |

## Artifact Hygiene
| Item | Keep/Delete | Reason | Status |

## Closeout
- finalStatus:
- acceptedDeliverables:
- changedFiles:
- artifactDelta:
- remainingRisks:
- nextStep:
```

## Full project profile

Use this for substantial project work.

```markdown
# APCP State — <project>

## Baseline
- rootGoal:
- rootGoalStatus: proposed | locked | changed
- rootGoalConfirmation:
- contextWindowTokens: 200000
- controllerContextPolicy:
- workerContextPolicy:
- activeRunPointer: `.apcp/current-run.md` | <workspace pointer path> | none
- northStar:
- approvedObjective:
- successCriteria:
- nonGoals:
- constraints:
- approvedBy:
- approvedAt:

## Workspace Baseline
- repos:
- branchesCommits:
- dirtyState:
- protectedAreas:
- secretsPolicy:
- generatedArtifactsPolicy:

## Current Objective

## Task Graph
| ID | Node | Status | Depends on | Owner/Worker | Context fit | Acceptance | Evidence |

## Dependency Graph
| Source | Target | Type | Status | Reason |

## Integration Loop
| Reviewed node | Decision | Evidence | Root-goal fit | DAG delta | Dependency delta | Continuation decision | Next node/owner/trigger | Pointer update |

## Active Work
| ID | Node | Owner/Worker | Status | Context budget | Conflict locks | Expected output | Checkpoint |

## Validation Matrix
| Command/check | Purpose | Result | Evidence path | Notes |

## Decision Log
| ID | Decision | Reason | Owner | Impact | Revisit condition |

## Evidence Ledger
| ID | Claim | Evidence | Status | Linked nodes |

## Risks
| ID | Description | Probability | Impact | Trigger | Mitigation | Owner | Status |

## Issues / Blockers
| ID | Description | Affected nodes | Severity | Needed action | Owner | Status |

## Change Requests
| ID | Trigger | Impact | Class | Decision | Status |

## Artifact Hygiene / Cleanup
| Item | Location/resource | Owner | Keep/Delete | Reason | Status | Evidence |

## Next Checkpoint
```

## Status values

Recommended node statuses:

```text
proposed | ready | active | blocked | infrastructure_blocked | needs-review | needs-revision | accepted | rejected | deferred | done
```

Recommended dependency types:

```text
blocks | informs | conflicts | validates | optional | exports | imports | cleanup
```

Recommended validation results:

```text
passed | failed | skipped | not-run | infrastructure_blocked | warning-only
```

## v0.3 checker expectations

Run before major handoff, compaction, or closeout when the checker is available:

```bash
node .agents/skills/apcp/bin/apcp-check.js --state .apcp/state.md --continuation
```

The checker treats these as profile-critical signals:

- required headings: `Baseline`, `Workspace Baseline`, `Task Graph`, `Validation Matrix`, `Evidence Ledger`, `Artifact Hygiene`/`Artifact Hygiene / Cleanup`, and `Closeout` or `Next Checkpoint`;
- substantial/full states must include `rootGoal`, `rootGoalStatus`, `rootGoalConfirmation`, `contextWindowTokens`, `controllerContextPolicy`, and `workerContextPolicy` in `Baseline` or `Root Goal`; compact states may receive warnings when ambiguity is tolerable;
- accepted/done task rows should cite concrete evidence;
- rejected/needs-revision task rows must cite evidence and reason, then point to an active/ready retry/replacement/revision/next node, linked blocker/deferred rationale, or closeout exception;
- non-closed states must not end immediately after a review decision without a continuation decision while the root goal remains unfinished;
- active/needs-review work should have dated or otherwise meaningful checkpoints;
- native executor / CLI / Codex / command Workers should record a process/session/run id or explicit missing-id rationale, expected durable artifacts/report/evidence, review trigger, and stale/timeout policy;
- `apcp-watch` may be used as optional advisory reconciliation: it reads `.apcp/current-run.md` or `--pointer`, reads the referenced state when present, verifies pointer recoverability fields, checks expected report/evidence path existence relative to `projectRoot`, and may classify ready artifacts as `ready-for-controller-review` or rejected/needs-revision current nodes without continuation as `review-recorded-needs-continuation`; it never executes Worker commands or accepts work;
- when `--root` is used and `.apcp/current-run.md` exists, the pointer must expose recoverable handoff fields; active pointers require active Worker fields while closed pointers only require closeout-safe fields;
- closed/final/accepted closeouts must not leave validation rows pending/not-run or cleanup rows open unless notes explicitly defer, skip, justify, or approve the remainder;
- continuation summaries should surface active/blocked work, validation gaps, risks/issues/changes, cleanup signals, and next checkpoint.

## Root goal and context rules

For substantial work, always record:

- a one-sentence `rootGoal`;
- `rootGoalStatus` (`proposed`, `locked`, or `changed`);
- `rootGoalConfirmation` (user confirmation or rationale when unambiguous);
- `contextWindowTokens`, defaulting to `200000` unless the user/runtime specifies otherwise;
- `controllerContextPolicy`, normally reserving controller context for goal/DAG/acceptance;
- `workerContextPolicy`, normally sizing delegated packages to finish within one Worker context window.

Use **Worker** as the generic role in state. Record concrete Worker type when useful, e.g. `sub-agent`, `native-codex-cli`, `script`, `human-review`, or `browser-tool`.

## Active-run pointer schema

Use `.apcp/current-run.md` when work may continue across turns, Workers, heartbeats, or multiple projects. In a workspace containing several projects or APCP histories, also create a workspace-level pointer that points to the active project pointer/state.

Recommended fields:

```markdown
# Current APCP Run
- status: active | blocked | needs-review | closed
- project:
- projectRoot:
- state:
- projectHandoff:
- rootGoal:
- currentNode:
- workerLabel:
- workerSessionKey:
- workerRunId:
- expectedReport:
- expectedEvidence:
- safetyConstraints:
- heartbeatInstructions:
- closeoutRule:
```

Pointer rules:

- Watchdog statuses are advisory: `closed`, `no-pointer`, `active`, `blocked`, `infrastructure-blocked`, `needs-retry`, `ready-for-controller-review`, and `review-recorded-needs-continuation`; only the controller can accept or close work.
- Relative `projectRoot: .` means the directory containing the pointer's `.apcp`; other relative roots should be written relative to the command working directory or as absolute paths. The watchdog falls back to the pointer project directory when a relative value already names that suffix.

- A heartbeat follows the pointer; it does not scan arbitrary `.apcp` trees to infer current work.
- Update the pointer when launching/replacing Workers, changing the active node, blocking, accepting, or closing work.
- Mark `status: closed` or remove the pointer after closeout.
- Required pointer fields for any retained pointer: `Status`, `Project`, `Project root`, `State path`, `Root goal`, and `Closeout rule`.
- Required active/blocked/needs-review fields: `Current graph node`, `Worker label/session/run id`, `Expected report/evidence`, and `Heartbeat instructions`.
- Closed pointers do not need active Worker/session fields, but they must still identify the project, state, root goal, and closeout rule/outcome.
- Native executor pointers must also name a process/session/run id or missing-id rationale, durable artifacts/report/evidence, review trigger, and stale/timeout policy.

## Workspace baseline rules

Always record:

- repo roots involved;
- pre-existing dirty files or untracked state;
- protected files/areas that must not be touched;
- explicit `secretsPolicy`; default is no secret reads/printing unless needed and approved;
- generated artifacts policy (`dist`, `node_modules`, logs, temp files);
- `changedFiles` for intentional source/control-plane edits;
- `artifactDelta` for generated, retained, deleted, or external artifacts/resources.

## Artifact hygiene examples

| Artifact | Default | Notes |
| --- | --- | --- |
| `node_modules` | keep if needed for validation, otherwise deletable | never treat as source evidence |
| `dist` | keep if runtime smoke consumes built output; otherwise deletable | record if regenerated |
| `.apcp/logs/*` | keep | evidence artifact |
| `.apcp/tmp/*` | delete or mark retained reason | avoid stale helpers |
| `.apcp/secrets/*` | keep local, never print | secret evidence can be existence/path only |
| external resources | delete unless deliberately retained | record cleanup evidence |

## Lifecycle / infrastructure examples

- Smoke endpoints pass but process does not exit naturally → validation `passed`, lifecycle issue `open` or `warning-only`.
- CLI/tool missing → `infrastructure_blocked`, not task failure.
- Network/rate limit/provider outage → retry once or use safe fallback, then `infrastructure_blocked`.
- Pre-existing dirty repo files → record under Workspace Baseline; do not mix with intentional changes.
