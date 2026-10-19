import BasePage from './BasePage.js';
import { dismissKeyboard } from '../helpers/keyboard.js';
import { recordRetry } from '../helpers/retryLog.js';
import type { Pence } from '../helpers/expectedPricing.js';
import type { Product } from '../fixtures/products.js';

class CartPage extends BasePage {
  get headerCartButton() { return this.byTestId('header_cart_button'); }
  get couponInput() { return this.byTestId('cart_coupon_input'); }
  get applyButton() { return this.byTestId('cart_apply_button'); }
  get noteText() { return this.byTestId('cart_note_text'); }
  get proceedButton() { return this.byTestId('cart_proceed_button'); }
  get startShoppingButton() { return this.byTestId('cart_start_shopping_button'); }

  get subtotalValue() { return this.byTestId('cart_summary_subtotal'); }
  get discountValue() { return this.byTestId('cart_summary_discount'); }
  get shippingValue() { return this.byTestId('cart_summary_shipping'); }
  get totalValue() { return this.byTestId('cart_summary_total'); }

  removeButton(productId: string, size: string) { return this.byTestId(`cart_remove_button_${productId}_${size}`); }

  /** Header cart button, present on every screen except Login/Register/Checkout/OrderSuccess. */
  async openFromHeader(): Promise<void> {
    // The header button stays visible on Cart, so landing means Cart content (or its empty state) is showing.
    await this.tapAndRetryIfStuck(this.headerCartButton, undefined, [this.applyButton, this.startShoppingButton]);
  }

  /**
   * Every Apply press sets the note text, so a new note proves the tap landed; otherwise tap again
   * (idempotent) and log it. If the same note was already showing, the tap can't be verified, so it
   * is logged as unverified and left to the spec's assertions.
   */
  async applyCoupon(code: string): Promise<void> {
    await this.waitForDisplayedAndSetValue(this.couponInput, code);
    await dismissKeyboard();

    const noteBefore = await this.readNote();
    await this.waitForDisplayedAndTap(this.applyButton);
    if (await this.noteChangedFrom(noteBefore)) return;

    if (noteBefore !== null) {
      recordRetry({ kind: 'unverified', where: 'CartPage.applyCoupon', detail: `note unchanged ("${noteBefore}") for "${code}"` });
      return;
    }
    recordRetry({ kind: 'retry', where: 'CartPage.applyCoupon', detail: `no note after first Apply tap for "${code}"` });
    await this.waitForDisplayedAndTap(this.applyButton);
  }

  /** Current note text, or null when no note is rendered. */
  private async readNote(): Promise<string | null> {
    const el = await $(this.noteText);
    return (await el.isExisting()) ? el.getText() : null;
  }

  private async noteChangedFrom(before: string | null): Promise<boolean> {
    return driver
      .waitUntil(async () => (await this.readNote()) !== before, { timeout: 3000, interval: 200 })
      .catch(() => false);
  }

  async getNoteText(): Promise<string> {
    return this.getTextWhenDisplayed(this.noteText);
  }

  async isDiscountLineDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.discountValue, 3000);
  }

  /** Summary amounts in pence; the discount is the amount taken off, so positive. */
  async getSubtotal(): Promise<Pence> {
    return this.getAmountWhenDisplayed(this.subtotalValue);
  }

  async getDiscount(): Promise<Pence> {
    return this.getAmountWhenDisplayed(this.discountValue);
  }

  async getShipping(): Promise<Pence> {
    return this.getAmountWhenDisplayed(this.shippingValue);
  }

  async getTotal(): Promise<Pence> {
    return this.getAmountWhenDisplayed(this.totalValue);
  }

  /**
   * Removes one cart line and waits for its Remove button to go, so the summary is read after the
   * re-render. `tapAndRetryIfStuck` only waits like this on iOS.
   */
  async removeLine(product: Product): Promise<void> {
    const button = this.removeButton(product.id, product.size);
    await this.tapAndRetryIfStuck(button);
    // Re-query on every poll: the last line's removal swaps the whole screen, which drops a held element reference.
    await driver.waitUntil(async () => !(await (await $(button)).isExisting()), {
      timeout: 5000,
      timeoutMsg: `${button} still present after Remove`,
    });
  }

  /** True once the empty-cart state ("Start Shopping") is showing instead of the lines and summary. */
  async isEmpty(): Promise<boolean> {
    return this.isDisplayed(this.startShoppingButton, 5000);
  }

  async proceedToCheckout(): Promise<void> {
    await this.tapAndRetryIfStuck(this.proceedButton);
  }
}

export default new CartPage();
