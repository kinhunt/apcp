# APCP State Schema

Use this for `.apcp/state.md` or `.apcp/APCP_STATE.md`.

APCP v0.3.2 keeps the v0.2 state profiles, adds lightweight checker/tooling, and expects root-goal plus context-budget metadata for substantial work. The checker expects these headings to remain recognizable and tolerates extra project-specific sections.

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
- accepted/done task rows should cite concrete evidence;
- active/needs-review work should have dated or otherwise meaningful checkpoints;
- cleanup rows should have a clear Keep/Delete disposition and non-open status by closeout;
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
