import BasePage from './BasePage.js';
import { dismissKeyboard } from '../helpers/keyboard.js';

class LoginPage extends BasePage {
  // Sign-in CTA on Home, the entry point from the initial route.
  get homeSignInButton() { return this.byTestId('home_signin_button'); }

  get emailInput() { return this.byTestId('login_email_input'); }
  get passwordInput() { return this.byTestId('login_password_input'); }
  get submitButton() { return this.byTestId('login_submit_button'); }

  async openFromHome(): Promise<void> {
    await this.tapAndRetryIfStuck(this.homeSignInButton);
  }

  /** The inputs are pre-seeded with the demo credentials, so values are cleared before typing. */
  async login(email: string, password: string): Promise<void> {
    await this.waitForDisplayedAndSetValue(this.emailInput, email);
    await this.waitForDisplayedAndSetValue(this.passwordInput, password);
    await dismissKeyboard();
    await this.tapAndRetryIfStuck(this.submitButton);
  }
}

export default new LoginPage();
