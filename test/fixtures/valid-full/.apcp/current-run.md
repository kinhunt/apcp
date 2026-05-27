Status: active
Project: APCP checker valid fixture
Project root: .agents/skills/apcp/test/fixtures/valid-full
State path: .apcp/state.md
Project handoff path: .apcp/current-run.md
Root goal: Harden APCP checker validation without touching unrelated files.
Current graph node: A
Worker label/session/run id: codex-fixture-001
Worker type / invocation mode: Codex CLI native-executor
Process/session/run id or missing-id rationale: run id codex-fixture-001
Expected report/evidence: `.apcp/logs/valid-full.log`
Review trigger: controller reviews fixture checker output
Stale/timeout policy: timeout after 30m or stale heartbeat beyond 7d
Safety constraints: fixture-only data, no secrets
Heartbeat instructions: update checkpoint dated 2026-05-26
Closeout rule: mark closed after focused validation passes
