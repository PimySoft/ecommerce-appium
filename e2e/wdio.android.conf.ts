import { appiumService, config as sharedConfig } from './wdio.shared.conf.js';

// Run `adb reverse tcp:4000 tcp:4000` once per emulator boot, or the app cannot reach the backend.
export const config: WebdriverIO.Config = {
  ...sharedConfig,

  services: [appiumService('android', 4724)],

  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Medium_Phone_API_36.0',
      'appium:appPackage': 'com.example.shop',
      'appium:appActivity': '.MainActivity',
      'appium:noReset': true,
      'appium:newCommandTimeout': 240,
      'appium:disableWindowAnimation': true,
    },
  ],
};
