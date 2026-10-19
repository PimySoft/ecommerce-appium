import BasePage from './BasePage.js';
import type { Pence } from '../helpers/expectedPricing.js';

class OrderSuccessPage extends BasePage {
  get orderNumberValue() { return this.byTestId('order_success_order_number'); }
  get totalValue() { return this.byTestId('order_success_total'); }
  get continueShoppingButton() { return this.byTestId('order_success_continue_button'); }

  // AC-6 fields the screen does not show yet (known defect SHOP-101-D2). The ids match the screen's other
  // `order_success_*` ids, so a fix only has to use them. Until then they never resolve.
  get couponValue() { return this.byTestId('order_success_coupon_code'); }
  get discountValue() { return this.byTestId('order_success_discount'); }

  async getOrderNumber(): Promise<string> {
    return this.getTextWhenDisplayed(this.orderNumberValue);
  }

  async getTotal(): Promise<Pence> {
    return this.getAmountWhenDisplayed(this.totalValue);
  }

  async isCouponDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.couponValue, 3000);
  }

  async getCoupon(): Promise<string> {
    return this.getTextWhenDisplayed(this.couponValue);
  }

  async isDiscountDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.discountValue, 3000);
  }

  /** The amount taken off, so positive. */
  async getDiscount(): Promise<Pence> {
    return this.getAmountWhenDisplayed(this.discountValue);
  }
}

export default new OrderSuccessPage();
