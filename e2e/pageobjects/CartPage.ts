import BasePage from './BasePage.js';
import { dismissKeyboard } from '../helpers/keyboard.js';
import { OPTIONAL_ELEMENT_TIMEOUT } from '../helpers/timeouts.js';
import type { Pence } from '../helpers/expectedPricing.js';
import type { Product } from '../fixtures/products.js';

class CartPage extends BasePage {
  get couponInput() {
    return this.byTestId('cart_coupon_input');
  }
  get applyButton() {
    return this.byTestId('cart_apply_button');
  }
  get noteText() {
    return this.byTestId('cart_note_text');
  }
  get proceedButton() {
    return this.byTestId('cart_proceed_button');
  }
  get startShoppingButton() {
    return this.byTestId('cart_start_shopping_button');
  }
  get subtotalValue() {
    return this.byTestId('cart_summary_subtotal');
  }
  get discountValue() {
    return this.byTestId('cart_summary_discount');
  }
  get shippingValue() {
    return this.byTestId('cart_summary_shipping');
  }
  get totalValue() {
    return this.byTestId('cart_summary_total');
  }

  removeButton(product: Product) {
    return this.byTestId(`cart_remove_button_${product.id}_${product.size}`);
  }

  async applyCoupon(code: string): Promise<void> {
    await this.type(this.couponInput, code);
    await dismissKeyboard();
    const previousNote = await this.currentNote();
    await this.tap(this.applyButton);

    if (previousNote === null) {
      await this.waitForDisplayed(this.noteText);
      return;
    }
    // Re-applying a code with the same result leaves the note unchanged, so there is no change to wait for.
    const note = $(this.noteText);
    await note
      .waitUntil(async () => (await note.getText()) !== previousNote, { timeout: OPTIONAL_ELEMENT_TIMEOUT })
      .catch(() => undefined);
  }

  private async currentNote(): Promise<string | null> {
    const note = $(this.noteText);
    return (await note.isExisting()) ? note.getText() : null;
  }

  async getNoteText(): Promise<string> {
    return this.readText(this.noteText);
  }

  async isDiscountLineDisplayed(): Promise<boolean> {
    return this.isShown(this.discountValue);
  }

  async getSubtotal(): Promise<Pence> {
    return this.readAmount(this.subtotalValue);
  }

  async getDiscount(): Promise<Pence> {
    return this.readAmount(this.discountValue);
  }

  async getShipping(): Promise<Pence> {
    return this.readAmount(this.shippingValue);
  }

  async getTotal(): Promise<Pence> {
    return this.readAmount(this.totalValue);
  }

  async removeLine(product: Product): Promise<void> {
    await this.tap(this.removeButton(product));
    await this.waitForGone(this.removeButton(product));
  }

  async isEmpty(): Promise<boolean> {
    return this.isShown(this.startShoppingButton);
  }

  async proceedToCheckout(): Promise<void> {
    await this.tap(this.proceedButton);
  }
}

export default new CartPage();
