import type { Services } from '@wdio/types';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clearRetryLogs, summariseRetries } from './helpers/retryLog.js';
import ResultsReporter from './helpers/resultsReporter.js';
import { clearResults, resultsFileName, writeResults } from './helpers/resultsFile.js';
import { MOCHA_TIMEOUT } from './helpers/timeouts.js';

// Use a user-owned APPIUM_HOME: a root-owned ~/.appium stops xcodebuild writing
// WebDriverAgent output. Install drivers here with `appium driver install xcuitest|uiautomator2`.
process.env.APPIUM_HOME ||= path.join(os.homedir(), '.appium-e2e');

const LOGS_DIR = path.resolve('logs');

/** The launcher's capabilities, kept from `onPrepare` so `onWorkerEnd` can tell which platform a worker id ran. */
let launchedCapabilities: Array<{ platformName?: string }> = [];

/**
 * The Appium server for one platform. Each gets its own port and log folder so the iOS and Android suites can run at
 * the same time: left to itself, the service probes for a free port from 4723 and two launchers race for it.
 */
export const appiumService = (name: string, port: number): Services.ServiceEntry => [
  'appium',
  {
    // Resolve appium from PATH; the service's default lookup fails for the hoisted install.
    command: 'appium',
    args: { port },
    // A rerun gets its own folder so it does not overwrite the main run's log.
    logPath: path.join(LOGS_DIR, `appium-${name}${process.env.E2E_RERUN === '1' ? '-rerun' : ''}`),
  },
];

const slug = (text: string): string => text.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);

async function captureDiagnostics(test: { file?: string; title: string }): Promise<void> {
  const name = [
    slug(path.basename(test.file ?? 'spec', '.ts')),
    slug(test.title),
    driver.isAndroid ? 'android' : 'ios',
    // Worker id, so two workers never write the same file.
    process.env.WDIO_WORKER_ID ?? '0-0',
  ].join('__');
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    await driver.saveScreenshot(path.join(LOGS_DIR, `${name}.png`));
    fs.writeFileSync(path.join(LOGS_DIR, `${name}.xml`), await driver.getPageSource());
  } catch (err) {
    // Diagnostics must never replace the real test failure.
    console.warn(`Could not capture failure diagnostics for "${test.title}": ${err}`);
  }
}

export const config: Partial<WebdriverIO.Config> = {
  runner: 'local',

  specs: ['./specs/**/*.spec.ts'],
  exclude: [],

  maxInstances: 1,

  logLevel: 'info',
  bail: 0,
  // Flaky-test policy (README "Flaky tests"): no silent retries. `npm run test:rerun-failed` is the only retry, and its
  // passes are reported as flaky.
  specFileRetries: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 180000,
  connectionRetryCount: 3,

  // Each platform config sets `services: [appiumService(...)]`.

  framework: 'mocha',
  reporters: [
    'spec',
    // Raw titles and outcomes for `npm run test:report` (known-defect grouping).
    [ResultsReporter, {}],
    [
      'junit',
      {
        outputDir: LOGS_DIR,
        outputFileFormat: (options: { cid: string; capabilities: unknown }) =>
          `junit-${String((options.capabilities as { platformName?: string }).platformName).toLowerCase()}-${options.cid}.xml`,
      },
    ],
  ],

  mochaOpts: {
    ui: 'bdd',
    timeout: MOCHA_TIMEOUT,
    retries: 0,
  },

  onPrepare: function (_config, capabilities) {
    launchedCapabilities = capabilities as Array<{ platformName?: string }>;
    // Start each run with an empty retry log so the end-of-run summary covers this run only.
    for (const cap of capabilities as Array<{ platformName?: string }>) {
      clearRetryLogs(String(cap.platformName));
      clearResults(String(cap.platformName).toLowerCase());
    }
  },

  /**
   * A worker that dies (e.g. its Appium session is dropped) never reaches the results reporter's `onRunnerEnd`, so its
   * spec would silently vanish from the report. Record it as a failed setup hook instead: always new-red.
   */
  onWorkerEnd: function (cid, exitCode, specs) {
    if (exitCode === 0) return;
    const platform = String(launchedCapabilities[Number(cid.split('-')[0])]?.platformName ?? 'device').toLowerCase();
    if (fs.existsSync(path.join(LOGS_DIR, resultsFileName(platform, cid, specs[0])))) return;
    writeResults(resultsFileName(platform, cid, specs[0]), {
      source: platform,
      file: specs[0],
      results: [
        {
          title: `worker ${cid} exited (code ${exitCode}) before reporting results`,
          state: 'failed',
          isHook: true,
          error: `The session or worker died mid-spec; see logs/appium-${platform}/ and the run output for worker ${cid}.`,
        },
      ],
    });
  },

  onComplete: function (_exitCode, _config, capabilities) {
    for (const platform of new Set((capabilities as Array<{ platformName?: string }>).map((cap) => String(cap.platformName)))) {
      console.log(`\n${summariseRetries(platform)}`);
    }
  },

  /** On failure, leaves a screenshot and page source in `logs/` so the run can be diagnosed without re-running. */
  afterTest: async function (test, _context, { passed }) {
    if (!passed) await captureDiagnostics(test);
  },

  /** Test setup lives in `beforeEach` hooks, so a setup failure is a hook failure, not a test failure. */
  afterHook: async function (test, _context, { passed }) {
    if (!passed) await captureDiagnostics(test);
  },
};
