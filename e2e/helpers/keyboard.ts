import { dragVertically } from './gestures.js';

/** Where a dismissing drag starts when no field is given, as a fraction of window height. */
const DEFAULT_DRAG_START = 0.59;
/** How far above the just-filled field the drag starts, and the lowest it may start (window fractions). */
const DRAG_CLEARANCE = 0.035;
const DRAG_FLOOR = 0.12;
/** Length of the dismissing drag, as a fraction of window height. */
const DRAG_LENGTH = 0.235;

/**
 * Dismisses the keyboard. On iOS, whichever mechanism works: the "return"
 * key where present, otherwise (numeric keypads have none) a drag that
 * starts just above `justFilledSelector`, in blank space above the fixed Pay
 * button, relying on the checkout ScrollView's `keyboardDismissMode="on-drag"`.
 * Tapping blank space and `hideKeyboard()` do not work in this app.
 */
export async function dismissKeyboard(justFilledSelector?: string): Promise<void> {
  if (!driver.isIOS) {
    // Not `hideKeyboard()`: UiAutomator2 sends ESC, then BACK if the keyboard still reads as shown a moment later.
    // When the keyboard was merely slow to report closing, that BACK pops the screen (Login -> Home) and fails the
    // setup. ESC alone, only while the keyboard is up, then wait for it to go.
    if (!(await driver.isKeyboardShown())) return;
    await driver.pressKeyCode(111); // KEYCODE_ESCAPE
    await driver.waitUntil(async () => !(await driver.isKeyboardShown()), { timeout: 5000, interval: 100 }).catch(() => undefined);
    return;
  }
  if (!(await driver.isKeyboardShown())) return;

  const returnKey = await $('-ios predicate string:name == "return" OR name == "Return"');
  if (await returnKey.isExisting()) {
    await returnKey.click();
  } else {
    const { height } = await driver.getWindowSize();
    let fromY = DEFAULT_DRAG_START;
    if (justFilledSelector) {
      const el = await $(justFilledSelector);
      if (await el.isExisting()) {
        const rect = await driver.getElementRect(await el.elementId);
        fromY = Math.max(rect.y / height - DRAG_CLEARANCE, DRAG_FLOOR);
      }
    }
    await dragVertically(fromY, Math.min(fromY + DRAG_LENGTH, 1), 0.8);
  }
  await driver.waitUntil(async () => !(await driver.isKeyboardShown()), { timeout: 5000, interval: 100 }).catch(() => undefined);
}
