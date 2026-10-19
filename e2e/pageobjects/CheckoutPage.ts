import BasePage from './BasePage.js';
import { dismissKeyboard } from '../helpers/keyboard.js';
import { scrollIntoView } from '../helpers/gestures.js';
import type { Pence } from '../helpers/expectedPricing.js';

class CheckoutPage extends BasePage {
  get nameInput() { return this.byTestId('checkout_name_input'); }
  get emailInput() { return this.byTestId('checkout_email_input'); }
  get addressInput() { return this.byTestId('checkout_address_input'); }
  get cityInput() { return this.byTestId('checkout_city_input'); }
  get postcodeInput() { return this.byTestId('checkout_postcode_input'); }
  get cardNameInput() { return this.byTestId('checkout_cardname_input'); }
  get cardNumberInput() { return this.byTestId('checkout_cardnumber_input'); }
  get expiryInput() { return this.byTestId('checkout_expiry_input'); }
  get cvcInput() { return this.byTestId('checkout_cvc_input'); }
  get payButton() { return this.byTestId('checkout_pay_button'); }

  get subtotalValue() { return this.byTestId('checkout_summary_subtotal'); }
  get discountValue() { return this.byTestId('checkout_summary_discount'); }
  get shippingValue() { return this.byTestId('checkout_summary_shipping'); }
  get totalValue() { return this.byTestId('checkout_summary_total'); }

  /** The keyboard covers later inputs, so it is dismissed before Postcode and between payment fields. */
  async fillShippingDetails(details: { name: string; email: string; address: string; city: string; postcode: string }): Promise<void> {
    await this.waitForDisplayedAndSetValue(this.nameInput, details.name);
    await this.waitForDisplayedAndSetValue(this.emailInput, details.email);
    await this.waitForDisplayedAndSetValue(this.addressInput, details.address);
    await this.waitForDisplayedAndSetValue(this.cityInput, details.city);
    await dismissKeyboard(this.cityInput);
    await this.waitForDisplayedAndSetValue(this.postcodeInput, details.postcode);
  }

  async fillPaymentDetails(details: { cardName: string; cardNumber: string; expiry: string; cvc: string }): Promise<void> {
    await dismissKeyboard(this.postcodeInput);
    await this.waitForDisplayedAndSetValue(this.cardNameInput, details.cardName);
    await dismissKeyboard(this.cardNameInput);
    await this.waitForDisplayedAndSetValue(this.cardNumberInput, details.cardNumber);
    await dismissKeyboard(this.cardNumberInput);
    // Expiry and CVC rest under the fixed Pay button until scrolled into view.
    await scrollIntoView(this.expiryInput);
    await this.waitForDisplayedAndSetValue(this.expiryInput, details.expiry);
    await dismissKeyboard(this.expiryInput);
    await scrollIntoView(this.cvcInput);
    await this.waitForDisplayedAndSetValue(this.cvcInput, details.cvc);
    await dismissKeyboard(this.cvcInput);
  }

  /** The summary sits below the payment fields, so every summary read scrolls its target into view first. */
  private async readSummaryAmount(selector: string): Promise<Pence> {
    await scrollIntoView(selector);
    return this.getAmountWhenDisplayed(selector);
  }

  async isDiscountLineDisplayed(): Promise<boolean> {
    await scrollIntoView(this.discountValue);
    return this.isDisplayed(this.discountValue, 3000);
  }

  /** Summary amounts in pence; the discount is the amount taken off, so positive. */
  async getSubtotal(): Promise<Pence> {
    return this.readSummaryAmount(this.subtotalValue);
  }

  async getDiscount(): Promise<Pence> {
    return this.readSummaryAmount(this.discountValue);
  }

  async getShipping(): Promise<Pence> {
    return this.readSummaryAmount(this.shippingValue);
  }

  async getTotal(): Promise<Pence> {
    return this.readSummaryAmount(this.totalValue);
  }

  /** A retry cannot double-submit: Pay is disabled while an order is in flight and the tap waits for it to be enabled. */
  async pay(): Promise<void> {
    await this.tapAndRetryIfStuck(this.payButton);
  }
}

export default new CheckoutPage();
