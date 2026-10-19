/**
 * Shared page-object base: selector resolution and wait/tap/type helpers.
 * Gestures, keyboard handling and app lifecycle live in `helpers/`.
 * `testID` maps to `accessibilityIdentifier` on iOS (`~testID` works) but to
 * `resource-id` on Android, so selectors are built per platform here.
 */
import { recordRetry } from '../helpers/retryLog.js';
import { ELEMENT_TIMEOUT as DEFAULT_TIMEOUT } from '../helpers/timeouts.js';
import { parsePence, type Pence } from '../helpers/expectedPricing.js';

export default class BasePage {
  byTestId(id: string): string {
    return driver.isAndroid ? `android=new UiSelector().resourceId("${id}")` : `~${id}`;
  }

  /** Matches every element whose testID starts with `prefix` (dynamically-suffixed ids such as cart lines). */
  byTestIdPrefix(prefix: string): string {
    return driver.isAndroid
      ? `android=new UiSelector().resourceIdMatches("^${prefix}")`
      : `-ios predicate string:name BEGINSWITH "${prefix}"`;
  }

  async waitForDisplayedAndTap(selector: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    await el.waitForEnabled({ timeout });
    await el.click();
  }

  /**
   * Taps and, on iOS only, retries once (logged) if the tap did not land. "Landed" means the button
   * disappeared; pass `landedSelectors` when it stays on screen (e.g. the header cart button).
   * Only for taps where a second landing is harmless, so not "Add to Cart" or "Pay".
   */
  async tapAndRetryIfStuck(selector: string, timeout = DEFAULT_TIMEOUT, landedSelectors?: string[]): Promise<void> {
    await this.waitForDisplayedAndTap(selector, timeout);
    if (!driver.isIOS) return;
    // Wait for the button to go (returns at once if it has); `isDisplayed` would wait for it to appear.
    const stuck = landedSelectors
      ? !(await this.anyDisplayed(landedSelectors, 5000))
      : await (await $(selector)).waitForDisplayed({ timeout: 5000, reverse: true }).then(() => false, () => true);
    if (stuck) {
      recordRetry({ kind: 'retry', where: 'tapAndRetryIfStuck', detail: `${selector} did not land` });
      await this.waitForDisplayedAndTap(selector, timeout);
    }
  }

  async anyDisplayed(selectors: string[], timeout = DEFAULT_TIMEOUT): Promise<boolean> {
    return driver
      .waitUntil(
        async () => {
          for (const selector of selectors) if (await (await $(selector)).isDisplayed()) return true;
          return false;
        },
        { timeout, interval: 250 },
      )
      .catch(() => false);
  }

  /** Taps before clearing: on iOS, `clearValue`/`setValue` can silently no-op on an unfocused secure field. */
  async waitForDisplayedAndSetValue(selector: string, value: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    await el.click();
    await el.clearValue();
    await el.setValue(value);
  }

  async getTextWhenDisplayed(selector: string, timeout = DEFAULT_TIMEOUT): Promise<string> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    return el.getText();
  }

  /** Reads a `£X.XX` / `-£X.XX` amount as pence, without its sign: summaries show discounts as negative. */
  async getAmountWhenDisplayed(selector: string, timeout = DEFAULT_TIMEOUT): Promise<Pence> {
    return Math.abs(parsePence(await this.getTextWhenDisplayed(selector, timeout)));
  }

  async isDisplayed(selector: string, timeout = DEFAULT_TIMEOUT): Promise<boolean> {
    const el = await $(selector);
    return el.waitForDisplayed({ timeout, reverse: false }).catch(() => false);
  }
}
