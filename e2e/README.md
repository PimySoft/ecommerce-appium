# Acme Shop coupon feature: E2E suite

Appium 3 and WebdriverIO 9 in TypeScript, with Mocha/Chai and the Page Object Model. One codebase drives the iOS Simulator (XCUITest) and the Android emulator (UiAutomator2). For what the suite covers and why it's built this way, see the [top-level README](../README.md).

## What you need

- **Node** `^20.19`, `^22.12` or `>=24` (what Appium 3 and WebdriverIO 9 support).
- **iOS:** Xcode with an iOS Simulator (default `iPhone 16`).
- **Android:** the Android SDK with an emulator (default AVD `Medium_Phone_API_36.0`).
- **The app:** an Acme Shop debug build installed on the simulator or emulator, with Metro running.
  - iOS: bundle id `com.example.shop`.
  - Android: package `com.example.shop`, activity `.MainActivity`.

  The suite launches the installed app. It doesn't build or install it. Appium can't drive an app inside Expo Go, so this has to be a native build (for example from `expo run:ios` / `expo run:android`).
- **The backend** on `http://localhost:4000`, seeded with the test account and products in [`fixtures/`](fixtures/).

The UI suites and the API specs need the app and backend, which aren't in this repository. Without them, the type and lint checks still run, and those are what CI runs on every push ([`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml)).

## Setup

1. Install dependencies, from this folder:

       npm install

   `appium` is pinned to an exact version (`3.1.2`), not a caret range. A newer minor reads a different driver manifest format and reports no installed drivers.

2. Install the Appium drivers once, into a folder you own:

       APPIUM_HOME=~/.appium-e2e npx appium driver install xcuitest
       APPIUM_HOME=~/.appium-e2e npx appium driver install uiautomator2

   `wdio.shared.conf.ts` sets `APPIUM_HOME` to `~/.appium-e2e` unless you've already set it. A default `~/.appium` that was installed with `sudo` is root-owned, and then the WebDriverAgent build fails partway through.

3. Android only, once per emulator boot: let the emulator reach the backend on the host.

       adb reverse tcp:4000 tcp:4000

   Without this, the app can't reach `localhost:4000` and may show offline sample data. Different product names on the Home screen are the sign of this.

## Running

| Command | What it does |
|---|---|
| `npm run test:ios` | UI suite on the iOS Simulator |
| `npm run test:android` | UI suite on the Android emulator |
| `npm run test:api` | API specs against the backend; about a second, no simulator |
| `npm run check` | `tsc --noEmit`, then ESLint |
| `npm run test:report` | Sorts the last run into expected-red, new-red, unexpectedly-green and flaky |
| `npm run test:rerun-failed` | Reruns each new-red test once, so the report can tell flaky from broken |
| `npm run test:flake-rate` | Flake events per test over the last 20 runs; exits 1 when one needs quarantining |
| `npm run test:table` | Prints a per-spec pass/fail table (Markdown) from the last run |

Settings you can override with environment variables:
- `IOS_DEVICE_NAME` and `IOS_PLATFORM_VERSION` pick the simulator;
- `ANDROID_DEVICE_NAME` picks the emulator;
- `API_URL` points the API specs at a different backend.

The iOS and Android suites start their own Appium servers on ports 4723 and 4724, so both can run at once.

To run one test, pass a pattern for its full title (`describe` included):

    npx wdio run ./wdio.ios.conf.ts --mochaOpts.grep "AC-3: adding a second product"

Each test relaunches the app and builds its own basket, so any test can run alone or in any order.

## Reading the results

Some tests are expected to fail. They prove three open defects and end their title with `@known-defect SHOP-101-D<n>`. The ids and descriptions are in [`helpers/knownDefects.ts`](helpers/knownDefects.ts). Because of them, the suite's own exit code will be non-zero. Use the report instead:

    npm run test:report                 # every results file in logs/
    npm run test:report -- ios api      # only some sources

| Exit code | Meaning |
|---|---|
| 0 | Every failure is a tagged known defect |
| 1 | A **new-red** (untagged failure or a failed setup hook), an **unexpectedly-green** (tagged but passing, so the defect looks fixed and the tag should be removed), or an expired quarantine |
| 2 | No results found |

In CI, run the suite while ignoring its exit code, give new failures one more try, then gate on the report:

    npm run test:ios || true
    npm run test:rerun-failed -- ios
    npm run test:report -- ios

Each failed UI test also saves a screenshot and the page source to `logs/`. A worker that dies mid-spec is recorded as a failed setup hook, so a crash can never look green.

## Flaky tests

The main run never retries (`specFileRetries` and Mocha `retries` are 0). A test that fails and then passes on `test:rerun-failed` is reported as **flaky**, never as green. One that flakes more than twice in 20 runs is quarantined: it gets `@flaky SHOP-101-F<n>` in its title and an entry in [`helpers/flakyTests.ts`](helpers/flakyTests.ts) with an owner, a reason, a ticket and an expiry date. It keeps running and reporting but no longer gates the build, until the date passes. The full policy is in the [engineering notes](docs/engineering-notes.md#flaky-test-policy).

## Conventions for new tests

ESLint enforces the first two rules. The rest are checked in code review.

- **Specs use page objects only.** A spec can't use `$`, `$$`, `driver` or `browser` directly. Selectors and taps go in a page object method, for example `CartPage.applyCoupon(code)`.
- **No fixed sleeps.** `.pause()` is rejected. Wait on a condition (`waitForDisplayed`, `waitUntil`) with a limit from [`helpers/timeouts.ts`](helpers/timeouts.ts).
- **Look up elements by `testID`, through `BasePage.byTestId()`.** It returns the right selector for each platform. If an element has no `testID`, add one to the app instead of using a text or XPath locator.
- **Never hardcode an expected total.** Compute it with [`helpers/expectedPricing.ts`](helpers/expectedPricing.ts) from the fixture prices.
- **One acceptance criterion per test, named with its id** (`AC-3: ...`), so a failure maps straight back to a requirement.
- **Build state through the shared setup** in [`helpers/cartSetup.ts`](helpers/cartSetup.ts), not by copying steps into a spec.
- **Never weaken an assertion to get a test passing.** If it fails because of a real defect, add the defect to `knownDefects.ts` and tag the test.

## Layout

```
specs/          UI specs: ac1–ac6, plus edge cases, checkout summary and basket changes
api/            API specs (Mocha) and their reporter
pageobjects/    BasePage plus one class per screen (product, cart, login, checkout, confirmation)
helpers/        pricing oracle, cart setup, app lifecycle, gestures, keyboard, timeouts, defect tags, reporters
fixtures/       products, coupons, users, checkout details
scripts/        defect-report.ts, results-table.ts, rerun-failed.ts, flake-rate.ts
wdio.*.conf.ts  shared, iOS and Android WebdriverIO configs
```

The flaky-test policy, selector findings, automation problems solved along the way, and timing measurements are in [`docs/engineering-notes.md`](docs/engineering-notes.md).
