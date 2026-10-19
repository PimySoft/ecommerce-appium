import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Classified, Outcome } from './classify.js';
import { RESULTS_DIR, type ResultsFile } from './resultsFile.js';

/**
 * One line per run in `logs/history/runs.jsonl`, written by `npm run test:report` and read by `npm run test:flake-rate`.
 * `logs/` is not committed, so locally this is one machine's history; CI restores and saves it with a cache.
 */
export interface HistoryRun {
  runId: string;
  at: string;
  /** Commit plus a hash of uncommitted changes to the app, backend and suite: "same build" for the flake definition. */
  build: string;
  tests: Array<{ source: string; spec: string; title: string; outcome: Outcome }>;
}

export const HISTORY_FILE = path.join(RESULTS_DIR, 'history', 'runs.jsonl');

export function currentBuild(): string {
  try {
    const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
    const diff = execSync('git diff HEAD -- mobile/src backend/src e2e/specs e2e/pageobjects e2e/helpers', {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return diff ? `${commit}+${crypto.createHash('sha1').update(diff).digest('hex').slice(0, 8)}` : commit;
  } catch {
    return 'unknown';
  }
}

/**
 * Identifies a main run by its result files' names and write times, so reporting the same run twice (e.g. before and
 * after a rerun) updates one line, while a new run with identical outcomes still gets its own.
 */
export function runIdOf(files: ResultsFile[]): string {
  const sources = new Set(files.filter((file) => !file.rerun).map((file) => file.source));
  const stamps = fs
    .readdirSync(RESULTS_DIR)
    .filter((name) => /^results-.*\.json$/.test(name) && !name.includes('-rerun-'))
    .filter((name) => [...sources].some((source) => name.startsWith(`results-${source}-`)))
    .sort()
    .map((name) => `${name}@${fs.statSync(path.join(RESULTS_DIR, name)).mtimeMs}`);
  return crypto.createHash('sha1').update(stamps.join('\n')).digest('hex').slice(0, 12);
}

export function readHistory(): HistoryRun[] {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return fs
    .readFileSync(HISTORY_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as HistoryRun);
}

export function recordRun(files: ResultsFile[], classified: Classified[]): void {
  const runId = runIdOf(files);
  const previous = readHistory();
  const existing = previous.find((run) => run.runId === runId);
  const run: HistoryRun = {
    runId,
    at: existing?.at ?? new Date().toISOString(),
    build: existing?.build ?? currentBuild(),
    tests: classified.map(({ source, spec, title, outcome }) => ({ source, spec, title, outcome })),
  };
  const runs = existing ? previous.map((r) => (r.runId === runId ? run : r)) : [...previous, run];
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, runs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
