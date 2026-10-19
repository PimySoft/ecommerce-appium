import ProductDetailPage from '../pageobjects/ProductDetailPage.js';

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

// Sign-in, cart and coupon are in-memory app state, so a relaunch is a complete reset.
export async function resetApp(): Promise<void> {
  const args = appIdArgs();
  await driver.execute('mobile: terminateApp', args);
  // `mobile: launchApp` is XCUITest-only; `activateApp` works on both drivers.
  await driver.execute('mobile: activateApp', args);
  await ProductDetailPage.waitForHome();
}
