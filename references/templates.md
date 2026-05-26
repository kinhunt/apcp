# APCP Templates

## Plan checkpoint

```text
Goal:
Acceptance:
Non-goals:
Task graph:
- A. ... [status] depends on ...
Critical path:
Parallelizable:
Current next action:
Human gates:
```

## Compact spike checkpoint

```text
Goal:
Why this spike exists:
Success criteria:
Non-goals / forbidden moves:
Workspace baseline:
- repos:
- dirty state:
- protected areas:
- secrets policy:
- changed files:
- artifact delta:
Task graph:
Validation matrix:
- command/check → expected evidence:
Close condition:
```

## Delegation packet

```text
Root goal:
Parent linkage:
Local goal:
Acceptance criteria:
Constraints / non-goals:
Relevant files/areas:
Workspace baseline / protected areas:
Secrets policy:
Dependencies / blockers:
Evidence required:
Expected output:
Changed files / artifact delta:
Stop conditions:
Infrastructure retry policy:
```

## Upward report

```text
Local goal:
Result:
Evidence:
Validation matrix:
Changed files:
Artifact delta:
Changed assumptions:
Dependencies unblocked:
Risks/issues introduced:
Fit check:
Recommended next action:
```

## Integration review

```text
Worker/output:
Acceptance criteria met? yes/no/partial
Evidence sufficient? yes/no/partial
Validation reviewed:
Root-goal fit:
Workspace/artifact hygiene:
Risks/issues/changes:
Dependency updates:
Decision: accepted | rejected | needs-revision | partially-accepted
Revision instructions if needed:
```

## Change request

```text
Trigger:
Current baseline impact:
Options:
Recommendation:
Approval required: log-only | controller-approved | human-required
State updates required:
```

## Status checkpoint

```text
Objective / baseline:
Completed since last checkpoint:
Active work:
Blocked / waiting:
Decisions made:
Change requests:
Evidence status:
Validation status:
Risk / issue highlights:
Artifact hygiene / cleanup:
Variance signals:
Next actions:
Human asks:
```

## v0.3 checker checkpoint

```text
Command:
State file:
Result:
Findings summary:
Continuation summary location/output:
Controller decision:
Exceptions recorded:
```

## Validation report

```text
Scope:
Changed files/resources:
Artifact delta:
Validation matrix:
| Command/check | Purpose | Result | Evidence | Notes |
Claims accepted:
Warnings / non-blockers:
Blockers:
Artifact hygiene:
Next step:
```

## Closure report

```text
Goal:
Final status:
Accepted deliverables:
Changed files:
Artifact delta:
Evidence:
Validation matrix:
Cleanup status:
Unresolved risks/gaps:
Deferred work:
Retrospective notes:
Recommended next step:
```
