#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = '0.4.1-watch';
const PLACEHOLDER_RE = /^(|[-—]|tbd|todo|none|null|n\/a|na|not-run|not run|missing|unknown)$/i;
const CLOSED_RE = /\b(closed|complete|completed|done|accepted|final)\b/i;
const BLOCKED_RE = /\b(blocked)\b/i;
const INFRA_RE = /\b(infrastructure[-_ ]blocked|infra[-_ ]blocked|tool[-_ ]blocked|provider[-_ ]blocked)\b/i;
const NEEDS_REVIEW_RE = /\b(ready-for-controller-review|needs-review|needs review|review-ready|ready)\b/i;
const NEEDS_RETRY_RE = /\b(needs-retry|needs retry|retry)\b/i;
const REVIEW_REJECTED_RE = /\b(rejected|needs[- ]revision)\b/i;
const CONTINUATION_STATUS_RE = /\b(active|ready|blocked|infrastructure[-_ ]blocked|deferred|needs[- ]review)\b/i;
const CONTINUATION_RE = /\b(next|retry|retries|replacement|replace|revision|revise|active|ready|blocked|blocker|deferred|defer|follow[- ]?up|continuation|pointer|current node|closeout exception)\b/i;
const NATIVE_EXECUTOR_RE = /\b(native[- ]executor|command|coding[- ]agent[- ]client|codex|exec|process|cli)\b/i;
const PROCESS_ID_RE = /\b(process|proc|pid|session|run|job|execution|deployment|terminal|tty)\s*(id|label|name|#|:)?\s*[:=#-]?\s*[A-Za-z0-9_.:/-]{3,}\b/i;
const RATIONALE_RE = /\b(no\s+(process|session|run)\s+id|missing\s+(process|session|run)\s+(id\s+)?rationale|not available because|unavailable because|rationale)\b/i;
const ARTIFACT_RE = /\b(artifact|report|evidence|log|diff|patch|screenshot|trace|output)\b/i;
const REVIEW_RE = /\b(review|acceptance|needs-review|trigger|handoff|controller)\b/i;
const STALE_POLICY_RE = /\b(stale|timeout|heartbeat|max-stale|retry|expire|deadline|kill|poll)\b/i;
const SECRET_PATH_RE = /(^|[/\\])(?:\.env(?:\.|$)|.*secret.*|.*credential.*|.*token.*|.*key.*)(?:$|[/\\])/i;

function usage() {
  return `APCP coordination watchdog ${VERSION}\n\nUsage:\n  node .agents/skills/apcp/bin/apcp-watch.js --root <dir> [--format text|json] [--write-report <path>]\n  node .agents/skills/apcp/bin/apcp-watch.js --pointer <path> [--format text|json] [--write-report <path>]\n\nExit codes:\n  0 closed, no pointer, or no actionable issue\n  1 controller attention needed\n  2 usage or infrastructure error\n`;
}

class UsageError extends Error {}

function takeValue(argv, index, flag) {
  if (index >= argv.length || argv[index].startsWith('--')) throw new UsageError(`${flag} requires a value`);
  return argv[index];
}

function parseArgs(argv) {
  const args = { root: null, pointer: null, format: 'text', writeReport: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--version' || arg === '-v') args.version = true;
    else if (arg === '--root') args.root = takeValue(argv, ++i, '--root');
    else if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length);
    else if (arg === '--pointer') args.pointer = takeValue(argv, ++i, '--pointer');
    else if (arg.startsWith('--pointer=')) args.pointer = arg.slice('--pointer='.length);
    else if (arg === '--format') args.format = takeValue(argv, ++i, '--format');
    else if (arg.startsWith('--format=')) args.format = arg.slice('--format='.length);
    else if (arg === '--write-report') args.writeReport = takeValue(argv, ++i, '--write-report');
    else if (arg.startsWith('--write-report=')) args.writeReport = arg.slice('--write-report='.length);
    else throw new UsageError(`Unknown argument: ${arg}`);
  }
  if (args.root && args.pointer) throw new UsageError('Use only one of --root or --pointer');
  if (!args.root && !args.pointer && !args.help && !args.version) throw new UsageError('One of --root or --pointer is required');
  if (!['text', 'json'].includes(args.format)) throw new UsageError(`Unsupported --format: ${args.format}`);
  return args;
}

function normalizeHeading(text) {
  return text.toLowerCase().replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { title: '(preamble)', normalized: '(preamble)', lines: [] };
  sections.push(current);
  lines.forEach((line, idx) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      current = { title: match[2].trim(), normalized: normalizeHeading(match[2]), lines: [] };
      sections.push(current);
    } else {
      current.lines.push({ text: line, line: idx + 1 });
    }
  });
  return { lines, sections };
}

function canonicalKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseMetadataFromLines(lines) {
  const meta = {};
  for (const item of lines) {
    const match = /^\s*(?:[-*]\s*)?`?([^:`|]+?)`?\s*:\s*(.*?)\s*$/.exec(item.text || item);
    if (!match) continue;
    meta[canonicalKey(match[1])] = { key: match[1].trim(), value: match[2].trim(), line: item.line || null };
  }
  return meta;
}

function metadataValue(meta, names) {
  for (const name of names) {
    const found = meta[canonicalKey(name)];
    if (found) return found;
  }
  return null;
}

function meaningful(meta, names) {
  const item = metadataValue(meta, names);
  return Boolean(item && !PLACEHOLDER_RE.test(item.value));
}

function value(meta, names) {
  const item = metadataValue(meta, names);
  return item && !PLACEHOLDER_RE.test(item.value) ? item.value : '';
}

function add(findings, severity, rule, message, extra = {}) {
  findings.push({ severity, rule, message, ...extra });
}

function isSecretish(candidate) {
  return SECRET_PATH_RE.test(candidate.replace(/\\/g, '/'));
}

function safeReadText(filePath) {
  if (isSecretish(filePath)) throw new UsageError(`Refusing to read secret/env-like path: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function pointerPath(args) {
  if (args.pointer) return path.resolve(args.pointer);
  const root = path.resolve(args.root);
  return path.join(root, '.apcp', 'current-run.md');
}

function resolveFromProjectRoot(rawPath, projectRoot) {
  const cleaned = String(rawPath || '').replace(/^`|`$/g, '').trim();
  if (!cleaned || /^none$/i.test(cleaned)) return '';
  if (/^[a-z]+:/i.test(cleaned) && !/^[A-Za-z]:[\\/]/.test(cleaned)) return '';
  return path.isAbsolute(cleaned) ? path.normalize(cleaned) : path.resolve(projectRoot, cleaned);
}


function cleanPathValue(rawPath) {
  return String(rawPath || '').replace(/^`|`$/g, '').trim();
}

function resolveProjectRoot(rawProjectRoot, pointer, fallbackRoot) {
  const pointerProjectRoot = fallbackRoot || path.dirname(path.dirname(pointer));
  const cleaned = cleanPathValue(rawProjectRoot);
  if (!cleaned || /^none$/i.test(cleaned)) return pointerProjectRoot;
  if (/^[a-z]+:/i.test(cleaned) && !/^[A-Za-z]:[\/]/.test(cleaned)) return pointerProjectRoot;
  if (path.isAbsolute(cleaned)) return path.normalize(cleaned);
  if (cleaned === '.') return pointerProjectRoot;
  const normalized = cleaned.replace(/^\.\//, '').replace(/\\/g, '/');
  if (pointerProjectRoot.replace(/\\/g, '/').endsWith(`/${normalized}`)) return pointerProjectRoot;
  const cwdCandidate = path.resolve(cleaned);
  if (fs.existsSync(cwdCandidate)) return cwdCandidate;
  return path.resolve(pointerProjectRoot, cleaned);
}

function extractCandidatePaths(text) {
  return String(text || '')
    .replace(/[()[\]{}]/g, ' ')
    .split(/[\s,;]+/)
    .map((token) => token.trim().replace(/^[-*]+/, '').replace(/^`|`$/g, '').replace(/[。]$/, ''))
    .filter((token) => token && (token.includes('/') || token.startsWith('.')))
    .filter((token) => !/^(?:n\/a|none|missing|unknown|tbd)$/i.test(token));
}

function findSection(parsed, names) {
  const normalized = names.map(normalizeHeading);
  return parsed.sections.find((section) => normalized.includes(section.normalized)) || null;
}

function splitRow(row) {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cellText) => cellText.trim());
}

function parseTables(section) {
  if (!section) return [];
  const tables = [];
  let i = 0;
  while (i < section.lines.length) {
    const line = section.lines[i];
    const sepLine = section.lines[i + 1];
    if (!/^\s*\|.*\|\s*$/.test(line.text) || !sepLine || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(sepLine.text)) { i += 1; continue; }
    const headers = splitRow(line.text).map((header) => header.toLowerCase());
    const rows = [];
    i += 2;
    while (i < section.lines.length && /^\s*\|.*\|\s*$/.test(section.lines[i].text)) {
      const cells = splitRow(section.lines[i].text);
      const row = { line: section.lines[i].line, cells, raw: section.lines[i].text, byHeader: {} };
      headers.forEach((header, index) => { row.byHeader[header] = (cells[index] || '').trim(); });
      rows.push(row);
      i += 1;
    }
    tables.push({ headers, rows });
  }
  return tables;
}

function cell(row, candidates, fallbackIndex = -1) {
  for (const candidate of candidates) {
    const key = Object.keys(row.byHeader).find((header) => header === candidate || header.includes(candidate));
    if (key) return row.byHeader[key];
  }
  return fallbackIndex >= 0 ? (row.cells[fallbackIndex] || '').trim() : '';
}

function rowId(row) {
  return cell(row, ['id'], 0).replace(/`/g, '').trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sectionText(section) {
  return section ? section.lines.map((line) => line.text).join('\n') : '';
}

function inspectCurrentNode(parsed, currentNode) {
  const task = findSection(parsed, ['Task Graph']);
  const current = String(currentNode || '').replace(/`/g, '').trim();
  const rows = parseTables(task).flatMap((table) => table.rows);
  let matched = null;
  for (const row of rows) {
    const id = rowId(row);
    const node = cell(row, ['node'], 1);
    if ((current && id && current === id) || (current && node && node.includes(current)) || (!current && CONTINUATION_STATUS_RE.test(cell(row, ['status'], 2)))) {
      matched = row;
      break;
    }
  }
  if (!matched) return { currentNode, status: '', found: false, hasContinuation: false };
  const status = cell(matched, ['status'], 2);
  return { currentNode: current || rowId(matched), status, found: true, hasContinuation: hasStateContinuation(parsed, matched) };
}

function hasStateContinuation(parsed, currentRow) {
  const id = rowId(currentRow);
  const task = findSection(parsed, ['Task Graph']);
  const rows = parseTables(task).flatMap((table) => table.rows);
  for (const row of rows) {
    if (row === currentRow) continue;
    const status = cell(row, ['status'], 2);
    const depends = cell(row, ['depends on', 'depends'], 3);
    const text = row.cells.join(' ');
    if (CONTINUATION_STATUS_RE.test(status) && ((!id || new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i').test(depends)) || CONTINUATION_RE.test(text))) return true;
  }
  const sections = ['Dependency Graph', 'Decisions / Blockers', 'Issues / Blockers', 'Integration Loop', 'Change Requests'];
  for (const name of sections) {
    const section = findSection(parsed, [name]);
    const text = sectionText(section);
    if (text && (!id || new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i').test(text)) && CONTINUATION_RE.test(text)) return true;
  }
  const nextText = sectionText(findSection(parsed, ['Next Checkpoint']));
  if (/\b(no|without|missing)\s+(next|continuation|retry|revision|replacement|blocker)\b/i.test(nextText)) return false;
  return Boolean(nextText && CONTINUATION_RE.test(nextText));
}

function inspectArtifacts(meta, projectRoot, findings) {
  const sources = [
    value(meta, ['expectedReport', 'expected report']),
    value(meta, ['expectedEvidence', 'expected evidence']),
    value(meta, ['expectedReportEvidence', 'expected report/evidence']),
  ].filter(Boolean);
  const paths = [...new Set(sources.flatMap(extractCandidatePaths))];
  const artifacts = [];
  for (const raw of paths) {
    const resolved = resolveFromProjectRoot(raw, projectRoot);
    if (!resolved) continue;
    if (isSecretish(resolved)) {
      add(findings, 'error', 'artifact-secret-path', `Refusing to inspect secret/env-like expected artifact path: ${raw}`, { path: raw });
      artifacts.push({ path: raw, resolved, exists: false, skipped: true });
      continue;
    }
    let exists = false;
    let type = 'missing';
    try {
      const stat = fs.statSync(resolved);
      exists = true;
      type = stat.isDirectory() ? 'directory' : 'file';
    } catch (error) {
      if (error.code !== 'ENOENT') add(findings, 'error', 'artifact-stat-failed', `Could not inspect expected artifact path: ${raw}`, { path: raw, detail: error.message });
    }
    artifacts.push({ path: raw, resolved, exists, type });
  }
  return artifacts;
}

function inspectState(meta, projectRoot, findings) {
  const rawState = value(meta, ['statePath', 'state path', 'state']);
  const statePath = resolveFromProjectRoot(rawState, projectRoot);
  if (!statePath) return { path: rawState || '', exists: false, read: false, currentNode: null };
  if (isSecretish(statePath)) {
    add(findings, 'error', 'state-secret-path', `Refusing to read secret/env-like state path: ${rawState}`, { path: rawState });
    return { path: rawState, resolved: statePath, exists: false, read: false, currentNode: null };
  }
  if (!fs.existsSync(statePath)) {
    add(findings, 'warn', 'state-missing', `Referenced APCP state is missing: ${rawState}`, { path: rawState });
    return { path: rawState, resolved: statePath, exists: false, read: false, currentNode: null };
  }
  const markdown = safeReadText(statePath);
  const parsed = parseMarkdown(markdown);
  const currentNode = inspectCurrentNode(parsed, value(meta, ['currentGraphNode', 'current graph node', 'currentNode', 'current node']));
  return { path: rawState, resolved: statePath, exists: true, read: true, currentNode };
}

function classify(rawStatus, findings, artifacts, state) {
  const status = String(rawStatus || '').trim();
  const hasErrors = findings.some((finding) => finding.severity === 'error');
  const current = state && state.currentNode;
  if (CLOSED_RE.test(status)) return 'closed';
  if (current && REVIEW_REJECTED_RE.test(current.status) && !current.hasContinuation) return 'review-recorded-needs-continuation';
  if (INFRA_RE.test(status)) return 'infrastructure-blocked';
  if (NEEDS_RETRY_RE.test(status) || hasErrors) return 'needs-retry';
  if (artifacts.length && artifacts.every((artifact) => artifact.exists)) return 'ready-for-controller-review';
  if (current && /\b(accepted|needs[- ]review)\b/i.test(current.status)) return 'ready-for-controller-review';
  if (NEEDS_REVIEW_RE.test(status)) return 'needs-review';
  if (BLOCKED_RE.test(status)) return 'blocked';
  return 'active';
}

function activeFieldChecks(meta, closed, findings) {
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
    if (!meaningful(meta, names)) add(findings, 'error', 'active-run-pointer-missing-field', `Active-run pointer missing required field: ${names[0]}`);
  }
}

function nativeChecks(text, findings) {
  if (!NATIVE_EXECUTOR_RE.test(text)) return false;
  if (!PROCESS_ID_RE.test(text) && !RATIONALE_RE.test(text)) add(findings, 'error', 'native-executor-pointer-missing-id', 'Native executor pointer lacks process/session/run id or explicit missing rationale.');
  if (!ARTIFACT_RE.test(text)) add(findings, 'error', 'native-executor-pointer-missing-artifacts', 'Native executor pointer lacks expected durable artifacts/report/evidence.');
  if (!REVIEW_RE.test(text)) add(findings, 'error', 'native-executor-pointer-missing-review', 'Native executor pointer lacks review trigger.');
  if (!STALE_POLICY_RE.test(text)) add(findings, 'error', 'native-executor-pointer-missing-stale-policy', 'Native executor pointer lacks stale/timeout policy.');
  return true;
}

function watch(args) {
  const pointer = pointerPath(args);
  if (!fs.existsSync(pointer)) {
    return { ok: true, status: 'no-pointer', actionable: false, pointerPath: pointer, findings: [{ severity: 'info', rule: 'no-pointer', message: 'No active-run pointer found.' }], artifacts: [], state: null };
  }
  const markdown = safeReadText(pointer);
  const parsed = parseMarkdown(markdown);
  const meta = parseMetadataFromLines(parsed.lines.map((text, idx) => ({ text, line: idx + 1 })));
  const findings = [];
  const rawStatus = value(meta, ['status']);
  const closed = CLOSED_RE.test(rawStatus);
  activeFieldChecks(meta, closed, findings);
  const pointerProjectRoot = path.dirname(path.dirname(pointer));
  const projectRootValue = value(meta, ['projectRoot', 'project root']) || (args.root ? path.resolve(args.root) : pointerProjectRoot);
  const projectRoot = resolveProjectRoot(projectRootValue, pointer, pointerProjectRoot);
  const state = inspectState(meta, projectRoot, findings);
  const isNative = nativeChecks(markdown, findings);
  const artifacts = closed ? [] : inspectArtifacts(meta, projectRoot, findings);
  if (!closed && artifacts.length && artifacts.some((artifact) => !artifact.exists && !artifact.skipped)) {
    add(findings, 'warn', 'expected-artifact-missing', 'One or more expected report/evidence artifacts are not present yet.');
  }
  const status = classify(rawStatus, findings, artifacts, state);
  if (status === 'review-recorded-needs-continuation') add(findings, 'warn', 'review-recorded-needs-continuation', 'Current node is rejected/needs-revision in state without a retry/replacement/next node, linked blocker/deferred rationale, or closeout exception.');
  const actionable = !['closed', 'no-pointer', 'active'].includes(status) || findings.some((finding) => finding.severity === 'error');
  return { ok: !actionable, status, actionable, pointerPath: pointer, projectRoot, state, nativeExecutor: isNative, findings, artifacts };
}

function renderReport(result) {
  const lines = [
    '# APCP Watchdog Reconciliation',
    '',
    `- status: ${result.status}`,
    `- pointer: ${result.pointerPath}`,
    result.projectRoot ? `- projectRoot: ${result.projectRoot}` : null,
    result.state ? `- state: ${result.state.path || 'none'}${result.state.exists ? ' (present)' : ''}` : null,
    `- actionable: ${result.actionable ? 'yes' : 'no'}`,
    '',
    '## Findings',
  ].filter(Boolean);
  if (result.findings.length) result.findings.forEach((finding) => lines.push(`- ${finding.severity}: ${finding.rule} — ${finding.message}`));
  else lines.push('- none');
  lines.push('', '## Expected Artifacts');
  if (result.artifacts.length) result.artifacts.forEach((artifact) => lines.push(`- ${artifact.exists ? 'present' : 'missing'}: ${artifact.path}`));
  else lines.push('- none listed');
  return `${lines.join('\n')}\n`;
}

function renderText(result) {
  const lines = [`APCP watchdog ${VERSION}`, `Status: ${result.status}`, `Pointer: ${result.pointerPath}`];
  if (result.projectRoot) lines.push(`Project root: ${result.projectRoot}`);
  if (result.nativeExecutor) lines.push('Native executor: yes');
  if (result.state) lines.push(`State: ${result.state.path || 'none'}${result.state.exists ? ' (present)' : ''}`);
  if (result.artifacts.length) {
    lines.push('Expected artifacts:');
    result.artifacts.forEach((artifact) => lines.push(`- ${artifact.exists ? 'present' : 'missing'} ${artifact.path}`));
  }
  if (result.findings.length) {
    lines.push('Findings:');
    result.findings.forEach((finding) => lines.push(`- ${finding.severity}: ${finding.rule}: ${finding.message}`));
  }
  return `${lines.join('\n')}\n`;
}

function validateReportPath(reportPath, result) {
  const resolved = path.resolve(reportPath);
  if (isSecretish(resolved)) throw new UsageError(`Refusing to write secret/env-like report path: ${reportPath}`);
  if (!/\.(md|markdown|txt)$/i.test(resolved)) throw new UsageError('--write-report path must end in .md, .markdown, or .txt');
  const protectedPaths = [result.pointerPath, result.state && result.state.resolved].filter(Boolean).map((item) => path.resolve(item));
  if (protectedPaths.includes(resolved)) throw new UsageError('--write-report must not overwrite APCP pointer or state files');
  return resolved;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { process.stdout.write(usage()); return 0; }
    if (args.version) { process.stdout.write(`${VERSION}\n`); return 0; }
    const result = watch(args);
    if (args.writeReport) {
      const reportPath = validateReportPath(args.writeReport, result);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, renderReport(result));
      result.reportPath = reportPath;
    }
    if (args.format === 'json') process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else process.stdout.write(renderText(result));
    return result.actionable ? 1 : 0;
  } catch (error) {
    const message = error instanceof UsageError ? error.message : `${error.name || 'Error'}: ${error.message}`;
    process.stderr.write(`${message}\n\n${usage()}`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main();
else module.exports = { watch, parseMarkdown, VERSION };
