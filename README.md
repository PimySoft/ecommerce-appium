# Mobile Test Automation for a Coupon Feature

[![e2e](https://github.com/PimySoft/ecommerce-appium/actions/workflows/e2e.yml/badge.svg)](https://github.com/PimySoft/ecommerce-appium/actions/workflows/e2e.yml)

**Appium 3 · WebdriverIO 9 · TypeScript · Mocha/Chai · iOS (XCUITest) and Android (UiAutomator2) from one codebase**

This is how I approach mobile test automation as a QA lead:

- **Traceability.** Each test is named after the acceptance criterion it checks, so a red result points straight to a requirement.
- **A framework a team can maintain.** Selectors, waits and platform differences live in page objects, and lint rules keep them there.
- **Independent expected results.** Totals are calculated from the business rule, never copied from the screen.
- **Honest defect reporting.** Tests that prove real defects stay red and are tracked separately from new failures and from flaky ones.
- **Fast feedback below the UI.** API specs check the same rule in about a second. CI type-checks and lints every push.

## The app under test

**Acme Shop** is a React Native (Expo) shopping app with a Node/Express backend. It isn't included here. The feature under test is a coupon at checkout: `SAVE25` should take 25% off the subtotal, with flat £5.00 shipping on top. The app and the backend each price the basket, so the same rule exists twice and each copy can be wrong on its own.

## Acceptance criteria

- **AC-1:** a coupon can be applied from the basket, with visible feedback.
- **AC-2:** `SAVE25` takes 25% off the subtotal, including for a shopper who signs in during checkout.
- **AC-3:** shipping is a flat £5.00.
- **AC-4:** total = subtotal − discount + shipping.
- **AC-5:** an unknown or blank code applies nothing and shows an error.
- **AC-6:** the confirmation shows the order number, total, coupon and discount.

Each AC has its own spec (`ac1-…` to `ac6-…`). Further specs cover basket changes after applying the coupon, the checkout summary, and edge cases (letter case, surrounding spaces, applying twice, replacing a valid code with an invalid one, half-penny rounding). In total there are 28 UI tests in 9 specs, run on both platforms, plus 23 API tests.

## Defects found

- **SHOP-101-D1: the percentage coupon is applied as a flat amount.** `SAVE25` takes 25p off instead of 25%. The app and the backend share the bug, so the stored order total is also wrong. Every test that checks the discount value proves it, in both the UI and API layers.
- **SHOP-101-D2: the order confirmation doesn't show the discount.** The backend stores the coupon and the discount, but the screen never shows them. This is proven by `ac6-order-confirmation-details`, while the API specs confirm the data exists.
- **SHOP-101-D3: the coupon is lost when a signed-out shopper is sent to sign in.** This is the normal first-purchase journey. The sign-in redirect test in `ac2-save25-discount-percentage` proves it.

**Release recommendation: do not ship.** AC-2 and AC-6 fail, while AC-1, AC-3, AC-4 and AC-5 pass on both platforms. Every red test traces to one of these defects, not to a locator or timing problem.

## Key decisions

**Platform differences hidden in page objects.** React Native's `testID` becomes the accessibility identifier on iOS but the `resource-id` on Android, so `~testID` finds nothing on Android. I confirmed this on both native builds. `BasePage.byTestId()` returns the right selector for each platform, so specs never branch.

**A pricing oracle.** [`helpers/expectedPricing.ts`](e2e/helpers/expectedPricing.ts) implements the documented rule in whole pence with half-up rounding, and it never imports app code. The test prices were chosen to hit awkward cases: £37.98 × 25% = £9.495 must round to £9.50.

**Known defects are tagged, not hidden.** Tests that prove a defect end with `@known-defect SHOP-101-D<n>`, and their assertions are never weakened. `npm run test:report` sorts each run into three groups: expected-red, new-red and unexpectedly-green. It exits 1 only for the last two, so it can gate CI while known defects are still open.

**Flaky tests are named, owned and time-limited.** Nothing retries silently. `npm run test:rerun-failed` gives each new failure one more try, and a test that passes second time is reported as flaky, never green. A test that flakes more than twice in 20 runs is quarantined with an owner, a root-cause ticket and an expiry date; once that date passes, the report fails until someone fixes, renews or deletes it. A retry hides a problem; a quarantine with an owner gets it fixed.

**Waits based on measurements.** There are no sleeps. The time limits in [`helpers/timeouts.ts`](e2e/helpers/timeouts.ts) each come with the measurement behind them, for example an Android cold start of up to 21.5s, which sets a 60s launch limit.

**Gestures sized from the screen.** Scrolls in [`helpers/gestures.ts`](e2e/helpers/gestures.ts) are fractions of the window size rather than pixel coordinates, so they work on any device size.

**A clean app for every test.** Each test relaunches the app and builds its own basket through [`helpers/cartSetup.ts`](e2e/helpers/cartSetup.ts), so tests can run alone or in any order.

**An API layer.** Mocha specs call `POST /api/cart/summary` and `POST /api/orders` with the same oracle. They check the backend's copy of the rule and the stored order, which the UI can't see. The backend isn't published, so CI type-checks these specs without running them. A stub server would only test the stub.

**Lint rules for team consistency.** ESLint rejects direct `$`, `driver` or `browser` calls in specs, and any `.pause()`. A convention enforced by a linter survives code review; one written only on a wiki doesn't.

## Repository layout

- `e2e/specs/`: UI specs, one per acceptance criterion, plus edge cases
- `e2e/api/`: API specs (no simulator needed)
- `e2e/pageobjects/`: one class per screen, with platform-aware selectors in `BasePage`
- `e2e/helpers/`: pricing oracle, shared setup, gestures, timeouts, defect tags, reporters
- `e2e/fixtures/`: test data
- `e2e/scripts/`: defect report, results table, rerun of failures, flake rate
- `e2e/docs/`: engineering notes

Setup and run instructions are in [`e2e/README.md`](e2e/README.md). The full project, including the app and backend, is available on request.
