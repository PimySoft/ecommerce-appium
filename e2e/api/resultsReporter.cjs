// Mocha reporter for the API specs: the normal spec output, plus the raw titles and outcomes written to
// logs/results-api-<spec>.json (one file per spec, so the report can group by spec) for scripts/defect-report.ts (same file format as helpers/resultsReporter.ts).
const fs = require('node:fs');
const path = require('node:path');
const { reporters, Runner } = require('mocha');

const { EVENT_TEST_PASS, EVENT_TEST_FAIL, EVENT_TEST_PENDING, EVENT_RUN_BEGIN, EVENT_RUN_END } = Runner.constants;

class ResultsReporter extends reporters.Spec {
  constructor(runner, options) {
    super(runner, options);
    /** Spec file path -> that file's results. */
    const bySpec = new Map();
    const record = (test, result) => {
      const spec = test.file || (test.parent && test.parent.file) || 'unknown';
      if (!bySpec.has(spec)) bySpec.set(spec, []);
      bySpec.get(spec).push(result);
    };
    const logsDir = path.resolve('logs');
    // Same naming and clearing rules as helpers/resultsFile.ts: a rerun keeps the main run's files and adds `-rerun-` ones.
    const rerun = process.env.E2E_RERUN === '1';
    const ownFiles = rerun ? /^results-api-rerun(-.*)?\.json$/ : /^results-api(-.*)?\.json$/;

    runner.on(EVENT_RUN_BEGIN, () => {
      for (const name of fs.existsSync(logsDir) ? fs.readdirSync(logsDir) : []) {
        if (ownFiles.test(name)) fs.rmSync(path.join(logsDir, name), { force: true });
      }
    });
    runner.on(EVENT_TEST_PASS, (test) => record(test, { title: test.title, state: 'passed', isHook: false }));
    runner.on(EVENT_TEST_PENDING, (test) => record(test, { title: test.title, state: 'skipped', isHook: false }));
    runner.on(EVENT_TEST_FAIL, (test, err) =>
      record(test, { title: test.title, state: 'failed', isHook: test.type === 'hook', error: err && err.message }),
    );
    runner.on(EVENT_RUN_END, () => {
      fs.mkdirSync(logsDir, { recursive: true });
      for (const [spec, results] of bySpec) {
        const name = `results-api${rerun ? '-rerun' : ''}-${path.basename(spec).replace(/\.[^.]+$/, '')}.json`;
        const contents = { source: 'api', file: spec, ...(rerun ? { rerun: true } : {}), results };
        fs.writeFileSync(path.join(logsDir, name), JSON.stringify(contents, null, 2));
      }
    });
  }
}

module.exports = ResultsReporter;
