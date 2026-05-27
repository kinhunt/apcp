# APCP State — checker valid full fixture

## Baseline
- rootGoal: Harden APCP checker validation without touching unrelated files.
- rootGoalStatus: locked
- rootGoalConfirmation: Fixture asserts an unambiguous test root goal.
- contextWindowTokens: 200000
- controllerContextPolicy: Preserve controller context for goal, DAG, review, and closeout decisions.
- workerContextPolicy: Require compact reports and durable evidence artifacts.
- activeRunPointer: `.apcp/current-run.md`
- northStar: Checker catches control drift before handoff.
- approvedObjective: Validate v0.3.4 hardening rules.
- successCriteria: Clean checker result.
- nonGoals: No external side effects.
- constraints: Fixture-only data.
- approvedBy: fixture
- approvedAt: 2026-05-26

## Workspace Baseline
- repos: fixture
- branchesCommits: n/a
- dirtyState: fixture-only
- protectedAreas: secrets
- secretsPolicy: no secret reads
- generatedArtifactsPolicy: keep `.apcp/logs` as evidence

## Current Objective
Validate a recoverable native executor handoff.

## Task Graph
| ID | Node | Status | Depends on | Owner/Worker | Context fit | Acceptance | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | Run checker fixture | active | none | Codex CLI native-executor run id: codex-fixture-001; report/evidence expected; review trigger: controller acceptance; timeout policy: 30m | fits | clean result | checkpoint 2026-05-26 |

## Dependency Graph
| Source | Target | Type | Status | Reason |
| --- | --- | --- | --- | --- |
| A | closeout | validates | active | Fixture smoke validation |

## Active Work
| ID | Node | Owner/Worker | Status | Context budget | Conflict locks | Expected output | Checkpoint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | Run checker fixture | Codex CLI native-executor run id: codex-fixture-001 | active | 200000 | none | report/evidence path and review trigger; timeout policy 30m | 2026-05-26 heartbeat ok |

## Validation Matrix
| Command/check | Purpose | Result | Evidence path | Notes |
| --- | --- | --- | --- | --- |
| `node bin/apcp-check.js --root test/fixtures/valid-full` | Fixture validation | passed | `.apcp/logs/valid-full.log` | current fixture expectation |

## Decision Log
| ID | Decision | Reason | Owner | Impact | Revisit condition |
| --- | --- | --- | --- | --- | --- |
| D1 | Use native executor fixture | Exercises pointer checks | checker | test coverage | rule changes |

## Evidence Ledger
| ID | Claim | Evidence | Status | Linked nodes |
| --- | --- | --- | --- | --- |
| E1 | Fixture includes durable evidence expectations | `.apcp/current-run.md` | active | A |

## Risks
| ID | Description | Probability | Impact | Trigger | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Fixture drift | low | low | schema change | update fixture | checker | active |

## Issues / Blockers
| ID | Description | Affected nodes | Severity | Needed action | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | none | none | low | none | checker | accepted |

## Change Requests
| ID | Trigger | Impact | Class | Decision | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | fixture setup | low | controller | accepted | accepted |

## Artifact Hygiene / Cleanup
| Item | Location/resource | Owner | Keep/Delete | Reason | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| fixture logs | `.apcp/logs` | checker | keep | evidence | accepted | path-only |

## Next Checkpoint
Run focused checker validation after edits.
