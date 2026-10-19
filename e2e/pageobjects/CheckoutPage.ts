import BasePage from './BasePage.js';
import { dismissKeyboard } from '../helpers/keyboard.js';
import { scrollIntoView } from '../helpers/gestures.js';
import type { Pence } from '../helpers/expectedPricing.js';

interface ShippingDetails {
  name: string;
  email: string;
  address: string;
  city: string;
  postcode: string;
}

interface PaymentDetails {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

class CheckoutPage extends BasePage {
  get nameInput() {
    return this.byTestId('checkout_name_input');
  }
  get emailInput() {
    return this.byTestId('checkout_email_input');
  }
  get addressInput() {
    return this.byTestId('checkout_address_input');
  }
  get cityInput() {
    return this.byTestId('checkout_city_input');
  }
  get postcodeInput() {
    return this.byTestId('checkout_postcode_input');
  }
  get cardNameInput() {
    return this.byTestId('checkout_cardname_input');
  }
  get cardNumberInput() {
    return this.byTestId('checkout_cardnumber_input');
  }
  get expiryInput() {
    return this.byTestId('checkout_expiry_input');
  }
  get cvcInput() {
    return this.byTestId('checkout_cvc_input');
  }
  get payButton() {
    return this.byTestId('checkout_pay_button');
  }
  get subtotalValue() {
    return this.byTestId('checkout_summary_subtotal');
  }
  get discountValue() {
    return this.byTestId('checkout_summary_discount');
  }
  get shippingValue() {
    return this.byTestId('checkout_summary_shipping');
  }
  get totalValue() {
    return this.byTestId('checkout_summary_total');
  }

  async waitUntilShown(): Promise<void> {
    await this.waitForDisplayed(this.nameInput);
  }

  // The keyboard covers the fields below the one being filled.
  async fillShippingDetails(details: ShippingDetails): Promise<void> {
    await this.type(this.nameInput, details.name);
    await this.type(this.emailInput, details.email);
    await this.type(this.addressInput, details.address);
    await this.type(this.cityInput, details.city);
    await dismissKeyboard(this.cityInput);
    await this.type(this.postcodeInput, details.postcode);
  }

  async fillPaymentDetails(details: PaymentDetails): Promise<void> {
    await dismissKeyboard(this.postcodeInput);
    await this.type(this.cardNameInput, details.cardName);
    await dismissKeyboard(this.cardNameInput);
    await this.type(this.cardNumberInput, details.cardNumber);
    await dismissKeyboard(this.cardNumberInput);
    await scrollIntoView(this.expiryInput);
    await this.type(this.expiryInput, details.expiry);
    await dismissKeyboard(this.expiryInput);
    await scrollIntoView(this.cvcInput);
    await this.type(this.cvcInput, details.cvc);
    await dismissKeyboard(this.cvcInput);
  }

  async isDiscountLineDisplayed(): Promise<boolean> {
    await scrollIntoView(this.discountValue);
    return this.isShown(this.discountValue);
  }

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

  async pay(): Promise<void> {
    await this.tap(this.payButton);
  }

  private async readSummaryAmount(selector: string): Promise<Pence> {
    await scrollIntoView(selector);
    return this.readAmount(selector);
  }
}

export default new CheckoutPage();
