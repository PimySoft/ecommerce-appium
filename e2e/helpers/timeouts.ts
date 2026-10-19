// Measured: the longest element wait on a running app was 0.18s on iOS and 1.3s on Android.
export const ELEMENT_TIMEOUT = 10000;

// For elements a test expects may be absent, such as the discount line after an invalid coupon.
export const OPTIONAL_ELEMENT_TIMEOUT = 3000;

// Measured: an Android debug build took up to 21.5s to cold start (average 9.7s).
export const APP_LAUNCH_TIMEOUT = 60000;

// Covers a relaunch, the setup flow and the test body; the longest test seen was 38s.
export const MOCHA_TIMEOUT = 120000;
