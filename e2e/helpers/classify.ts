import { defectTagsIn, knownDefects } from './knownDefects.js';
import { specName, type ResultsFile, type TestResult } from './resultsFile.js';

export type Outcome = 'pass' | 'expected-red' | 'new-red' | 'unexpectedly-green' | 'flaky' | 'skipped';

export interface Classified {
  source: string;
  spec: string;
  rawTitle: string;
  title: string;
  isHook: boolean;
  outcome: Outcome;
  defects: string[];
  rerunState?: TestResult['state'];
  error?: string;
}

export const cleanTitle = (title: string): string => title.replace(/\s*@known-defect\s+SHOP-101-D\d+/g, '').trim();

const firstLine = (text?: string): string | undefined =>
  text
    ?.split('\n')
    .find((line) => line.trim())
    ?.trim();

export function unknownTagWarnings(source: string, result: TestResult): string[] {
  if (result.isHook) return [];
  const defects = defectTagsIn(result.title).filter((id) => !(id in knownDefects));
  return defects.map(
    (id) => `[${source}] "${cleanTitle(result.title)}" names ${id}, which is not in helpers/knownDefects.ts`,
  );
}

const isUnexpectedFailure = (r: TestResult): boolean =>
  r.state === 'failed' && (r.isHook || !defectTagsIn(r.title).some((id) => id in knownDefects));

function rerunStateOf(result: TestResult, retried: TestResult[]): TestResult['state'] | undefined {
  if (!result.isHook) return retried.find((r) => !r.isHook && r.title === result.title)?.state;
  // A failed hook stopped its spec, so the rerun is the whole spec.
  if (retried.length === 0) return undefined;
  if (retried.some(isUnexpectedFailure)) return 'failed';
  if (retried.some((r) => r.state === 'passed')) return 'passed';
  return 'skipped';
}

export function classifyRun(files: ResultsFile[]): Classified[] {
  const main = files.filter((file) => !file.rerun);
  const reruns = files.filter((file) => file.rerun);
  const rerunsOf = (source: string, spec: string) =>
    reruns.filter((file) => file.source === source && specName(file) === spec).flatMap((file) => file.results);

  // A spec that reported nothing must not look green.
  const noTests = (file: ResultsFile): TestResult[] =>
    file.results.length > 0
      ? file.results
      : [
          {
            title: 'spec reported no tests (session never started?)',
            state: 'failed',
            isHook: true,
            error: "No results in this spec's results file",
          },
        ];

  return main.flatMap((file) =>
    noTests(file).map((result): Classified => {
      const spec = specName(file);
      const defects = result.isHook ? [] : defectTagsIn(result.title).filter((id) => id in knownDefects);
      const rerunState = rerunStateOf(result, rerunsOf(file.source, spec));

      let outcome: Outcome;
      if (result.state === 'skipped') outcome = 'skipped';
      else if (result.state === 'passed') outcome = defects.length > 0 ? 'unexpectedly-green' : 'pass';
      else if (defects.length > 0) outcome = 'expected-red';
      else outcome = rerunState === 'passed' ? 'flaky' : 'new-red';

      return {
        source: file.source,
        spec,
        rawTitle: result.title,
        title: cleanTitle(result.title),
        isHook: result.isHook,
        outcome,
        defects,
        rerunState,
        error: firstLine(result.error),
      };
    }),
  );
}
