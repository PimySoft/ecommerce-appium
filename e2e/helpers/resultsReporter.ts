import WDIOReporter, { type HookStats, type RunnerStats, type TestStats } from '@wdio/reporter';
import { resultsFileName, writeResults, type TestResult } from './resultsFile.js';

// The JUnit reporter rewrites titles ("AC-2:" becomes "AC 2"), which loses the `@known-defect` tags.
export default class ResultsReporter extends WDIOReporter {
  private results: TestResult[] = [];
  private source = 'device';
  private cid = '0-0';
  private file?: string;

  onRunnerStart(runner: RunnerStats): void {
    this.cid = runner.cid;
    this.source = String((runner.capabilities as { platformName?: string }).platformName ?? 'device').toLowerCase();
    this.file = runner.specs?.[0];
  }

  onTestPass(test: TestStats): void {
    this.results.push({ title: test.title, state: 'passed', isHook: false });
  }

  onTestFail(test: TestStats): void {
    this.results.push({ title: test.title, state: 'failed', isHook: false, error: test.error?.message });
  }

  onTestSkip(test: TestStats): void {
    this.results.push({ title: test.title, state: 'skipped', isHook: false });
  }

  onHookEnd(hook: HookStats): void {
    if (hook.error) this.results.push({ title: hook.title, state: 'failed', isHook: true, error: hook.error.message });
  }

  onRunnerEnd(): void {
    writeResults(resultsFileName(this.source, this.cid, this.file), {
      source: this.source,
      file: this.file,
      results: this.results,
    });
  }
}
