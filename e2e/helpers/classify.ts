import { defectTagsIn, knownDefects } from './knownDefects.js';
import { specName, type ResultsFile, type TestResult } from './resultsFile.js';

export type Outcome = 'pass' | 'expected-red' | 'new-red' | 'unexpectedly-green' | 'skipped';

export interface Classified {
  source: string;
  spec: string;
  rawTitle: string;
  title: string;
  isHook: boolean;
  outcome: Outcome;
  defects: string[];
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
  return defectTagsIn(result.title)
    .filter((id) => !(id in knownDefects))
    .map((id) => `[${source}] "${cleanTitle(result.title)}" names ${id}, which is not in helpers/knownDefects.ts`);
}

export function classifyRun(files: ResultsFile[]): Classified[] {
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

  return files.flatMap((file) =>
    noTests(file).map((result): Classified => {
      const defects = result.isHook ? [] : defectTagsIn(result.title).filter((id) => id in knownDefects);

      let outcome: Outcome;
      if (result.state === 'skipped') outcome = 'skipped';
      else if (result.state === 'passed') outcome = defects.length > 0 ? 'unexpectedly-green' : 'pass';
      else outcome = defects.length > 0 ? 'expected-red' : 'new-red';

      return {
        source: file.source,
        spec: specName(file),
        rawTitle: result.title,
        title: cleanTitle(result.title),
        isHook: result.isHook,
        outcome,
        defects,
        error: firstLine(result.error),
      };
    }),
  );
}
