# APCP State — rejected no continuation fixture

## Baseline
- rootGoal: Demonstrate rejected Worker output requires continuation.
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
Review was recorded, but no continuation was created.
