# APCP — Agentic Project Control Protocol

APCP is a portable controller/worker protocol for substantial agentic work: DAG goal management, Controller attention discipline, Worker delegation, durable state, evidence review, recovery, and closeout.

This repository is structured for MCP Skills / agent skill installation:

- `SKILL.md` — runtime-neutral core protocol and navigation.
- `references/runtime-openclaw.md` — OpenClaw runtime profile.
- `references/state-schema.md` — APCP state artifact schema.
- `references/templates.md` — Worker, checkpoint, integration, and closeout templates.
- `bin/apcp-check.js` — lightweight state checker.
- `bin/apcp-watch.js` — conservative recovery/watchdog helper.

## Runtime profiles

APCP separates the core protocol from runtime-specific behavior.

- Core protocol: use a DAG to manage goals and keep the Controller focused on goal/state/evidence decisions.
- Runtime profiles: adapt Controller/Worker mechanics to different agent tools.

Currently bundled profile: `openclaw`.

## Quick validation

```bash
node bin/apcp-check.js --help
node bin/apcp-watch.js --help
```
