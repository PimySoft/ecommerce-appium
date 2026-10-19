# Engineering notes

These are the notes behind the suite: why I chose the tools, what I found about selectors, how flaky tests are handled, the automation problems that cost time, and what the timing measurements showed. They're for the next person to maintain the suite, so they don't have to diagnose the same problems again.

## Why Appium and WebdriverIO

I compared three options: Appium, Maestro and Detox.

- **Appium 3** has a driver for each platform, and one TypeScript codebase covers both iOS and Android. The machine already had both drivers, Xcode and an emulator, so setup cost little.
- **Maestro** is simpler (YAML flows) but would have meant a separate tool with its own language.
- **Detox** has the deepest React Native integration (it waits for the app to be idle automatically), but it takes the most setup.

The cost I accepted: Appium can't drive an app inside Expo Go, so every machine needs a one-time native build of the app before any test runs.

## Selectors: one `testID`, two platforms

The common advice is that React Native's `testID` plus Appium's accessibility-id selector (`~id`) works on both platforms. I checked it against both native builds, and on this stack it doesn't:

| Platform | What `testID` becomes     | What `~id` matches                                          | Working selector                            |
| -------- | ------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| iOS      | `accessibilityIdentifier` | accessibility identifier                                    | `~id`                                       |
| Android  | `resource-id`             | `content-desc` (which React Native fills from visible text) | `android=new UiSelector().resourceId("id")` |

So the branching can't be removed at the selector level, but it can be kept out of specs. `BasePage.byTestId()` and `byTestIdPrefix()` (for ids with a dynamic suffix, such as basket lines) return the right form for the current platform. Specs and the other page objects never check the platform. Only `BasePage` and the low-level helpers (app lifecycle, gestures, keyboard) do.

Where a screen element had no `testID`, I added one to the app instead of matching on visible text or XPath. Text locators break when the wording changes, and XPath is slow on both drivers.

## Flaky-test policy

A flaky test fails and then passes on the same build with no code change. Known defects are never flaky: they fail every time and carry a defect tag instead.

- **No silent retries.** The only retry is `npm run test:rerun-failed`, which reruns each new-red test once (a failed setup hook reruns its whole spec). A pass on rerun is reported as flaky, never green. Retrying inside the main run would turn a real intermittent failure into a pass nobody sees.
- **No retries inside page objects either.** Every tap happens once. The next action waits for its own element, so a tap that didn't land fails on the first element of the screen it should have opened.
- **Root cause, not longer waits.** A flaky test is investigated for timing, selector, test data, or a real race in the app. A real race is a defect and is written up as one.
- **What I'd add on a team.** With several people and a nightly run, I'd add run history and a quarantine list with an owner and an expiry date for each entry. On a one-person suite with no flaky tests recorded, that would be machinery with nothing to manage, so it isn't here.

## Automation problems solved

All of these are test-side issues, not app defects. I'm listing them because each one first looked like an app bug.

- **Reaching products through a category filter.** The default product list is newest-first, and the test products sat below the first screen. Scrolling a virtualised React Native list behaved differently on each platform and wasn't reliable. Tapping the product's category filter first puts it on screen on both platforms.
- **One reset instead of recovery helpers.** The first version had helpers that navigated back to Home, signed out and emptied the basket after each test. They broke whenever a test failed halfway through. Sign-in state, basket and coupon all live in memory in the app, so terminating and relaunching it is a complete reset. Every test now starts with `resetApp()` and builds its own state, and the recovery helpers are gone.
- **iOS secure text fields.** `clearValue()` and `setValue()` can silently do nothing on a password field that doesn't have focus. `BasePage` taps the field before typing.
- **Fields hidden under a fixed button.** On Checkout, the expiry and CVC inputs sit under the fixed Pay button, and the order summary sits below the payment form. The page object scrolls each target into view before reading or typing, and doesn't assume a layout.
- **Taps that didn't land, and the retry that outlived them.** Early iOS runs used coordinate taps (`mobile: tap`), and some didn't register. I added a logged retry-once, then counted: 7 retries per iOS run, all on one button. Switching to `el.click()` with `waitForQuiescence: false` (below) brought it to 0 on both platforms, and later full runs logged no retries either. A retry that never fires only hides the next real problem, so I removed it. Page objects now tap once, and the next action waits for its own element. My first replacement waited for the tapped control to disappear instead, and on Android that was wrong twice over: the previous screen stays in the element tree under the new one, and `isDisplayed` on a covered element took about 11.7s per call. Waiting for the next screen's element, or for an element to leave the tree (`waitForExist({ reverse: true })`), avoids both.
- **Android keyboard dismissal popping the screen.** `hideKeyboard()` on UiAutomator2 sends ESC, then BACK if the keyboard still reports as shown. When it was only slow to report closing, the BACK left the Login screen and failed the setup. The helper now sends ESC only while the keyboard is up, then waits for it to go.
- **Back navigation racing a screen change.** Going back from the basket to add another product sometimes went one screen too far on Android, because the back press arrived while Add to Cart was still navigating. Each back now waits for the screen it starts from.
- **Relaunch command.** `mobile: launchApp` exists only in the XCUITest driver, and the Android driver rejects it. `helpers/appLifecycle.ts` uses `mobile: terminateApp` and `mobile: activateApp`, which both drivers support.
- **A leftover WebDriverAgent process.** A stray `xcodebuild` process from an earlier session can make later iOS runs register taps with no effect and no error. Before blaming the app for an unexplained iOS failure, check `ps aux | grep xcodebuild`.
- **`waitForQuiescence: false` on iOS.** The app's timers and animations never let WebDriverAgent see it as idle, which starved taps. The suite relies on its own explicit waits instead.

## Timing measurements

### Wait budgets

The limits in `helpers/timeouts.ts` come from measured runs, not guesses:

| Budget                                | Measured                                             | Limit |
| ------------------------------------- | ---------------------------------------------------- | ----- |
| Element on a running app              | iOS: 266 waits, longest 0.18s. Android: longest 1.3s | 10s   |
| Cold app start (Android debug build)  | average 9.7s, longest 21.5s                          | 60s   |
| Test plus its relaunch-and-setup hook | longest 38s                                          | 120s  |

### Turning off animations

I added `appium:disableWindowAnimation` (Android) and `appium:reduceMotion` (iOS) as session capabilities, with no change to the app, and timed the full suite before and after. The pass/fail pattern was the same in both runs.

| Platform | Before | After   | Change                        |
| -------- | ------ | ------- | ----------------------------- |
| Android  | 5m 28s | 5m 14s  | −14s (about 4%)               |
| iOS      | 9m 56s | 10m 03s | +7s (within run-to-run noise) |

Android gains a little. iOS gains nothing. The app has no JavaScript animations for `reduceMotion` to shorten, and most of the suite's time goes on explicit waits and backend round-trips, not on screen transitions. I recorded this and stopped there. Adding a reduced-motion check to the app would have no effect.

### Signing in only when a test needs it

Every test builds its state through the UI, because the app keeps sign-in, basket and coupon in memory and has no deep links: there is nothing to seed from outside. What I could cut was setup a test doesn't use. The basket applies and prices the coupon the same way signed in or out (sign-in only matters at Proceed to Checkout), so the 20 tests that never leave the basket now start as a guest. Only the Checkout, confirmation and sign-in redirect tests sign in.

Measured on iOS against an earlier run of the same specs:

| Spec                                              | Setup                | Before | After |
| ------------------------------------------------- | -------------------- | ------ | ----- |
| `basket-changes-with-coupon` (6 tests)            | signed in → guest    | 128.7s | 93.9s |
| `edge-case-coupon-handling` (5 tests)             | signed in → guest    | 95.9s  | 67.5s |
| `checkout-summary-with-coupon` (2 tests, control) | signed in, unchanged | 42.6s  | 43.8s |

A UI sign-in costs about 5.7s per test, so the change saves roughly two minutes, about a fifth of an iOS run. The "after" run shared the machine with a second simulator, so the real saving is if anything larger. The next step would be a test-only way into a signed-in state (a deep link or launch argument), which is an app change for the developers to agree to.

## The two copies of the pricing rule

The app prices the basket locally and never calls the backend's summary endpoint. The backend prices the order again when it's saved. Each copy can be wrong on its own, so each needs its own check:

- **The UI specs** check the app's copy.
- **The API specs** (`api/`) check the backend's copy, using the same oracle and fixtures, and also check what the order record stores.

Neither layer replaces the other. In this case both copies had the same discount defect (SHOP-101-D1). The API specs are what showed that the stored order total was wrong too, not only the number on screen.
