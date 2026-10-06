---
schema: lomo.ai_collab.v1
task: <task-id>
owner: <codex|claude|antigravity|human>
role: <think|build|verify>
status: active
claimed: <ISO timestamp with timezone>
lease_until: <claimed + 4 hours>
paths:
  - <repo-relative write path>
---

## Outcome sought

State the bounded behavior and acceptance checks. Preserve pre-existing changes.
