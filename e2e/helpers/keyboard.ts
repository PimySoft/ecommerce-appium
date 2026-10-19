import { dragVertically } from './gestures.js';

const KEYCODE_ESCAPE = 111;
const KEYBOARD_TIMEOUT = 5000;
const DEFAULT_DRAG_START = 0.59;
const DRAG_CLEARANCE = 0.035;
const DRAG_FLOOR = 0.12;
const DRAG_LENGTH = 0.235;

export async function dismissKeyboard(justFilledSelector?: string): Promise<void> {
  if (!(await driver.isKeyboardShown())) return;
  if (driver.isAndroid) {
    // Not hideKeyboard(): UiAutomator2 follows ESC with BACK when the keyboard is slow to close, and BACK leaves the screen.
    await driver.pressKeyCode(KEYCODE_ESCAPE);
  } else {
    await dismissIosKeyboard(justFilledSelector);
  }
  await driver.waitUntil(async () => !(await driver.isKeyboardShown()), {
    timeout: KEYBOARD_TIMEOUT,
    timeoutMsg: 'The keyboard did not close',
  });
}

// Numeric keypads have no return key, and hideKeyboard() and tapping blank space do nothing in this app, so drag
// from just above the field: the Checkout ScrollView dismisses the keyboard on drag.
async function dismissIosKeyboard(justFilledSelector?: string): Promise<void> {
  const returnKey = $('-ios predicate string:name == "return" OR name == "Return"');
  if (await returnKey.isExisting()) {
    await returnKey.click();
    return;
  }
  let fromY = DEFAULT_DRAG_START;
  const field = justFilledSelector ? $(justFilledSelector) : undefined;
  if (field && (await field.isExisting())) {
    const { height } = await driver.getWindowSize();
    const { y } = await field.getLocation();
    fromY = Math.max(y / height - DRAG_CLEARANCE, DRAG_FLOOR);
  }
  await dragVertically(fromY, Math.min(fromY + DRAG_LENGTH, 1), 0.8);
}
