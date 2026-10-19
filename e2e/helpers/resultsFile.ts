import fs from 'node:fs';
import path from 'node:path';

export interface TestResult {
  title: string;
  state: 'passed' | 'failed' | 'skipped';
  isHook: boolean;
  error?: string;
}

export interface ResultsFile {
  source: string;
  file?: string;
  rerun?: boolean;
  results: TestResult[];
}

export const RESULTS_DIR = path.resolve('logs');

export const isRerun = (): boolean => process.env.E2E_RERUN === '1';

// Every rerun process has worker id 0-0, so rerun files are told apart by spec name.
export const resultsFileName = (source: string, worker: string, spec?: string): string =>
  isRerun()
    ? `results-${source}-rerun-${path.basename(spec ?? 'unknown').replace(/\.spec\.ts$/, '')}-${worker}.json`
    : `results-${source}-${worker}.json`;

const resultsFilePattern = (source: string, rerunOnly: boolean): RegExp =>
  new RegExp(`^results-${source}${rerunOnly ? '-rerun' : ''}(-.*)?\\.json$`);

export function writeResults(name: string, contents: ResultsFile): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RESULTS_DIR, name),
    JSON.stringify({ ...contents, rerun: isRerun() || undefined }, null, 2),
  );
}

// A rerun runs one process per spec, so scripts/rerun-failed.ts clears old reruns once itself (clearReruns).
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

// Reporters spell the path either as a file:// URL or as an absolute path.
export const specName = (file: ResultsFile): string => path.basename(file.file ?? 'unknown');
