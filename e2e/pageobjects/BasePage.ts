import { parsePence, type Pence } from '../helpers/expectedPricing.js';
import { ELEMENT_TIMEOUT, OPTIONAL_ELEMENT_TIMEOUT } from '../helpers/timeouts.js';

export default class BasePage {
  // React Native maps testID to the accessibility id on iOS, but to resource-id on Android.
  byTestId(id: string): string {
    return driver.isAndroid ? `android=new UiSelector().resourceId("${id}")` : `~${id}`;
  }

  byTestIdPrefix(prefix: string): string {
    return driver.isAndroid
      ? `android=new UiSelector().resourceIdMatches("^${prefix}")`
      : `-ios predicate string:name BEGINSWITH "${prefix}"`;
  }

  async waitForDisplayed(selector: string, timeout = ELEMENT_TIMEOUT): Promise<void> {
    await $(selector).waitForDisplayed({ timeout });
  }

  async waitForGone(selector: string, timeout = ELEMENT_TIMEOUT): Promise<void> {
    await $(selector).waitForExist({ timeout, reverse: true });
  }

  async isShown(selector: string, timeout = OPTIONAL_ELEMENT_TIMEOUT): Promise<boolean> {
    return $(selector)
      .waitForDisplayed({ timeout })
      .then(
        () => true,
        () => false,
      );
  }

  async tap(selector: string, timeout = ELEMENT_TIMEOUT): Promise<void> {
    const element = $(selector);
    await element.waitForDisplayed({ timeout });
    await element.waitForEnabled({ timeout });
    await element.click();
  }

  // On iOS, setValue on a secure field that has no focus can silently leave it empty.
  async type(selector: string, value: string, timeout = ELEMENT_TIMEOUT): Promise<void> {
    const element = $(selector);
    await element.waitForDisplayed({ timeout });
    await element.click();
    await element.clearValue();
    await element.setValue(value);
  }

  async readText(selector: string, timeout = ELEMENT_TIMEOUT): Promise<string> {
    const element = $(selector);
    await element.waitForDisplayed({ timeout });
    return element.getText();
  }

  // Summary lines show discounts as negative amounts; callers compare the amount taken off.
  async readAmount(selector: string, timeout = ELEMENT_TIMEOUT): Promise<Pence> {
    return Math.abs(parsePence(await this.readText(selector, timeout)));
  }
}
