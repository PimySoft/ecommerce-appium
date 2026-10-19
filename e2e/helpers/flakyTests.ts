/**
 * Quarantined flaky tests (policy: e2e/README.md "Flaky tests").
 *
 * A test that flakes more than twice in 20 runs (`npm run test:flake-rate`) gets `@flaky SHOP-101-F<n>` at the end of
 * its title and an entry here. It keeps running and is still reported, but a failure no longer gates the build.
 * Every entry has an owner, a root-cause ticket and an expiry date: once it expires `npm run test:report` fails,
 * so a quarantine is either fixed, consciously renewed, or the test is deleted. It never lapses silently.
 */
export interface QuarantineEntry {
  owner: string;
  /** What is known so far: timing, selector, test data, or a genuine app race. */
  reason: string;
  ticket: string;
  /** Last day the quarantine is valid, `YYYY-MM-DD`. */
  expires: string;
}

export const flakyTests: Record<string, QuarantineEntry> = {};

/** Quarantine ids named by `@flaky` tags in a test title (empty when the test is not quarantined). */
export function flakyTagsIn(title: string): string[] {
  return [...title.matchAll(/@flaky\s+(SHOP-101-F\d+)/g)].map((match) => match[1]);
}

/** Whole days until the entry expires; negative once it has expired (the expiry day itself is still valid). */
export function daysToExpiry(entry: QuarantineEntry, today = new Date()): number {
  const end = Date.parse(`${entry.expires}T23:59:59Z`);
  return Math.floor((end - today.getTime()) / 86_400_000);
}
