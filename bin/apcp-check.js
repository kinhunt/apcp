#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = '0.3.5';
const PLACEHOLDER_RE = /^(|[-—]|tbd|todo|none|null|n\/a|na|not-run|not run|missing|unknown)$/i;
const DONE_RE = /\b(accepted|done|passed|complete|completed)\b/i;
const REVIEW_REJECTED_RE = /\b(rejected|needs[- ]revision)\b/i;
const CONTINUATION_STATUS_RE = /\b(active|ready|blocked|infrastructure[-_ ]blocked|deferred|needs[- ]review)\b/i;
const REVIEWED_STATUS_RE = /\b(accepted|done|passed|complete|completed|rejected|needs[- ]revision)\b/i;
const CONTINUATION_RE = /\b(next|retry|retries|replacement|replace|revision|revise|active|ready|blocked|blocker|deferred|defer|follow[- ]?up|continuation|pointer|current node|closeout exception)\b/i;
const REASON_RE = /\b(reason|because|gap|failed|missing|mismatch|insufficient|blocked|deferred|acceptance|rationale|exception)\b/i;
const ACTIVE_RE = /\b(active|needs-review|needs revision|needs-revision|ready)\b/i;
const OPEN_CLEANUP_RE = /^(|[-—]|tbd|todo|open|active|pending|not-run|not run|unknown)$/i;
const CLOSED_RE = /\b(closed|final|accepted|complete|completed|done)\b/i;
const VALIDATION_OPEN_RE = /\b(pending|not-run|not run)\b/i;
const DEFERRED_RE = /\b(deferred|skipped|skip|justified|exception|waived|approved|remaining|not applicable|n\/a)\b/i;
const NATIVE_EXECUTOR_RE = /\b(native[- ]executor|command|coding[- ]agent[- ]client|codex|exec|process|cli)\b/i;
const PROCESS_ID_RE = /\b(process|proc|pid|session|run|job|execution|deployment|terminal|tty)\s*(id|label|name|#|:)?\s*[:=#-]?\s*[A-Za-z0-9_.:/-]{3,}\b/i;
const RATIONALE_RE = /\b(no\s+(process|session|run)\s+id|missing\s+(process|session|run)\s+(id\s+)?rationale|not available because|unavailable because|rationale)\b/i;
const ARTIFACT_RE = /\b(artifact|report|evidence|log|diff|patch|screenshot|trace|output)\b/i;
const REVIEW_RE = /\b(review|acceptance|needs-review|trigger|handoff|controller)\b/i;
const STALE_POLICY_RE = /\b(stale|timeout|heartbeat|max-stale|retry|expire|deadline|kill|poll)\b/i;
const DATE_RE = /\b(20\d{2}-\d{2}-\d{2})(?:[ T][0-2]\d:[0-5]\d(?::[0-5]\d)?)?\b/g;
const ROOT_METADATA_FIELDS = ['rootGoal', 'rootGoalStatus', 'rootGoalConfirmation', 'contextWindowTokens', 'controllerContextPolicy', 'workerContextPolicy'];

function usage() {
  return `APCP checker v${VERSION}\n\nUsage:\n  node .agents/skills/apcp/bin/apcp-check.js --state <path> [--format text|json] [--max-stale-days N] [--continuation]\n  node .agents/skills/apcp/bin/apcp-check.js --root <dir> [--format text|json] [--max-stale-days N] [--continuation]\n\nExit codes:\n  0 no error findings\n  1 one or more error findings\n  2 usage or infrastructure error\n`;
}

function parseArgs(argv) {
  const args = { format: 'text', maxStaleDays: 7, continuation: false, root: null, state: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--version' || arg === '-v') args.version = true;
    else if (arg === '--continuation') args.continuation = true;
    else if (arg === '--format') args.format = takeValue(argv, ++i, '--format');
    else if (arg.startsWith('--format=')) args.format = arg.slice('--format='.length);
    else if (arg === '--max-stale-days') args.maxStaleDays = Number(takeValue(argv, ++i, '--max-stale-days'));
    else if (arg.startsWith('--max-stale-days=')) args.maxStaleDays = Number(arg.slice('--max-stale-days='.length));
    else if (arg === '--state') args.state = takeValue(argv, ++i, '--state');
    else if (arg.startsWith('--state=')) args.state = arg.slice('--state='.length);
    else if (arg === '--root') args.root = takeValue(argv, ++i, '--root');
    else if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length);
    else throw new UsageError(`Unknown argument: ${arg}`);
  }
  if (!['text', 'human', 'json'].includes(args.format)) throw new UsageError(`Unsupported --format: ${args.format}`);
  if (args.format === 'human') args.format = 'text';
  if (!Number.isFinite(args.maxStaleDays) || args.maxStaleDays < 0) throw new UsageError('--max-stale-days must be a non-negative number');
  return args;
}

function takeValue(argv, index, flag) {
  if (index >= argv.length || argv[index].startsWith('--')) throw new UsageError(`${flag} requires a value`);
  return argv[index];
}

class UsageError extends Error {}

function findStatePath(args) {
  if (args.state) return path.resolve(args.state);
  const root = path.resolve(args.root || process.cwd());
  const candidates = [
    path.join(root, '.apcp', 'state.md'),
    path.join(root, '.apcp', 'APCP_STATE.md'),
    path.join(root, 'apcp', 'state.md'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new UsageError(`No APCP state file found. Tried: ${candidates.join(', ')}`);
  return found;
}

function normalizeHeading(text) {
  return text.toLowerCase().replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { title: '(preamble)', normalized: '(preamble)', level: 0, startLine: 1, lines: [] };
  sections.push(current);
  lines.forEach((line, idx) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      current = { title: match[2].trim(), normalized: normalizeHeading(match[2]), level: match[1].length, startLine: idx + 1, lines: [] };
      sections.push(current);
    } else {
      current.lines.push({ text: line, line: idx + 1 });
    }
  });
  return { lines, sections };
}

function sectionMatches(section, names) {
  return names.some((name) => section.normalized === normalizeHeading(name) || section.normalized.includes(normalizeHeading(name)));
}

function findSection(parsed, names) {
  const normalizedNames = names.map((name) => normalizeHeading(name));
  return parsed.sections.find((section) => normalizedNames.includes(section.normalized))
    || parsed.sections.find((section) => sectionMatches(section, names));
}

function add(findings, severity, rule, message, extra = {}) {
  findings.push({ severity, rule, message, ...extra });
}

function getSectionText(section) {
  return section ? section.lines.map((line) => line.text).join('\n') : '';
}

function canonicalKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseMetadata(section) {
  const meta = {};
  if (!section) return meta;
  for (const item of section.lines) {
    const match = /^\s*(?:[-*]\s*)?`?([^:`|]+?)`?\s*:\s*(.*?)\s*$/.exec(item.text);
    if (!match) continue;
    meta[canonicalKey(match[1])] = { key: match[1].trim(), value: match[2].trim(), line: item.line };
  }
  return meta;
}

function metadataValue(meta, names) {
  for (const name of names) {
    const item = meta[canonicalKey(name)];
    if (item) return item;
  }
  return null;
}

function parseTables(section) {
  if (!section) return [];
  const tables = [];
  let i = 0;
  while (i < section.lines.length) {
    const line = section.lines[i];
    if (!/^\s*\|.*\|\s*$/.test(line.text)) { i += 1; continue; }
    const headerLine = line;
    const sepLine = section.lines[i + 1];
    if (!sepLine || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(sepLine.text)) { i += 1; continue; }
    const headers = splitRow(headerLine.text).map((cell) => cell.toLowerCase().trim());
    const rows = [];
    i += 2;
    while (i < section.lines.length && /^\s*\|.*\|\s*$/.test(section.lines[i].text)) {
      const cells = splitRow(section.lines[i].text);
      const row = { line: section.lines[i].line, cells, raw: section.lines[i].text, byHeader: {} };
      headers.forEach((header, idx) => { row.byHeader[header] = (cells[idx] || '').trim(); });
      rows.push(row);
      i += 1;
    }
    tables.push({ headers, rows, section: section.title });
  }
  return tables;
}

function splitRow(row) {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function cell(row, candidates, fallbackIndex = -1) {
  for (const candidate of candidates) {
    const foundKey = Object.keys(row.byHeader).find((key) => key === candidate || key.includes(candidate));
    if (foundKey) return row.byHeader[foundKey];
  }
  return fallbackIndex >= 0 ? (row.cells[fallbackIndex] || '').trim() : '';
}

function cellsByHeader(row, candidates) {
  return Object.entries(row.byHeader)
    .filter(([key]) => candidates.some((candidate) => key === candidate || key.includes(candidate)))
    .map(([, value]) => value)
    .join(' ');
}

function isPlaceholder(value) {
  return PLACEHOLDER_RE.test(String(value || '').trim());
}

function hasMeaningfulMetadata(meta, names) {
  const item = metadataValue(meta, names);
  return Boolean(item && !isPlaceholder(item.value));
}

function profile(parsed) {
  const fullSignals = ['Current Objective', 'Dependency Graph', 'Active Work', 'Decision Log', 'Risks', 'Issues / Blockers', 'Change Requests'];
  if (fullSignals.some((name) => findSection(parsed, [name]))) return 'full';
  const title = parsed.lines.slice(0, 5).join('\n');
  if (/full project|substantial|multi-agent|long-running/i.test(title)) return 'full';
  return 'compact';
}

function isCloseoutState(parsed) {
  const closeout = findSection(parsed, ['Closeout']);
  if (!closeout) return false;
  return CLOSED_RE.test(getSectionText(closeout));
}

function newestDate(value) {
  const matches = [...String(value || '').matchAll(DATE_RE)].map((match) => new Date(`${match[1]}T00:00:00Z`)).filter((date) => !Number.isNaN(date.getTime()));
  if (!matches.length) return null;
  return matches.sort((a, b) => b.getTime() - a.getTime())[0];
}

function daysOld(date, now = new Date()) {
  return Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) / 86400000);
}

function checkRequiredStructure(parsed, findings) {
  const required = [
    ['Baseline'],
    ['Workspace Baseline'],
    ['Task Graph'],
    ['Validation Matrix'],
    ['Evidence Ledger'],
  ];
  required.forEach((names) => {
    if (!findSection(parsed, names)) add(findings, 'error', 'missing-heading', `Missing required APCP section: ${names[0]}`, { section: names[0] });
  });
  if (!findSection(parsed, ['Artifact Hygiene', 'Artifact Hygiene / Cleanup'])) {
    add(findings, 'error', 'missing-heading', 'Missing required APCP section: Artifact Hygiene / Cleanup', { section: 'Artifact Hygiene / Cleanup' });
  }
  if (!findSection(parsed, ['Closeout']) && !findSection(parsed, ['Next Checkpoint'])) {
    add(findings, 'error', 'missing-heading', 'Missing required compact/full terminal section: Closeout or Next Checkpoint', { section: 'Closeout|Next Checkpoint' });
  }
}

function checkRootMetadata(parsed, findings) {
  const baseline = findSection(parsed, ['Baseline']);
  const root = findSection(parsed, ['Root Goal', 'Root Goal Lock']);
  const meta = { ...parseMetadata(root), ...parseMetadata(baseline) };
  const severity = profile(parsed) === 'compact' ? 'warn' : 'error';
  const section = baseline ? baseline.title : (root ? root.title : 'Baseline|Root Goal');
  for (const field of ROOT_METADATA_FIELDS) {
    if (!hasMeaningfulMetadata(meta, [field])) {
      add(findings, severity, 'missing-root-metadata', `Missing required root/context metadata field: ${field}`, { section });
    }
  }
}

function checkEvidenceGaps(parsed, findings) {
  const task = findSection(parsed, ['Task Graph']);
  for (const table of parseTables(task)) {
    for (const row of table.rows) {
      const status = cell(row, ['status'], 2);
      if (!DONE_RE.test(status)) continue;
      const evidence = cell(row, ['evidence', 'evidence path'], row.cells.length - 1);
      if (isPlaceholder(evidence)) {
        add(findings, 'error', 'missing-evidence', `Accepted/done task row lacks concrete evidence at line ${row.line}`, { section: task.title, line: row.line, row: row.raw });
      }
    }
  }
}

function rowId(row) {
  return cell(row, ['id'], 0).replace(/`/g, '').trim();
}

function rowText(row) {
  return row.cells.join(' ');
}

function allTaskRows(parsed) {
  const task = findSection(parsed, ['Task Graph']);
  return parseTables(task).flatMap((table) => table.rows.map((row) => ({ row, section: task && task.title })));
}

function dependencyRows(parsed) {
  const section = findSection(parsed, ['Dependency Graph']);
  return parseTables(section).flatMap((table) => table.rows.map((row) => ({ row, section: section && section.title })));
}

function decisionRows(parsed) {
  const sections = ['Decisions / Blockers', 'Issues / Blockers', 'Decision Log', 'Integration Loop', 'Change Requests']
    .map((name) => findSection(parsed, [name]))
    .filter(Boolean);
  return sections.flatMap((section) => parseTables(section).flatMap((table) => table.rows.map((row) => ({ row, section: section.title }))));
}

function closeoutHasException(parsed, id) {
  const closeout = findSection(parsed, ['Closeout']);
  if (!closeout || !id) return false;
  const text = getSectionText(closeout);
  return new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i').test(text) && /\b(exception|deferred|waived|accepted gap|root goal finished|closeout)\b/i.test(text);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasContinuationFor(parsed, rejectedRow) {
  const id = rowId(rejectedRow);
  const taskRows = allTaskRows(parsed).map((item) => item.row);
  for (const row of taskRows) {
    if (row === rejectedRow) continue;
    const status = cell(row, ['status'], 2);
    const dependsOn = cell(row, ['depends on', 'depends'], 3);
    const text = rowText(row);
    if (CONTINUATION_STATUS_RE.test(status) && (
      (id && new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i').test(dependsOn)) ||
      CONTINUATION_RE.test(text)
    )) return true;
  }
  for (const { row } of dependencyRows(parsed)) {
    const text = rowText(row);
    if (id && !new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i').test(text)) continue;
    if (CONTINUATION_STATUS_RE.test(text) || CONTINUATION_RE.test(text)) return true;
  }
  for (const { row } of decisionRows(parsed)) {
    const text = rowText(row);
    if (id && !new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i').test(text)) continue;
    if (CONTINUATION_RE.test(text) || DEFERRED_RE.test(text)) return true;
  }
  const next = findSection(parsed, ['Next Checkpoint']);
  const nextText = getSectionText(next);
  if (nextText && CONTINUATION_RE.test(nextText) && (!id || new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i').test(nextText) || /\bnext|continue|retry|revision|blocker\b/i.test(nextText))) return true;
  return closeoutHasException(parsed, id);
}

function checkRejectedContinuation(parsed, findings) {
  const closeout = isCloseoutState(parsed);
  const task = findSection(parsed, ['Task Graph']);
  for (const table of parseTables(task)) {
    for (const row of table.rows) {
      const status = cell(row, ['status'], 2);
      if (!REVIEW_REJECTED_RE.test(status)) continue;
      const evidence = cell(row, ['evidence', 'evidence path'], row.cells.length - 1);
      const acceptance = cell(row, ['acceptance', 'reason', 'notes'], 6);
      const text = rowText(row);
      if (isPlaceholder(evidence)) {
        add(findings, 'error', 'review-missing-evidence', `Rejected/needs-revision task row lacks concrete evidence at line ${row.line}`, { section: task.title, line: row.line, row: row.raw });
      }
      if (!REASON_RE.test(`${acceptance} ${evidence} ${text}`)) {
        add(findings, 'error', 'review-missing-reason', `Rejected/needs-revision task row lacks a reason or acceptance-gap rationale at line ${row.line}`, { section: task.title, line: row.line, row: row.raw });
      }
      if (!hasContinuationFor(parsed, row)) {
        const severity = closeout ? 'warn' : 'error';
        add(findings, severity, 'review-missing-continuation', `Rejected/needs-revision task row has no retry/replacement/next node, linked blocker/deferred rationale, or closeout exception at line ${row.line}`, { section: task.title, line: row.line, row: row.raw });
      }
    }
  }
}

function checkNoContinuationAfterReview(parsed, findings) {
  if (isCloseoutState(parsed)) return;
  const taskRows = allTaskRows(parsed).map((item) => item.row);
  if (!taskRows.length) return;
  const hasReviewed = taskRows.some((row) => REVIEWED_STATUS_RE.test(cell(row, ['status'], 2)));
  if (!hasReviewed) return;
  const hasOpenContinuation = taskRows.some((row) => CONTINUATION_STATUS_RE.test(cell(row, ['status'], 2)));
  if (hasOpenContinuation) return;
  const next = findSection(parsed, ['Next Checkpoint']);
  const nextText = getSectionText(next);
  if (CONTINUATION_RE.test(nextText) || DEFERRED_RE.test(nextText)) return;
  add(findings, 'error', 'no-continuation-after-review', 'Non-closed state records review decisions but no active/ready next node, blocker/deferred rationale, or continuation checkpoint.', { section: 'Task Graph|Next Checkpoint' });
}

function checkStaleActiveWork(parsed, findings, maxStaleDays) {
  const sections = [findSection(parsed, ['Active Work']), findSection(parsed, ['Task Graph'])].filter(Boolean);
  for (const section of sections) {
    for (const table of parseTables(section)) {
      for (const row of table.rows) {
        const status = cell(row, ['status'], 2);
        if (!ACTIVE_RE.test(status)) continue;
        const checkpoint = cell(row, ['checkpoint', 'evidence', 'notes'], row.cells.length - 1);
        if (isPlaceholder(checkpoint)) {
          add(findings, 'error', 'stale-active-work', `Active/ready work has placeholder checkpoint/evidence at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
          continue;
        }
        const date = newestDate(checkpoint);
        if (!date) {
          add(findings, 'warn', 'undated-active-work', `Active/ready work has no date-like checkpoint at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
          continue;
        }
        const age = daysOld(date);
        if (age > maxStaleDays) {
          add(findings, 'error', 'stale-active-work', `Active/ready work checkpoint is ${age} days old at line ${row.line}`, { section: section.title, line: row.line, ageDays: age, row: row.raw });
        }
      }
    }
  }
}

function checkCleanupDrift(parsed, findings) {
  const section = findSection(parsed, ['Artifact Hygiene', 'Artifact Hygiene / Cleanup']);
  if (!section) return;
  const closeout = isCloseoutState(parsed);
  for (const table of parseTables(section)) {
    for (const row of table.rows) {
      const keepDelete = cell(row, ['keep/delete', 'default'], 3);
      const status = cell(row, ['status'], row.cells.length - 2);
      const notes = cell(row, ['notes', 'reason', 'evidence'], row.cells.length - 1);
      if (isPlaceholder(keepDelete)) {
        add(findings, 'warn', 'cleanup-missing-disposition', `Cleanup row lacks Keep/Delete disposition at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
      }
      if (OPEN_CLEANUP_RE.test(String(status || '').trim())) {
        const severity = closeout && !DEFERRED_RE.test(notes) ? 'error' : 'warn';
        add(findings, severity, 'cleanup-open', `Cleanup/artifact row appears open at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
      }
    }
  }
}

function checkValidationCloseout(parsed, findings) {
  if (!isCloseoutState(parsed)) return;
  const section = findSection(parsed, ['Validation Matrix']);
  for (const table of parseTables(section)) {
    for (const row of table.rows) {
      const result = cell(row, ['result', 'status'], 2);
      const notes = cell(row, ['notes', 'rationale'], row.cells.length - 1);
      if (VALIDATION_OPEN_RE.test(result) && !DEFERRED_RE.test(notes)) {
        add(findings, 'error', 'closeout-validation-open', `Closed/final state has pending/not-run validation row at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
      }
    }
  }
}

function checkNativeExecutorRows(parsed, findings) {
  const sections = [findSection(parsed, ['Active Work']), findSection(parsed, ['Task Graph'])].filter(Boolean);
  for (const section of sections) {
    for (const table of parseTables(section)) {
      for (const row of table.rows) {
        const status = cell(row, ['status'], 2);
        if (!ACTIVE_RE.test(status)) continue;
        const worker = cell(row, ['owner/worker', 'worker type', 'worker', 'owner'], 4);
        const modeText = `${worker} ${cellsByHeader(row, ['worker', 'owner', 'type', 'mode', 'invocation'])}`;
        if (!NATIVE_EXECUTOR_RE.test(modeText)) continue;
        const rowText = `${modeText} ${row.raw}`;
        if (!PROCESS_ID_RE.test(rowText) && !RATIONALE_RE.test(rowText)) {
          add(findings, 'error', 'native-executor-pointer-missing-id', `Native executor row lacks process/session/run id or explicit missing rationale at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
        }
        if (!ARTIFACT_RE.test(rowText)) {
          add(findings, 'error', 'native-executor-pointer-missing-artifacts', `Native executor row lacks expected durable artifacts/report/evidence at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
        }
        if (!REVIEW_RE.test(rowText)) {
          add(findings, 'error', 'native-executor-pointer-missing-review', `Native executor row lacks review trigger at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
        }
        if (!STALE_POLICY_RE.test(rowText)) {
          add(findings, 'error', 'native-executor-pointer-missing-stale-policy', `Native executor row lacks stale/timeout policy at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
        }
      }
    }
  }
}

function checkNativeExecutorPointer(parsed, findings) {
  const pointerText = parsed.lines.join('\n');
  if (!NATIVE_EXECUTOR_RE.test(pointerText)) return;
  if (!PROCESS_ID_RE.test(pointerText) && !RATIONALE_RE.test(pointerText)) {
    add(findings, 'error', 'native-executor-pointer-missing-id', 'Native executor pointer lacks process/session/run id or explicit missing rationale.');
  }
  if (!ARTIFACT_RE.test(pointerText)) add(findings, 'error', 'native-executor-pointer-missing-artifacts', 'Native executor pointer lacks expected durable artifacts/report/evidence.');
  if (!REVIEW_RE.test(pointerText)) add(findings, 'error', 'native-executor-pointer-missing-review', 'Native executor pointer lacks review trigger.');
  if (!STALE_POLICY_RE.test(pointerText)) add(findings, 'error', 'native-executor-pointer-missing-stale-policy', 'Native executor pointer lacks stale/timeout policy.');
}

function findPointerPath(root) {
  if (!root) return null;
  const candidate = path.join(path.resolve(root), '.apcp', 'current-run.md');
  return fs.existsSync(candidate) ? candidate : null;
}

function validateActiveRunPointer(pointerPath, findings) {
  if (!pointerPath) return null;
  const markdown = fs.readFileSync(pointerPath, 'utf8');
  const parsed = parseMarkdown(markdown);
  const meta = parseMetadata({ lines: parsed.lines.map((text, idx) => ({ text, line: idx + 1 })) });
  const statusItem = metadataValue(meta, ['status']);
  const status = statusItem ? statusItem.value : '';
  const closed = /\b(closed|complete|completed|done|accepted|final)\b/i.test(status);
  const required = [
    ['status'],
    ['project'],
    ['projectRoot', 'project root'],
    ['statePath', 'state path', 'state'],
    ['rootGoal', 'root goal'],
    ['closeoutRule', 'closeout rule', 'closeout'],
  ];
  if (!closed) {
    required.push(
      ['currentGraphNode', 'current graph node', 'current node'],
      ['workerLabelSessionRunId', 'worker label/session/run id', 'worker label', 'session id', 'run id'],
      ['expectedReportEvidence', 'expected report/evidence', 'expected report', 'expected evidence'],
      ['heartbeatInstructions', 'heartbeat instructions', 'heartbeat']
    );
  }
  for (const names of required) {
    if (!hasMeaningfulMetadata(meta, names)) {
      add(findings, 'error', 'active-run-pointer-missing-field', `Active-run pointer missing required field: ${names[0]}`, { section: 'current-run.md', statePath: pointerPath });
    }
  }
  if (!closed && status && !/\b(active|blocked|needs-review|needs revision|needs-revision)\b/i.test(status)) {
    add(findings, 'warn', 'active-run-pointer-unknown-status', `Active-run pointer status is unusual: ${status}`, { section: 'current-run.md', statePath: pointerPath });
  }
  checkNativeExecutorPointer(parsed, findings);
  return pointerPath;
}

function extractListItems(section, filters = []) {
  if (!section) return [];
  const lines = [];
  for (const item of section.lines) {
    const text = item.text.trim();
    if (!text || /^\|?\s*:?-{3,}/.test(text)) continue;
    if (/^\|.*\|$/.test(text)) {
      if (!filters.length || filters.some((re) => re.test(text))) lines.push(`line ${item.line}: ${text}`);
    } else if (/^[-*]\s+/.test(text) || /^\w/.test(text)) {
      if (!filters.length || filters.some((re) => re.test(text))) lines.push(text.replace(/^[-*]\s+/, ''));
    }
  }
  return lines.slice(0, 12);
}

function buildContinuation(parsed, findings) {
  const baseline = findSection(parsed, ['Baseline']);
  const current = findSection(parsed, ['Current Objective']);
  const active = findSection(parsed, ['Active Work']);
  const task = findSection(parsed, ['Task Graph']);
  const risks = findSection(parsed, ['Risks']);
  const issues = findSection(parsed, ['Issues / Blockers', 'Decisions / Blockers']);
  const changes = findSection(parsed, ['Change Requests']);
  const validation = findSection(parsed, ['Validation Matrix']);
  const cleanup = findSection(parsed, ['Artifact Hygiene', 'Artifact Hygiene / Cleanup']);
  const next = findSection(parsed, ['Next Checkpoint']);

  const lines = [];
  const goalLine = extractListItems(baseline, [/goal|objective|northStar|northstar|success/i])[0];
  if (goalLine) lines.push(`Goal: ${goalLine}`);
  const currentText = getSectionText(current).trim().split(/\n/).find(Boolean);
  if (currentText) lines.push(`Current objective: ${currentText.replace(/^[-*]\s+/, '')}`);

  const work = [
    ...extractListItems(active, [/active|blocked|needs-review|needs revision|ready/i]),
    ...extractListItems(task, [/active|blocked|needs-review|needs revision|ready/i]),
  ].slice(0, 10);
  if (work.length) lines.push('Work needing attention:', ...work.map((item) => `- ${item}`));

  const riskLines = [
    ...extractListItems(risks, [/open|high|medium|blocked|pending|active/i]),
    ...extractListItems(issues, [/open|blocked|pending|active|needed/i]),
    ...extractListItems(changes, [/open|pending|human|required/i]),
  ].slice(0, 10);
  if (riskLines.length) lines.push('Risks/issues/changes:', ...riskLines.map((item) => `- ${item}`));

  const validationLines = extractListItems(validation, [/failed|not-run|infrastructure_blocked|warning|skipped/i]).slice(0, 8);
  if (validationLines.length) lines.push('Validation gaps:', ...validationLines.map((item) => `- ${item}`));

  const cleanupLines = extractListItems(cleanup, [/open|active|pending|tbd|delete|cleanup/i]).slice(0, 8);
  if (cleanupLines.length) lines.push('Cleanup signals:', ...cleanupLines.map((item) => `- ${item}`));

  const nextText = getSectionText(next).trim().split(/\n/).find(Boolean);
  if (nextText) lines.push(`Next checkpoint: ${nextText.replace(/^[-*]\s+/, '')}`);

  const severe = findings.filter((finding) => finding.severity === 'error').length;
  const warn = findings.filter((finding) => finding.severity === 'warn').length;
  lines.push(`Checker summary: ${severe} error(s), ${warn} warning(s).`);
  return { lines };
}

function check(markdown, options) {
  const parsed = parseMarkdown(markdown);
  const findings = [];
  checkRequiredStructure(parsed, findings);
  checkRootMetadata(parsed, findings);
  checkEvidenceGaps(parsed, findings);
  checkRejectedContinuation(parsed, findings);
  checkNoContinuationAfterReview(parsed, findings);
  checkStaleActiveWork(parsed, findings, options.maxStaleDays);
  checkNativeExecutorRows(parsed, findings);
  checkValidationCloseout(parsed, findings);
  checkCleanupDrift(parsed, findings);
  if (options.root) validateActiveRunPointer(findPointerPath(options.root), findings);
  if (!findings.length) add(findings, 'info', 'clean', 'No APCP hygiene errors found.');
  const summary = {
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity === 'warn').length,
    info: findings.filter((finding) => finding.severity === 'info').length,
  };
  return { ok: summary.errors === 0, summary, findings, continuation: buildContinuation(parsed, findings) };
}

function renderText(result, statePath, includeContinuation) {
  const output = [];
  output.push(`APCP checker v${VERSION}`);
  output.push(`State: ${statePath}`);
  output.push(`Summary: ${result.summary.errors} error(s), ${result.summary.warnings} warning(s), ${result.summary.info} info`);
  for (const severity of ['error', 'warn', 'info']) {
    const bucket = result.findings.filter((finding) => finding.severity === severity);
    if (!bucket.length) continue;
    output.push('');
    output.push(`${severity.toUpperCase()}:`);
    for (const finding of bucket) {
      const loc = finding.line ? ` line ${finding.line}` : '';
      const section = finding.section ? ` [${finding.section}]` : '';
      output.push(`- ${finding.rule}${section}${loc}: ${finding.message}`);
    }
  }
  if (includeContinuation) {
    output.push('');
    output.push('Continuation summary:');
    result.continuation.lines.forEach((line) => output.push(line));
  }
  return `${output.join('\n')}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { process.stdout.write(usage()); return 0; }
    if (args.version) { process.stdout.write(`${VERSION}\n`); return 0; }
    const statePath = findStatePath(args);
    const markdown = fs.readFileSync(statePath, 'utf8');
    const result = check(markdown, args);
    const payload = { ok: result.ok, statePath, summary: result.summary, findings: result.findings, continuation: args.continuation ? result.continuation : undefined };
    if (args.format === 'json') process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    else process.stdout.write(renderText(result, statePath, args.continuation));
    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof UsageError ? error.message : `${error.name || 'Error'}: ${error.message}`;
    process.stderr.write(`${message}\n\n${usage()}`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main();
else module.exports = { check, parseMarkdown, VERSION };
