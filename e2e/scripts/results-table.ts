/**
 * Prints a per-spec results table (Markdown) from the last run's `logs/results-*.json`, so pass/fail
 * status is generated from a run instead of hand-written into the README.
 *
 * Usage: npm run test:table
 * A cell reads "n/m pass" plus, when tests failed, how many were known defects, flaky (passed on rerun),
 * quarantined, and new-red. A blank cell ("-") means that spec was not part of the run for that source.
 * Results from every device a platform ran on are merged into that platform's column.
 */
import fs from 'node:fs';
import path from 'node:path';
import { classifyRun, type Classified } from '../helpers/classify.js';
import { RESULTS_DIR, readResults } from '../helpers/resultsFile.js';

const files = readResults();
if (files.filter((file) => !file.rerun).length === 0) {
  console.error('No results found in logs/. Run a suite first (npm run test:api, test:ios or test:android).');
  process.exit(2);
}

const rows = classifyRun(files);
const sources = ['ios', 'android', 'api'].filter((source) => rows.some((row) => row.source === source));

/** A failed hook is never excused by a tag, and a pass on rerun is flaky, not a pass. */
function cell(results: Classified[]): string {
  const tests = results.filter((row) => !row.isHook);
  const n = (outcome: Classified['outcome']) => results.filter((row) => row.outcome === outcome).length;
  const parts = [`${n('pass') + n('unexpectedly-green')}/${tests.length} pass`];
  if (n('expected-red') > 0) parts.push(`${n('expected-red')} known defect`);
  if (n('flaky') > 0) parts.push(`${n('flaky')} flaky`);
  if (n('quarantined') > 0) parts.push(`${n('quarantined')} quarantined`);
  if (n('new-red') > 0) parts.push(`**${n('new-red')} new-red**`);
  return parts.join(', ');
}

const specs = [...new Set(rows.map((row) => row.spec))].sort();
const newestRun = Math.max(
  ...fs
    .readdirSync(RESULTS_DIR)
    .filter((name) => /^results-.*\.json$/.test(name))
    .map((name) => fs.statSync(path.join(RESULTS_DIR, name)).mtimeMs),
);

console.log(`| Spec | ${sources.join(' | ')} |`);
console.log(`|---|${sources.map(() => '---').join('|')}|`);
for (const spec of specs) {
  const cells = sources.map((source) => {
    const matching = rows.filter((row) => row.source === source && row.spec === spec);
    return matching.length === 0 ? '-' : cell(matching);
  });
  console.log(`| \`${spec}\` | ${cells.join(' | ')} |`);
}
console.log(`\nGenerated from logs/results-*.json (newest ${new Date(newestRun).toISOString()}).`);
