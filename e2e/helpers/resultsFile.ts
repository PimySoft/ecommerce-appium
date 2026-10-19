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
  results: TestResult[];
}

export const RESULTS_DIR = path.resolve('logs');

export const resultsFileName = (source: string, worker: string): string => `results-${source}-${worker}.json`;

export function writeResults(name: string, contents: ResultsFile): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RESULTS_DIR, name), JSON.stringify(contents, null, 2));
}

export function clearResults(source: string): void {
  if (!fs.existsSync(RESULTS_DIR)) return;
  for (const name of fs.readdirSync(RESULTS_DIR)) {
    if (new RegExp(`^results-${source}(-.*)?\\.json$`).test(name))
      fs.rmSync(path.join(RESULTS_DIR, name), { force: true });
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
