# APCP — Agentic Project Control Protocol

APCP is an Agent Skill for controlling substantial agentic work: project planning, task DAGs, state tracking, delegation, validation evidence, and closeout hygiene.

The package is intentionally small:

- `SKILL.md` — the protocol and operating instructions
- `bin/apcp-check.js` — lightweight APCP state checker
- `references/state-schema.md` — state artifact schema
- `references/templates.md` — controller/delegation/checkpoint templates

## Install as an Agent Skill

Copy this directory into an agent skills path, for example:

```bash
mkdir -p .agents/skills/apcp
cp -R SKILL.md bin references .agents/skills/apcp/
```

Then configure your agent runtime to load the `apcp` skill.

## Quick validation

```bash
node bin/apcp-check.js --state path/to/.apcp/state.md --continuation
node bin/apcp-check.js --root . --format json
```

## Core idea

APCP makes the main assistant the controller-supervisor. The controller owns the root goal, task graph, workspace baseline, validation matrix, evidence ledger, and closeout. Workers, tools, and coding agents are scheduled resources.

APCP now includes a **Root Goal Lock**: the top-level goal of the DAG should be clarified and locked before substantial work expands into lower-level tasks. Lower-level nodes can iterate; the root goal should only change with explicit user-facing confirmation.
