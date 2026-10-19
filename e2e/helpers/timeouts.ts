/**
 * Wait budgets, in ms. Kept apart because they answer different questions: an element that is
 * already on a running app appears in well under a second, while a cold app start is measured in seconds.
 */

/**
 * How long to wait for an element on a running app. Measured over a full iOS run (266 waits, longest 0.18s)
 * and Android specs (44 waits, longest 1.3s); 10s leaves several times that for a slow machine.
 */
export const ELEMENT_TIMEOUT = 10000;

/**
 * How long to wait for the Home screen after terminating and relaunching the app. A cold start of the debug
 * build on the Android emulator was measured at up to 21.5s (average 9.7s).
 */
export const APP_LAUNCH_TIMEOUT = 60000;

/**
 * Mocha's per-test and per-hook timeout. A `beforeEach` hook relaunches the app and rebuilds the cart, so it
 * must outlast a slow launch plus the setup flow. The longest test body seen was 38s.
 */
export const MOCHA_TIMEOUT = 120000;
