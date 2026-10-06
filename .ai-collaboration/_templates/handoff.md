---
schema: lomo.ai_collab.v1
id: <h-NNNN>
task: <task-id>
from: <actor>
from_role: <role>
to: <receiver>
to_role: <role>
status: requested
outcome: null
created: <ISO timestamp with timezone>
ttl: 24h
base_sha: <commit>
head_sha: null # design only; verification requires a commit
scope:
  - <repo-relative path>
ack:
  actor: null
  at: null
  decision: null
  reason: null
---

## Intent and acceptance

Name the behavior, boundaries and done checks.

## Evidence and next action

Exact commands, exit codes, SHA, risks and dispatch status. Add investigation
pointers or incomplete-work details here when useful; no mandatory metrics.
