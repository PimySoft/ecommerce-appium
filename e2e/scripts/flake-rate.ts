/**
 * Flake rate per test from logs/history/runs.jsonl (written by every `npm run test:report`).
 *
 * A flake event, per the policy in e2e/README.md, is a run where a test failed although it can pass on the same build:
 *   - it was classified `flaky` (failed, then passed on rerun), or
 *   - it failed (new-red or quarantined) on a build where it also passed in another run in the window.
 * Known defects are never flakes: they fail every time.
 *
 * Usage: npm run test:flake-rate [-- --window 20 --threshold 2]
 * Exit code 1 when a test that is not quarantined flaked more than the threshold within the window: quarantine it
 * (`@flaky SHOP-101-F<n>` + an entry in helpers/flakyTests.ts) and open a root-cause ticket.
 */
import { flakyTagsIn } from '../helpers/flakyTests.js';
import { readResults } from '../helpers/resultsFile.js';
import { readHistory } from '../helpers/runHistory.js';

const arg = (name: string, fallback: number): number => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? Number(process.argv[index + 1]) : fallback;
};
const WINDOW = arg('window', 20);
const THRESHOLD = arg('threshold', 2);

const history = readHistory();
if (history.length === 0) {
  console.error('No run history yet. It is written by `npm run test:report` after each run.');
  process.exit(2);
}

// The newest WINDOW runs that include each test, then count its flake events within them.
const keyOf = (t: { source: string; spec: string; title: string }) => `${t.source}\u0000${t.spec}\u0000${t.title}`;
const perTest = new Map<string, Array<{ build: string; outcome: string }>>();
for (const run of history) {
  for (const test of run.tests) perTest.set(keyOf(test), [...(perTest.get(keyOf(test)) ?? []), { build: run.build, outcome: test.outcome }]);
}

// Quarantined titles from the latest results, matched without their tags.
const quarantined = new Set(
  readResults()
    .flatMap((file) => file.results.map((r) => ({ source: file.source, title: r.title })))
    .filter((r) => flakyTagsIn(r.title).length > 0)
    .map((r) => `${r.source}\u0000${r.title.replace(/\s*@(known-defect|flaky)\s+SHOP-101-[DF]\d+/g, '').trim()}`),
);

const rows = [...perTest].map(([key, all]) => {
  const runs = all.slice(-WINDOW);
  const passedOn = new Set(runs.filter((r) => r.outcome === 'pass').map((r) => r.build));
  const flakes = runs.filter(
    (r) => r.outcome === 'flaky' || ((r.outcome === 'new-red' || r.outcome === 'quarantined') && passedOn.has(r.build)),
  ).length;
  const [source, spec, title] = key.split('\u0000');
  return { source, spec, title, runs: runs.length, flakes, quarantined: quarantined.has(`${source}\u0000${title}`) };
});

const flaky = rows.filter((row) => row.flakes > 0).sort((a, b) => b.flakes - a.flakes);
console.log(`\nFlake rate over the last ${WINDOW} runs per test (${history.length} runs recorded)\n`);
if (flaky.length === 0) console.log('  No flake events recorded.');
for (const row of flaky) {
  const flag = row.flakes > THRESHOLD ? (row.quarantined ? '  quarantined' : '  OVER THRESHOLD: quarantine + root-cause ticket') : '';
  console.log(`  ${row.flakes}/${row.runs}  [${row.source}] ${row.spec} › ${row.title}${flag}`);
}

const overdue = flaky.filter((row) => row.flakes > THRESHOLD && !row.quarantined);
process.exit(overdue.length > 0 ? 1 : 0);
