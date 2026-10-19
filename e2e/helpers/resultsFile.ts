import fs from 'node:fs';
import path from 'node:path';

/** One line of a run's outcome, written by the WebdriverIO and Mocha reporters and read by `scripts/defect-report.ts`. */
export interface TestResult {
  title: string;
  state: 'passed' | 'failed' | 'skipped';
  /** A failed `before`/`beforeEach` hook is not a test failure: it is never treated as a known defect. */
  isHook: boolean;
  error?: string;
}

export interface ResultsFile {
  /** `ios`, `android` or `api`. */
  source: string;
  file?: string;
  /** Written by `npm run test:rerun-failed`: a second attempt at the main run's failures, never a replacement for them. */
  rerun?: boolean;
  results: TestResult[];
}

export const RESULTS_DIR = path.resolve('logs');

/** Set by `scripts/rerun-failed.ts` for the processes it starts. */
export const isRerun = (): boolean => process.env.E2E_RERUN === '1';

/**
 * `results-<source>-<worker>.json` for a main run, `results-<source>-rerun-<spec>-<worker>.json` for a rerun: reruns
 * are one process per spec, all with worker id 0-0, so the spec name keeps them apart.
 */
export const resultsFileName = (source: string, worker: string, spec?: string): string =>
  isRerun()
    ? `results-${source}-rerun-${path.basename(spec ?? 'unknown').replace(/\.spec\.ts$/, '')}-${worker}.json`
    : `results-${source}-${worker}.json`;

const resultsFilePattern = (source: string, rerunOnly: boolean): RegExp =>
  new RegExp(`^results-${source}${rerunOnly ? '-rerun' : ''}(-.*)?\\.json$`);

export function writeResults(name: string, contents: ResultsFile): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RESULTS_DIR, name), JSON.stringify({ ...contents, rerun: isRerun() || undefined }, null, 2));
}

/**
 * Removes a source's earlier result files so a report covers one run only: the main results and any reruns of them.
 * A rerun clears nothing here: `scripts/rerun-failed.ts` runs one process per spec, so it clears the old reruns once
 * itself (`clearReruns`) before starting them, and each rerun file is named after its spec.
 */
export function clearResults(source: string): void {
  if (isRerun() || !fs.existsSync(RESULTS_DIR)) return;
  for (const name of fs.readdirSync(RESULTS_DIR)) {
    if (resultsFilePattern(source, false).test(name)) fs.rmSync(path.join(RESULTS_DIR, name), { force: true });
  }
}

export function clearReruns(source: string): void {
  if (!fs.existsSync(RESULTS_DIR)) return;
  for (const name of fs.readdirSync(RESULTS_DIR)) {
    if (resultsFilePattern(source, true).test(name)) fs.rmSync(path.join(RESULTS_DIR, name), { force: true });
  }
}

export function readResults(): ResultsFile[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  return fs
    .readdirSync(RESULTS_DIR)
    .filter((name) => /^results-.*\.json$/.test(name))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, name), 'utf8')) as ResultsFile);
}

/** The spec's file name, however the reporter spelled its path (`file://` URL or absolute path). */
export const specName = (file: ResultsFile): string => path.basename(file.file ?? 'unknown');
