// Gesture coordinates are fractions of the window, so they work on any screen size.
const EDGE_INSET = 0.025;
const SCROLL_SETTLE_TIMEOUT = 1000;

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

async function scrollDown(): Promise<void> {
  if (driver.isIOS) {
    await dragVertically(0.47, 0.18, 0.6);
    return;
  }
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

export async function scrollIntoView(selector: string, maxScrolls = 5): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    const visible = await $(selector)
      .waitForDisplayed({ timeout: SCROLL_SETTLE_TIMEOUT })
      .then(
        () => true,
        () => false,
      );
    if (visible) return;
    await scrollDown();
  }
}

export async function goBack(): Promise<void> {
  await driver.back();
}
