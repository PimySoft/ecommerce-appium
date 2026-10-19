import ProductDetailPage from '../pageobjects/ProductDetailPage.js';

/**
 * The app id the session was started with, read from the capabilities so it is
 * declared only in the wdio configs. Returned in the shape the `mobile:` app
 * lifecycle commands expect for the current platform.
 */
function appIdArgs(): { bundleId: string } | { appId: string } {
  const caps = driver.capabilities as unknown as Record<string, string | undefined>;
  if (driver.isIOS) {
    const bundleId = caps.bundleId ?? caps['appium:bundleId'];
    if (!bundleId) throw new Error('iOS session capabilities carry no bundleId');
    return { bundleId };
  }
  const appId = caps.appPackage ?? caps['appium:appPackage'];
  if (!appId) throw new Error('Android session capabilities carry no appPackage');
  return { appId };
}

/**
 * The one reset every test setup starts from. Auth, cart and coupon are
 * in-memory React state, so a relaunch returns the app to a signed-out, empty,
 * coupon-free Home regardless of what a previous test left behind.
 */
export async function resetApp(): Promise<void> {
  const args = appIdArgs();
  await driver.execute('mobile: terminateApp', args);
  // `mobile: launchApp` is XCUITest-only; `activateApp` works on both drivers.
  await driver.execute('mobile: activateApp', args);
  await ProductDetailPage.waitForHome();
}
