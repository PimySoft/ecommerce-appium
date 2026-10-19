import { classifyRun, unknownTagWarnings, type Classified, type Outcome } from '../helpers/classify.js';
import { knownDefects } from '../helpers/knownDefects.js';
import { readResults } from '../helpers/resultsFile.js';

const wanted = process.argv.slice(2);
const files = readResults().filter((file) => wanted.length === 0 || wanted.includes(file.source));

if (files.length === 0) {
  console.error('No results found in logs/. Run a suite first (npm run test:api, test:ios or test:android).');
  process.exit(2);
}

const rows = classifyRun(files);
const warnings = files.flatMap((file) => file.results.flatMap((r) => unknownTagWarnings(file.source, r)));
const where = (outcome: Outcome) => rows.filter((row) => row.outcome === outcome);
const count = (outcome: Outcome, source: string) => where(outcome).filter((row) => row.source === source).length;

console.log('\nSHOP-101 known-defect report\n');
for (const source of [...new Set(rows.map((row) => row.source))]) {
  const parts = [
    `${String(count('pass', source)).padStart(3)} pass`,
    `${String(count('expected-red', source)).padStart(3)} expected-red`,
    `${String(count('new-red', source)).padStart(3)} new-red`,
    `${String(count('unexpectedly-green', source)).padStart(3)} unexpectedly-green`,
  ];
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

section('NEW RED: failing without a known-defect tag, investigate', where('new-red'), (row) => row.error);
section(
  'UNEXPECTEDLY GREEN: tagged test now passes, is the defect fixed? Remove its tag',
  where('unexpectedly-green'),
  (row) => row.defects.join(', '),
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

for (const warning of warnings) console.warn(`\nwarning: ${warning}`);

const gating = where('new-red').length + where('unexpectedly-green').length;
console.log(
  gating === 0
    ? '\nNo new failures. Every red test is a documented known defect.'
    : `\n${where('new-red').length} new-red, ${where('unexpectedly-green').length} unexpectedly-green.`,
);
process.exit(gating === 0 ? 0 : 1);
