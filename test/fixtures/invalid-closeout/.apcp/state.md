# APCP State — checker invalid closeout fixture

## Baseline
- rootGoal: Demonstrate closeout hygiene failures.
- rootGoalStatus: locked
- rootGoalConfirmation: Fixture-only confirmation.
- contextWindowTokens: 200000
- controllerContextPolicy: Keep context for review.
- workerContextPolicy: Require evidence reports.

## Workspace Baseline
- repos: fixture
- dirtyState: fixture-only
- protectedAreas: secrets
- secretsPolicy: no secret reads
- generatedArtifactsPolicy: keep logs

## Task Graph
| ID | Node | Status | Depends on | Owner/Worker | Context fit | Acceptance | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | Finish work | accepted | none | controller | fits | accepted | `.apcp/logs/work.log` |

## Validation Matrix
| Command/check | Purpose | Result | Evidence path | Notes |
| --- | --- | --- | --- | --- |
| `fixture-check` | Should be done before closeout | not-run | n/a | no justification |

## Evidence Ledger
| Claim | Evidence | Status |
| --- | --- | --- |
| Work exists | `.apcp/logs/work.log` | accepted |

## Artifact Hygiene
| Item | Keep/Delete | Reason | Status |
| --- | --- | --- | --- |
| temp fixture | delete | should be cleaned | open |

## Closeout
- finalStatus: accepted
- acceptedDeliverables: fixture
- changedFiles: fixture
- artifactDelta: fixture
- remainingRisks: none
- nextStep: none
