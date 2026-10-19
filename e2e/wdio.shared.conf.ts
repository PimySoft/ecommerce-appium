import type { Services } from '@wdio/types';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ResultsReporter from './helpers/resultsReporter.js';
import { clearResults, resultsFileName, writeResults } from './helpers/resultsFile.js';
import { MOCHA_TIMEOUT } from './helpers/timeouts.js';

// A root-owned ~/.appium stops xcodebuild writing WebDriverAgent's build output.
process.env.APPIUM_HOME ||= path.join(os.homedir(), '.appium-e2e');

const LOGS_DIR = path.resolve('logs');

let launchedCapabilities: Array<{ platformName?: string }> = [];

// A fixed port per platform: left to itself, the service probes from 4723 and two launchers race for it.
export const appiumService = (name: string, port: number): Services.ServiceEntry => [
  'appium',
  {
    // The service's own lookup fails for a hoisted install.
    command: 'appium',
    args: { port },
    logPath: path.join(LOGS_DIR, `appium-${name}${process.env.E2E_RERUN === '1' ? '-rerun' : ''}`),
  },
];

const slug = (text: string): string =>
  text
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

async function captureDiagnostics(test: { file?: string; title: string }): Promise<void> {
  const name = [
    slug(path.basename(test.file ?? 'spec', '.ts')),
    slug(test.title),
    driver.isAndroid ? 'android' : 'ios',
    process.env.WDIO_WORKER_ID ?? '0-0',
  ].join('__');
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    await driver.saveScreenshot(path.join(LOGS_DIR, `${name}.png`));
    fs.writeFileSync(path.join(LOGS_DIR, `${name}.xml`), await driver.getPageSource());
  } catch (err) {
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
  specFileRetries: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 180000,
  connectionRetryCount: 3,

  framework: 'mocha',
  reporters: [
    'spec',
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
    for (const cap of capabilities as Array<{ platformName?: string }>) {
      clearResults(String(cap.platformName).toLowerCase());
    }
  },

  // A worker that dies never reaches the reporter, so its spec would vanish from the report instead of failing.
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

  afterTest: async function (test, _context, { passed }) {
    if (!passed) await captureDiagnostics(test);
  },

  afterHook: async function (test, _context, { passed }) {
    if (!passed) await captureDiagnostics(test);
  },
};
