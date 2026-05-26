#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = '0.3.0';
const PLACEHOLDER_RE = /^(|[-—]|tbd|todo|none|null|n\/a|na|not-run|not run|missing|unknown)$/i;
const DONE_RE = /\b(accepted|done|passed|complete|completed)\b/i;
const ACTIVE_RE = /\b(active|needs-review|needs revision|needs-revision|ready)\b/i;
const OPEN_CLEANUP_RE = /^(|[-—]|tbd|todo|open|active|pending|not-run|not run|unknown)$/i;
const DATE_RE = /\b(20\d{2}-\d{2}-\d{2})(?:[ T][0-2]\d:[0-5]\d(?::[0-5]\d)?)?\b/g;

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
  return parsed.sections.find((section) => sectionMatches(section, names));
}

function add(findings, severity, rule, message, extra = {}) {
  findings.push({ severity, rule, message, ...extra });
}

function getSectionText(section) {
  return section ? section.lines.map((line) => line.text).join('\n') : '';
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

function isPlaceholder(value) {
  return PLACEHOLDER_RE.test(String(value || '').trim());
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
  for (const table of parseTables(section)) {
    for (const row of table.rows) {
      const keepDelete = cell(row, ['keep/delete', 'default'], 3);
      const status = cell(row, ['status'], row.cells.length - 2);
      if (isPlaceholder(keepDelete)) {
        add(findings, 'warn', 'cleanup-missing-disposition', `Cleanup row lacks Keep/Delete disposition at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
      }
      if (OPEN_CLEANUP_RE.test(String(status || '').trim())) {
        add(findings, 'warn', 'cleanup-open', `Cleanup/artifact row appears open at line ${row.line}`, { section: section.title, line: row.line, row: row.raw });
      }
    }
  }
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
  checkEvidenceGaps(parsed, findings);
  checkStaleActiveWork(parsed, findings, options.maxStaleDays);
  checkCleanupDrift(parsed, findings);
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
