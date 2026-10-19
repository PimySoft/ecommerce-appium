import BasePage from './BasePage.js';
import type { Pence } from '../helpers/expectedPricing.js';

class OrderSuccessPage extends BasePage {
  get orderNumberValue() {
    return this.byTestId('order_success_order_number');
  }
  get totalValue() {
    return this.byTestId('order_success_total');
  }
  // The screen does not render these yet (SHOP-101-D2); the ids follow its `order_success_*` convention.
  get couponValue() {
    return this.byTestId('order_success_coupon_code');
  }
  get discountValue() {
    return this.byTestId('order_success_discount');
  }

  async getOrderNumber(): Promise<string> {
    return this.readText(this.orderNumberValue);
  }

  async getTotal(): Promise<Pence> {
    return this.readAmount(this.totalValue);
  }

  async isCouponDisplayed(): Promise<boolean> {
    return this.isShown(this.couponValue);
  }

  async getCoupon(): Promise<string> {
    return this.readText(this.couponValue);
  }

  async isDiscountDisplayed(): Promise<boolean> {
    return this.isShown(this.discountValue);
  }

  async getDiscount(): Promise<Pence> {
    return this.readAmount(this.discountValue);
  }
}

export default new OrderSuccessPage();
