# APCP Templates

## Plan checkpoint

```text
Root goal:
Root goal status: proposed | locked | changed
Context window tokens: 200000 | <override>
Controller context policy:
Worker context policy:
Active-run pointer:
Acceptance:
Non-goals:
Task graph:
DAG delta:
Dependency delta:
Continuation decision: continue | retry | revise | replace | block | defer | closeout-exception
Next node / owner / trigger:
Pointer update:
- A. ... [status] depends on ...
Critical path:
Parallelizable:
Current next action:
Human gates:
```

## Compact spike checkpoint

```text
Root goal:
Root goal status:
Context window tokens:
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
Root goal status:
Parent linkage:
Local goal:
Acceptance criteria:
Constraints / non-goals:
Relevant files/areas:
Worker type / invocation mode:
Process/session/run id or missing-id rationale:
Expected durable artifacts/report/evidence:
Review trigger:
Stale/timeout policy:
Context budget / expected fit:
Active-run pointer / state path:
Workspace baseline / protected areas:
Secrets policy:
Dependencies / blockers:
Evidence required:
Expected output:
Report size / format:
Changed files / artifact delta:
Stop conditions:
Infrastructure retry policy:
```


## Active-run pointer

```text
Status: active | blocked | needs-review | closed
Project:
Project root:
State path:
Project handoff path:
Root goal:
Current graph node:
Worker label/session/run id:
Worker type / invocation mode:
Process/session/run id or missing-id rationale:
Expected report/evidence:
Review trigger:
Stale/timeout policy:
Safety constraints:
Heartbeat instructions:
Closeout rule:
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
Worker type / invocation mode:
Context budget respected? yes/no/unknown
Acceptance criteria met? yes/no/partial
Evidence sufficient? yes/no/partial
Validation reviewed:
Root-goal fit:
Workspace/artifact hygiene:
Risks/issues/changes:
DAG delta:
Dependency delta:
Decision: accepted | rejected | needs-revision | partially-accepted
Continuation decision: next-node | retry | replacement | revision | blocker | deferred | closeout-exception
Next node / owner / trigger:
Pointer update:
Revision instructions if needed:
```

## Worker rejection packet

```text
Rejected node / Worker:
Decision: rejected | needs-revision
Evidence reviewed:
Reason / acceptance gap:
Root-goal fit:
DAG delta:
Dependency delta:
Continuation decision: retry | replacement | revision | blocker | deferred | closeout-exception
Next node / owner / trigger:
Pointer update:
Worker-facing revision/retry instructions:
Controller blocker/deferred rationale if no next node:
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
Root goal / baseline:
Context budget status:
Completed since last checkpoint:
Active work:
Blocked / waiting:
Decisions made:
DAG delta:
Dependency delta:
Continuation decision:
Next node / owner / trigger:
Pointer update:
Change requests:
Evidence status:
Validation status:
Risk / issue highlights:
Artifact hygiene / cleanup:
Variance signals:
Next actions:
Human asks:
```

## APCP watchdog reconciliation

```text
Command:
Pointer/root:
Status: closed | no-pointer | active | blocked | infrastructure-blocked | needs-retry | ready-for-controller-review
Expected artifacts:
Findings:
Controller decision: review | retry | wait | mark blocked | close
Notes: Watchdog is advisory only; controller remains authority.
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
Root goal:
Root goal status:
Context budget outcome:
Final status:
Accepted deliverables:
Changed files:
Artifact delta:
Evidence:
Validation matrix:
Cleanup status:
Deferred/skipped/justified validation or cleanup rows:
Unresolved risks/gaps:
Deferred work:
Retrospective notes:
Recommended next step:
```
