import { appiumService, config as sharedConfig } from './wdio.shared.conf.js';

// iOS Simulator: launches the debug build installed by `npx expo run:ios`.
export const config: WebdriverIO.Config = {
  ...sharedConfig,

  services: [appiumService('ios', 4723)],

  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 16',
      ...(process.env.IOS_PLATFORM_VERSION ? { 'appium:platformVersion': process.env.IOS_PLATFORM_VERSION } : {}),
      'appium:bundleId': 'com.example.shop',
      'appium:noReset': true,
      'appium:newCommandTimeout': 240,
      // The app's perpetual timers/animations stop WDA ever seeing it as idle, which starves taps.
      'appium:waitForQuiescence': false,
      'appium:reduceMotion': true,
    },
  ],
};
