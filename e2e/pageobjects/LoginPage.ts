import BasePage from './BasePage.js';
import CheckoutPage from './CheckoutPage.js';
import { dismissKeyboard } from '../helpers/keyboard.js';

class LoginPage extends BasePage {
  get homeSignInButton() {
    return this.byTestId('home_signin_button');
  }
  get emailInput() {
    return this.byTestId('login_email_input');
  }
  get passwordInput() {
    return this.byTestId('login_password_input');
  }
  get submitButton() {
    return this.byTestId('login_submit_button');
  }

  async openFromHome(): Promise<void> {
    await this.tap(this.homeSignInButton);
  }

  async login(email: string, password: string): Promise<void> {
    await this.submit(email, password);
    await this.waitForGone(this.submitButton);
  }

  // Signing in from the Cart's redirect continues to Checkout, with Login still underneath it.
  async loginAndContinueToCheckout(email: string, password: string): Promise<void> {
    await this.submit(email, password);
    await CheckoutPage.waitUntilShown();
  }

  private async submit(email: string, password: string): Promise<void> {
    await this.type(this.emailInput, email);
    await this.type(this.passwordInput, password);
    await dismissKeyboard();
    await this.tap(this.submitButton);
  }
}

export default new LoginPage();
