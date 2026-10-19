import { expect } from 'chai';
import { classifyRun, cleanTitle, unknownTagWarnings } from '../helpers/classify.js';
import { defectTagsIn } from '../helpers/knownDefects.js';
import type { ResultsFile, TestResult } from '../helpers/resultsFile.js';

const passed = (title: string): TestResult => ({ title, state: 'passed', isHook: false });
const failed = (title: string): TestResult => ({
  title,
  state: 'failed',
  isHook: false,
  error: 'AssertionError: boom\n  at x',
});
const skipped = (title: string): TestResult => ({ title, state: 'skipped', isHook: false });
const failedHook = (title: string): TestResult => ({ title, state: 'failed', isHook: true });

const run = (results: TestResult[], extra: Partial<ResultsFile> = {}): ResultsFile => ({
  source: 'ios',
  file: '/repo/e2e/specs/example.spec.ts',
  results,
  ...extra,
});
const rerun = (results: TestResult[]): ResultsFile => run(results, { rerun: true });

function outcomes(main: TestResult[], reruns: TestResult[][] = []): Record<string, string> {
  return Object.fromEntries(classifyRun([run(main), ...reruns.map(rerun)]).map((c) => [c.rawTitle, c.outcome]));
}

describe('unit: classify (what test:report counts as red or green)', () => {
  describe('tests that ran once', () => {
    it('an untagged pass is a pass', () => {
      expect(outcomes([passed('AC-3: shipping')])).to.deep.equal({ 'AC-3: shipping': 'pass' });
    });

    it('a failure tagged with a known defect is expected-red', () => {
      const title = 'AC-2: 25% off @known-defect SHOP-101-D1';
      expect(outcomes([failed(title)])[title]).to.equal('expected-red');
    });

    it('a pass tagged with a known defect is unexpectedly-green: the defect looks fixed', () => {
      const title = 'AC-2: 25% off @known-defect SHOP-101-D1';
      expect(outcomes([passed(title)])[title]).to.equal('unexpectedly-green');
    });

    it('an untagged failure with no rerun is new-red', () => {
      expect(outcomes([failed('AC-5: invalid code')])['AC-5: invalid code']).to.equal('new-red');
    });

    it('a failure tagged with an id that is not in knownDefects.ts is new-red, and warned about', () => {
      const title = 'AC-2: something @known-defect SHOP-101-D99';
      expect(outcomes([failed(title)])[title]).to.equal('new-red');
      expect(unknownTagWarnings('ios', failed(title)))
        .to.have.length(1)
        .and.to.match(/SHOP-101-D99/);
    });

    it('a skipped test is skipped, tagged or not', () => {
      expect(outcomes([skipped('a'), skipped('b @known-defect SHOP-101-D1')])).to.deep.equal({
        a: 'skipped',
        'b @known-defect SHOP-101-D1': 'skipped',
      });
    });
  });

  describe('reruns', () => {
    it('an untagged failure that passes on rerun is flaky, never green', () => {
      expect(outcomes([failed('t')], [[passed('t')]]).t).to.equal('flaky');
    });

    it('an untagged failure that fails again on rerun stays new-red', () => {
      expect(outcomes([failed('t')], [[failed('t')]]).t).to.equal('new-red');
    });

    it('a rerun of a different test does not rescue this one', () => {
      expect(outcomes([failed('t')], [[passed('other')]]).t).to.equal('new-red');
    });

    it('a rerun from another source or spec is not matched', () => {
      const classified = classifyRun([
        run([failed('t')]),
        run([passed('t')], { rerun: true, source: 'android' }),
        run([passed('t')], { rerun: true, file: '/repo/e2e/specs/other.spec.ts' }),
      ]);
      expect(classified.map((c) => c.outcome)).to.deep.equal(['new-red']);
    });

    it('reruns are never reported as tests of their own', () => {
      expect(classifyRun([run([failed('t')]), rerun([passed('t')])])).to.have.length(1);
    });
  });

  describe('setup hooks and crashed specs', () => {
    it('a failed setup hook is new-red, even in a spec full of tagged tests', () => {
      const title = '"before each" hook for "AC-2: 25% off @known-defect SHOP-101-D1"';
      expect(outcomes([failedHook(title)])[title]).to.equal('new-red');
    });

    it('a failed hook whose whole-spec rerun passes is flaky', () => {
      expect(outcomes([failedHook('hook')], [[passed('a'), failed('b @known-defect SHOP-101-D1')]]).hook).to.equal(
        'flaky',
      );
    });

    it('a failed hook whose rerun fails unexpectedly stays new-red', () => {
      expect(outcomes([failedHook('hook')], [[passed('a'), failed('b')]]).hook).to.equal('new-red');
    });

    it('a spec that reported no tests at all becomes a failed hook, so a crash can never look green', () => {
      const [only] = classifyRun([run([])]);
      expect(only.isHook).to.be.true;
      expect(only.outcome).to.equal('new-red');
    });
  });

  describe('titles and tags', () => {
    it('reads every defect tag in a title, in order', () => {
      expect(defectTagsIn('x @known-defect SHOP-101-D3 @known-defect SHOP-101-D1')).to.deep.equal([
        'SHOP-101-D3',
        'SHOP-101-D1',
      ]);
      expect(defectTagsIn('no tags here')).to.deep.equal([]);
    });

    it('strips tags for display but keeps the raw title as the matching key', () => {
      const title = 'AC-2: redirect @known-defect SHOP-101-D3 @known-defect SHOP-101-D1';
      expect(cleanTitle(title)).to.equal('AC-2: redirect');
      const [only] = classifyRun([run([failed(title)])]);
      expect(only).to.include({
        rawTitle: title,
        title: 'AC-2: redirect',
        spec: 'example.spec.ts',
        error: 'AssertionError: boom',
      });
      expect(only.defects).to.deep.equal(['SHOP-101-D3', 'SHOP-101-D1']);
    });
  });
});
