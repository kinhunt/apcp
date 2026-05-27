# APCP State — rejected with continuation fixture

## Baseline
- rootGoal: Demonstrate rejected Worker output can continue safely.
- rootGoalStatus: locked
- rootGoalConfirmation: Fixture-only confirmation.
- contextWindowTokens: 200000
- controllerContextPolicy: Preserve controller context for review.
- workerContextPolicy: Require compact reports and continuation.

## Workspace Baseline
- repos: fixture
- dirtyState: fixture-only
- protectedAreas: secrets
- secretsPolicy: no secret reads
- generatedArtifactsPolicy: keep logs

## Task Graph
| ID | Node | Status | Depends on | Owner/Worker | Context fit | Acceptance | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | Produce Worker result | rejected | none | Worker | fits | reason: acceptance gap remains | `.apcp/reports/rejected.md` |
| B | Retry Worker result | ready | A | Worker | fits | replacement satisfies acceptance | next retry node active after rejection 2026-05-27 |

## Dependency Graph
| Source | Target | Type | Status | Reason |
| --- | --- | --- | --- | --- |
| A | B | blocks | ready | Retry/replacement node continues after rejected review |

## Integration Loop
| Reviewed node | Decision | Evidence | Root-goal fit | DAG delta | Dependency delta | Continuation decision | Next node/owner/trigger | Pointer update |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | rejected | `.apcp/reports/rejected.md` | gap blocks root goal | added B | A blocks B | retry | B / Worker / rejection of A | currentNode B |

## Validation Matrix
| Command/check | Purpose | Result | Evidence path | Notes |
| --- | --- | --- | --- | --- |
| fixture | Fixture validation | passed | `.apcp/reports/rejected.md` | n/a |

## Evidence Ledger
| ID | Claim | Evidence | Status | Linked nodes |
| --- | --- | --- | --- | --- |
| E1 | Worker result was rejected for a concrete reason | `.apcp/reports/rejected.md` | rejected | A |

## Artifact Hygiene / Cleanup
| Item | Location/resource | Owner | Keep/Delete | Reason | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| report | `.apcp/reports/rejected.md` | checker | keep | evidence | accepted | path-only |

## Next Checkpoint
Activate B retry after A rejection.
