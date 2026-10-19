import fs from 'node:fs';
import path from 'node:path';

/**
 * Records every time a tap workaround fires. Workers are separate processes
 * from the launcher, so events go to a per-worker JSONL file in `logs/` (one
 * writer per file, so concurrent workers can't interleave lines) that
 * `wdio.shared.conf.ts` clears in `onPrepare` and merges in `onComplete`.
 */
export const LOGS_DIR = path.resolve('logs');

export type RetryKind = 'retry' | 'unverified';

export interface RetryEvent {
  kind: RetryKind;
  where: string;
  detail: string;
}

const retryLogPattern = (platform: string): RegExp => new RegExp(`^retries-${platform.toLowerCase()}(-.*)?\\.jsonl$`);

const retryLogFiles = (platform: string): string[] =>
  fs.existsSync(LOGS_DIR)
    ? fs.readdirSync(LOGS_DIR).filter((name) => retryLogPattern(platform).test(name)).map((name) => path.join(LOGS_DIR, name))
    : [];

/** A rerun (`test:rerun-failed`) keeps the main run's logs; its own go to `retries-<platform>-rerun-*`. */
export function clearRetryLogs(platform: string): void {
  if (process.env.E2E_RERUN === '1') return;
  for (const file of retryLogFiles(platform)) fs.rmSync(file, { force: true });
}

export function recordRetry(event: RetryEvent): void {
  const platform = driver.isAndroid ? 'android' : 'ios';
  console.warn(`[${event.kind}] ${event.where}: ${event.detail}`);
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const worker = `${process.env.E2E_RERUN === '1' ? 'rerun-' : ''}${process.env.WDIO_WORKER_ID ?? '0-0'}`;
  fs.appendFileSync(path.join(LOGS_DIR, `retries-${platform}-${worker}.jsonl`), `${JSON.stringify(event)}\n`);
}

export function summariseRetries(platform: string): string {
  const events: RetryEvent[] = retryLogFiles(platform).flatMap((file) =>
    fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as RetryEvent),
  );
  const count = (kind: RetryKind) => events.filter((e) => e.kind === kind).length;
  const byWhere = new Map<string, number>();
  for (const e of events.filter((e) => e.kind === 'retry')) byWhere.set(e.where, (byWhere.get(e.where) ?? 0) + 1);
  const lines = [
    `Tap workaround summary (${platform}): ${count('retry')} retries fired, ${count('unverified')} taps unverifiable`,
    ...[...byWhere].map(([where, n]) => `  ${n} x ${where}`),
  ];
  return lines.join('\n');
}
