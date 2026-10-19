# Mobile Test Automation for a Coupon Feature

[![e2e](https://github.com/PimySoft/ecommerce-appium/actions/workflows/e2e.yml/badge.svg)](https://github.com/PimySoft/ecommerce-appium/actions/workflows/e2e.yml)

**Appium 3 · WebdriverIO 9 · TypeScript · Mocha/Chai · iOS (XCUITest) and Android (UiAutomator2) from one codebase**

How I approach mobile test automation as a QA lead:

- **Traceability.** Each test is named after the acceptance criterion it checks, so a red result points straight to a requirement.
- **A framework a team can maintain.** Selectors, waits and platform differences live in page objects, and lint rules keep them there.
- **Independent expected results.** Totals are calculated from the business rule, never copied from the screen.
- **Honest defect reporting.** Tests that prove real defects stay red and are tracked separately from new failures.
- **Fast feedback below the UI.** API specs check the same rule in about a second, and CI type-checks, lints and unit-tests the suite on every push.

## The app under test

**Acme Shop** is a React Native (Expo) shopping app with a Node/Express backend. It isn't included here. The feature under test is a coupon at checkout: `SAVE25` should take 25% off the subtotal, with flat £5.00 shipping on top. The app and the backend each price the basket, so the same rule exists twice and each copy can be wrong on its own.

## Acceptance criteria

- **AC-1:** a coupon can be applied from the basket, with visible feedback.
- **AC-2:** `SAVE25` takes 25% off the subtotal, including for a shopper who signs in during checkout.
- **AC-3:** shipping is a flat £5.00.
- **AC-4:** total = subtotal − discount + shipping.
- **AC-5:** an unknown or blank code applies nothing and shows an error.
- **AC-6:** the confirmation shows the order number, total, coupon and discount.

Each AC has its own spec (`ac1-…` to `ac6-…`). Three more cover basket changes after applying the coupon, the checkout summary, and input edge cases (letter case, surrounding spaces, applying twice, replacing a valid code). That's 35 UI tests in 9 specs on both platforms, plus 30 API tests and 22 unit tests.

**Assumptions and gaps.** A discount that ends in half a penny rounds up; the ACs don't say, so I'd confirm it with the product owner. Not covered: network or backend failures while applying a coupon or paying, backgrounding and rotation, and accessibility labels.

## Defects found

- **SHOP-101-D1: the percentage coupon is applied as a flat amount.** `SAVE25` takes 25p off instead of 25%. The app and the backend share the bug, so the stored order total is wrong too.
- **SHOP-101-D2: the order confirmation doesn't show the coupon or discount.** The backend stores both; the screen never shows them.
- **SHOP-101-D3: a signed-out shopper loses the coupon when sent to sign in.** This is the normal first-purchase journey.

**Release recommendation: do not ship.** AC-2 and AC-6 fail; AC-1, AC-3, AC-4 and AC-5 pass on both platforms. Every red test traces to one of these defects, not to a locator or timing problem.

## Key decisions

**Platform differences hidden in page objects.** React Native's `testID` becomes the accessibility identifier on iOS but the `resource-id` on Android, so `~testID` finds nothing on Android. `BasePage.byTestId()` returns the right selector for each platform, so specs never branch.

**A pricing oracle.** [`helpers/expectedPricing.ts`](e2e/helpers/expectedPricing.ts) implements the documented rule in whole pence and never imports app code. Test prices were chosen to hit awkward cases: £37.98 × 25% = £9.495, which must round to £9.50.

**Known defects are tagged, not hidden.** Tests that prove a defect end with `@known-defect SHOP-101-D<n>`, and their assertions are never weakened. A tagged test checks only what its defect breaks; anything else it relies on is checked by an untagged test, so a new regression can't hide behind a known one. `npm run test:report` sorts each run into expected-red, new-red and unexpectedly-green, and exits 1 only for the last two, so it can gate CI while defects are open.

**No retries, no sleeps.** Retries are off and page objects never tap twice: a failure is reported as a failure, and a flaky test gets a root-cause fix. Every action waits on its own element in [`BasePage`](e2e/pageobjects/BasePage.ts), navigation is confirmed by the next screen's element (Android keeps covered screens in the tree), and each limit in [`helpers/timeouts.ts`](e2e/helpers/timeouts.ts) comes from a measurement. Scrolls are fractions of the window, not pixel coordinates.

**A clean app for every test.** Each test relaunches the app and builds its own basket through [`helpers/cartSetup.ts`](e2e/helpers/cartSetup.ts), so tests run alone or in any order. Only tests that reach Checkout sign in, which saves about 5.7s per test on iOS. The app has no deep links or test hooks, so this state can't be seeded through the API.

**An API layer.** Mocha specs call `POST /api/cart/summary` and `POST /api/orders` with the same oracle, checking the backend's copy of the rule and the stored order, which the UI can't see. The backend isn't published, so CI type-checks these specs without running them.

**Unit tests for the code that judges the tests.** If the pricing oracle or the result classifier were wrong, the whole suite would be wrong without any spec failing. [`unit/`](e2e/unit/) pins both down, and CI runs them on every push.

**Conventions enforced by tools.** ESLint rejects direct `$`, `driver` or `browser` calls in specs, and any `.pause()`. CI fails on unformatted code.

## What I'd add next

- **Simulator runs in CI,** once the suite gates a team's merges: an emulator job per PR, and iOS nightly because macOS runners cost about 10× more.
- **Flaky-test handling,** once a test turns flaky (none has): one rerun reported as flaky, never green, and a quarantine list with owners and expiry dates.
- **Parallel devices,** once a platform's run passes about 15 minutes.
- **Real devices in the cloud,** before a public release.

## Repository layout

- `e2e/specs/`: UI specs, one per acceptance criterion, plus edge cases
- `e2e/api/`: API specs (no simulator needed)
- `e2e/unit/`: unit tests for the pricing oracle and the result classifier
- `e2e/pageobjects/`: one class per screen, with platform-aware selectors in `BasePage`
- `e2e/helpers/`: pricing oracle, shared setup, gestures, timeouts, defect tags, reporters
- `e2e/fixtures/`: test data
- `e2e/scripts/`: defect report and results table
- `e2e/docs/`: engineering notes

Setup and run instructions are in [`e2e/README.md`](e2e/README.md). The full project, including the app and backend, is available on request.
