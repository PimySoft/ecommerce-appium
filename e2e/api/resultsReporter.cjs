// Writes logs/results-api-<spec>.json in the format helpers/resultsReporter.ts uses, for scripts/defect-report.ts.
const fs = require('node:fs');
const path = require('node:path');
const { reporters, Runner } = require('mocha');

const { EVENT_TEST_PASS, EVENT_TEST_FAIL, EVENT_TEST_PENDING, EVENT_RUN_BEGIN, EVENT_RUN_END } = Runner.constants;

class ResultsReporter extends reporters.Spec {
  constructor(runner, options) {
    super(runner, options);
    const bySpec = new Map();
    const record = (test, result) => {
      const spec = test.file || (test.parent && test.parent.file) || 'unknown';
      if (!bySpec.has(spec)) bySpec.set(spec, []);
      bySpec.get(spec).push(result);
    };
    const logsDir = path.resolve('logs');
    const ownFiles = /^results-api(-.*)?\.json$/;

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
        const name = `results-api-${path.basename(spec).replace(/\.[^.]+$/, '')}.json`;
        const contents = { source: 'api', file: spec, results };
        fs.writeFileSync(path.join(logsDir, name), JSON.stringify(contents, null, 2));
      }
    });
  }
}

module.exports = ResultsReporter;
