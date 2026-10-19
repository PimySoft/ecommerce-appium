/**
 * Sorts the results of the last run (plus any `test:rerun-failed` rerun) into:
 *   expected-red        failed, and tagged `@known-defect SHOP-101-D<n>`: still broken as documented
 *   new-red             failed without a tag (or a failed setup hook), and did not pass on rerun: a regression or a new defect
 *   unexpectedly-green  passed, but tagged: the defect is probably fixed, so the tag should go
 *   flaky               failed, then passed on rerun: reported as flaky, never as green (policy: e2e/README.md "Flaky tests")
 * plus a quarantine section for `@flaky SHOP-101-F<n>` tests, with each entry's owner and days to expiry.
 * Every report also records the run in logs/history/runs.jsonl for `npm run test:flake-rate`.
 *
 * Usage: npm run test:report [-- ios android api]   (default: every results file in logs/)
 * Exit code: 0 when nothing gates; 1 on any new-red, unexpectedly-green or expired quarantine; 2 when there are no results.
 * Flaky and quarantined failures are listed but do not gate.
 */
import { classifyRun, unknownTagWarnings, type Classified, type Outcome } from '../helpers/classify.js';
import { daysToExpiry, flakyTests } from '../helpers/flakyTests.js';
import { knownDefects } from '../helpers/knownDefects.js';
import { readResults } from '../helpers/resultsFile.js';
import { recordRun } from '../helpers/runHistory.js';

const wanted = process.argv.slice(2);
const files = readResults().filter((file) => wanted.length === 0 || wanted.includes(file.source));

if (files.filter((file) => !file.rerun).length === 0) {
  console.error('No results found in logs/. Run a suite first (npm run test:api, test:ios or test:android).');
  process.exit(2);
}

const rows = classifyRun(files);
recordRun(files, rows);

const warnings = files.filter((file) => !file.rerun).flatMap((file) => file.results.flatMap((r) => unknownTagWarnings(file.source, r)));
const where = (outcome: Outcome) => rows.filter((row) => row.outcome === outcome);
const count = (outcome: Outcome, source: string) => where(outcome).filter((row) => row.source === source).length;

console.log('\nSHOP-101 known-defect report\n');
for (const source of [...new Set(rows.map((row) => row.source))]) {
  const parts = [
    `${String(count('pass', source)).padStart(3)} pass`,
    `${String(count('expected-red', source)).padStart(3)} expected-red`,
    `${String(count('new-red', source)).padStart(3)} new-red`,
    `${String(count('unexpectedly-green', source)).padStart(3)} unexpectedly-green`,
    `${String(count('flaky', source)).padStart(3)} flaky`,
  ];
  if (count('quarantined', source)) parts.push(`${count('quarantined', source)} quarantined-red`);
  if (count('skipped', source)) parts.push(`${count('skipped', source)} skipped`);
  console.log(`  ${source.padEnd(8)} ${parts.join(' · ')}`);
}

function section(heading: string, list: Classified[], detail: (row: Classified) => string | undefined): void {
  if (list.length === 0) return;
  console.log(`\n${heading} (${list.length})`);
  for (const row of list) {
    console.log(`  [${row.source}] ${row.title}`);
    const extra = detail(row);
    if (extra) console.log(`      ${extra}`);
  }
}

section('NEW RED: failing without a known-defect tag, investigate', where('new-red'), (row) =>
  [row.error, row.rerunState === 'failed' ? '(failed again on rerun)' : undefined].filter(Boolean).join(' '),
);
section(
  'UNEXPECTEDLY GREEN: tagged test now passes, is the defect fixed? Remove its tag',
  where('unexpectedly-green'),
  (row) => row.defects.join(', '),
);
section(
  'FLAKY: failed, then passed on rerun with no code change. Not green; see `npm run test:flake-rate`',
  where('flaky'),
  (row) => row.error,
);

const expectedRed = where('expected-red');
if (expectedRed.length > 0) {
  console.log(`\nEXPECTED RED: known defects (${expectedRed.length})`);
  for (const [id, description] of Object.entries(knownDefects)) {
    const matching = expectedRed.filter((row) => row.defects.includes(id));
    if (matching.length === 0) continue;
    console.log(`  ${id}: ${description}`);
    for (const row of matching) console.log(`    [${row.source}] ${row.title}`);
  }
}

const expired: string[] = [];
if (Object.keys(flakyTests).length > 0) {
  console.log(`\nQUARANTINE: @flaky tests run and are reported, but do not gate (${Object.keys(flakyTests).length})`);
  for (const [id, entry] of Object.entries(flakyTests)) {
    const days = daysToExpiry(entry);
    if (days < 0) expired.push(id);
    const status = days < 0 ? `EXPIRED (last valid day ${entry.expires})` : `${days} day(s) to expiry`;
    console.log(`  ${id}: ${status} · owner ${entry.owner} · ${entry.ticket} · ${entry.reason}`);
    const tagged = rows.filter((row) => row.quarantine.includes(id));
    if (tagged.length === 0) warnings.push(`${id} is in helpers/flakyTests.ts but no test in this run carries its tag`);
    for (const row of tagged) console.log(`    [${row.source}] ${row.title}: ${row.outcome === 'quarantined' ? 'failed' : row.outcome}`);
  }
}

for (const warning of warnings) console.warn(`\nwarning: ${warning}`);

const gating = where('new-red').length + where('unexpectedly-green').length + expired.length;
if (gating === 0) {
  const notes = [
    where('flaky').length ? `${where('flaky').length} flaky` : '',
    where('quarantined').length ? `${where('quarantined').length} quarantined-red` : '',
  ].filter(Boolean);
  console.log(
    `\nNo new failures. Every red test is a documented known defect${notes.length ? ` (not gating: ${notes.join(', ')})` : ''}.`,
  );
} else {
  console.log(
    `\n${where('new-red').length} new-red, ${where('unexpectedly-green').length} unexpectedly-green, ${expired.length} expired quarantine.`,
  );
}
process.exit(gating === 0 ? 0 : 1);
