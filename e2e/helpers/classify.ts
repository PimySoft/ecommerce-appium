import { defectTagsIn, knownDefects } from './knownDefects.js';
import { flakyTagsIn, flakyTests } from './flakyTests.js';
import { specName, type ResultsFile, type TestResult } from './resultsFile.js';

/**
 * What one test (or failed setup hook) of the main run amounts to, after looking at its tags and at any rerun:
 *   pass                 passed first time
 *   expected-red         failed, tagged `@known-defect`: still broken as documented
 *   new-red              failed without a tag (or a failed setup hook), and did not pass on rerun
 *   unexpectedly-green   passed, but tagged `@known-defect`: the defect is probably fixed
 *   flaky                failed, then passed on `test:rerun-failed` with no code change: reported, never counted green
 *   quarantined          failed, tagged `@flaky` with a valid quarantine entry: reported, does not gate
 *   skipped
 */
export type Outcome = 'pass' | 'expected-red' | 'new-red' | 'unexpectedly-green' | 'flaky' | 'quarantined' | 'skipped';

export interface Classified {
  source: string;
  spec: string;
  /** Title as written, tags included: the key that history and reruns match on. */
  rawTitle: string;
  /** Title without tags, for display. */
  title: string;
  isHook: boolean;
  outcome: Outcome;
  defects: string[];
  quarantine: string[];
  /** The rerun's state for this test, when it was rerun. */
  rerunState?: TestResult['state'];
  error?: string;
}

export const cleanTitle = (title: string): string =>
  title.replace(/\s*@known-defect\s+SHOP-101-D\d+/g, '').replace(/\s*@flaky\s+SHOP-101-F\d+/g, '').trim();

const firstLine = (text?: string): string | undefined => text?.split('\n').find((line) => line.trim())?.trim();

/** Tag ids that name no entry in `knownDefects.ts` / `flakyTests.ts`, as readable warnings. */
export function unknownTagWarnings(source: string, result: TestResult): string[] {
  if (result.isHook) return [];
  const defects = defectTagsIn(result.title).filter((id) => !(id in knownDefects));
  const flaky = flakyTagsIn(result.title).filter((id) => !(id in flakyTests));
  return [
    ...defects.map((id) => `[${source}] "${cleanTitle(result.title)}" names ${id}, which is not in helpers/knownDefects.ts`),
    ...flaky.map((id) => `[${source}] "${cleanTitle(result.title)}" names ${id}, which is not in helpers/flakyTests.ts`),
  ];
}

/** A known-defect test fails every time by design, so only other failures count against a rerun. */
const isUnexpectedFailure = (r: TestResult): boolean =>
  r.state === 'failed' && (r.isHook || !defectTagsIn(r.title).some((id) => id in knownDefects));

/** How `result` did on `test:rerun-failed`, or undefined when it was not rerun. */
function rerunStateOf(result: TestResult, retried: TestResult[]): TestResult['state'] | undefined {
  if (!result.isHook) return retried.find((r) => !r.isHook && r.title === result.title)?.state;
  // A failed hook stopped the spec, so its rerun is the whole spec: it passes when the setup ran and nothing
  // failed unexpectedly.
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

  // A spec that reported nothing (its session never started, or the worker died before any test) is never silently
  // green: it gets a synthetic failed hook, which is always new-red.
  const noTests = (file: ResultsFile): TestResult[] =>
    file.results.length > 0
      ? file.results
      : [{ title: 'spec reported no tests (session never started?)', state: 'failed', isHook: true, error: 'No results in this spec\'s results file' }];

  return main.flatMap((file) =>
    noTests(file).map((result): Classified => {
      const spec = specName(file);
      const defects = result.isHook ? [] : defectTagsIn(result.title).filter((id) => id in knownDefects);
      const quarantine = result.isHook ? [] : flakyTagsIn(result.title).filter((id) => id in flakyTests);
      const rerunState = rerunStateOf(result, rerunsOf(file.source, spec));

      let outcome: Outcome;
      if (result.state === 'skipped') outcome = 'skipped';
      else if (result.state === 'passed') outcome = defects.length > 0 ? 'unexpectedly-green' : 'pass';
      else if (defects.length > 0) outcome = 'expected-red';
      else if (quarantine.length > 0) outcome = 'quarantined';
      else outcome = rerunState === 'passed' ? 'flaky' : 'new-red';

      return {
        source: file.source,
        spec,
        rawTitle: result.title,
        title: cleanTitle(result.title),
        isHook: result.isHook,
        outcome,
        defects,
        quarantine,
        rerunState,
        error: firstLine(result.error),
      };
    }),
  );
}
