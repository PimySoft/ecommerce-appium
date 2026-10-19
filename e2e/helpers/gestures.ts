/**
 * Screen gestures. Coordinates are fractions of the window, read from the
 * driver, so they follow the device size instead of assuming one simulator.
 */

/** Horizontal inset for iOS drags: near the left edge, clear of any input or button. */
const EDGE_INSET = 0.025;

async function isShown(selector: string, timeout: number): Promise<boolean> {
  const el = await $(selector);
  return el.waitForDisplayed({ timeout }).then(() => true, () => false);
}

/**
 * Drags from (x, fromY) down to (x, toY), in window fractions, at the left edge.
 * iOS only: `mobile: dragFromToForDuration` is an XCUITest command.
 */
export async function dragVertically(fromY: number, toY: number, duration: number): Promise<void> {
  const { width, height } = await driver.getWindowSize();
  await driver.execute('mobile: dragFromToForDuration', {
    fromX: Math.round(width * EDGE_INSET),
    fromY: Math.round(height * fromY),
    toX: Math.round(width * EDGE_INSET),
    toY: Math.round(height * toY),
    duration,
  });
}

/** Drags until `selector` is visible; the checkout Expiry/CVC inputs rest under the fixed Pay button. */
export async function scrollIntoView(selector: string, maxAttempts = 5): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isShown(selector, 1000)) return;
    if (driver.isIOS) {
      await dragVertically(0.47, 0.18, 0.6);
    } else {
      const { width, height } = await driver.getWindowSize();
      await driver.execute('mobile: scrollGesture', {
        left: Math.round(width * 0.05),
        top: Math.round(height / 12),
        width: Math.round(width * 0.9),
        height: Math.round(height / 6),
        direction: 'down',
        percent: 0.8,
      });
    }
  }
}

/** Pops one screen off the native navigation stack. */
export async function goBack(): Promise<void> {
  await driver.back();
}
