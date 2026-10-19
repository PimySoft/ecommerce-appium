import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { classifyRun } from '../helpers/classify.js';
import { clearReruns, readResults } from '../helpers/resultsFile.js';

const wanted = process.argv.slice(2);
const files = readResults().filter((file) => !file.rerun && (wanted.length === 0 || wanted.includes(file.source)));
const failed = classifyRun(files).filter((row) => row.outcome === 'new-red');

if (failed.length === 0) {
  console.log('Nothing to rerun: the last run has no new-red tests.');
  process.exit(0);
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const grepFor = (titles: string[]): string => titles.map(escape).join('|');
const env = { ...process.env, E2E_RERUN: '1' };

function run(command: string, args: string[]): void {
  console.log(`\n$ ${command} ${args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(' ')}`);
  spawnSync(command, args, { stdio: 'inherit', env });
}

for (const source of [...new Set(failed.map((row) => row.source))]) {
  const rows = failed.filter((row) => row.source === source);
  clearReruns(source);
  console.log(`\nRerunning ${rows.length} new-red result(s) from ${source} once`);

  if (source === 'api') {
    // The API specs take about a second, so one run filtered by title is enough.
    const grep = rows.some((row) => row.isHook) ? [] : ['--grep', grepFor(rows.map((row) => row.rawTitle))];
    run('npm', ['run', 'test:api', '--', ...grep]);
    continue;
  }

  const bySpec = new Map<string, typeof rows>();
  for (const row of rows) bySpec.set(row.spec, [...(bySpec.get(row.spec) ?? []), row]);
  for (const [spec, specRows] of bySpec) {
    const specPath = path.join('specs', spec);
    const grep = specRows.some((row) => row.isHook)
      ? []
      : ['--mochaOpts.grep', grepFor(specRows.map((row) => row.rawTitle))];
    run('npx', ['wdio', 'run', `./wdio.${source}.conf.ts`, '--spec', specPath, ...grep]);
  }
}

console.log('\nReruns done. Run `npm run test:report` to see which failures were flaky.');
