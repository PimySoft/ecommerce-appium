import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import CheckoutPage from '../pageobjects/CheckoutPage.js';
import OrderSuccessPage from '../pageobjects/OrderSuccessPage.js';
import { setUpSignedInCartWithProduct } from '../helpers/cartSetup.js';
import { products } from '../fixtures/products.js';
import { coupons } from '../fixtures/coupons.js';
import { testShippingDetails, testPaymentDetails } from '../fixtures/checkoutDetails.js';
import { expectedTotals, formatPence, lineSubtotal } from '../helpers/expectedPricing.js';

describe('AC-6: what the confirmation screen tells the shopper', () => {
  const expected = expectedTotals(lineSubtotal(products.primary), coupons.valid);
  let checkoutTotalBeforePay: number;

  before(async () => {
    await setUpSignedInCartWithProduct(products.primary);
    await CartPage.applyCoupon(coupons.valid);
    await CartPage.proceedToCheckout();
    await CheckoutPage.fillShippingDetails(testShippingDetails);
    await CheckoutPage.fillPaymentDetails(testPaymentDetails);
    checkoutTotalBeforePay = await CheckoutPage.getTotal();
    await CheckoutPage.pay();
  });

  it('AC-6: an order number is shown', async () => {
    // The order counter is shared across runs, so only the format is predictable.
    expect(await OrderSuccessPage.getOrderNumber()).to.match(/^WS-\d{4}-\d{6}$/);
  });

  it('AC-6: the total matches what Checkout showed before Pay', async () => {
    expect(await OrderSuccessPage.getTotal()).to.equal(checkoutTotalBeforePay);
  });

  it('AC-6: the total matches the expected figure @known-defect SHOP-101-D1', async () => {
    expect(
      await OrderSuccessPage.getTotal(),
      `expected ${formatPence(expected.total)} (${formatPence(expected.subtotal)} − ${formatPence(expected.discount)} + ` +
        `${formatPence(expected.shipping)} shipping); a wrong discount (known defect SHOP-101-D1) shows up here as well`,
    ).to.equal(expected.total);
  });

  it('AC-6: the coupon used is shown @known-defect SHOP-101-D2', async () => {
    expect(
      await OrderSuccessPage.isCouponDisplayed(),
      `"${coupons.valid}" should appear on the confirmation screen; ` +
        'a missing coupon row is known defect SHOP-101-D2',
    ).to.be.true;
    expect(await OrderSuccessPage.getCoupon()).to.contain(coupons.valid);
  });

  it('AC-6: a discount row is shown @known-defect SHOP-101-D2', async () => {
    expect(
      await OrderSuccessPage.isDiscountDisplayed(),
      `the confirmation screen should show the ${formatPence(expected.discount)} discount. The saved order ` +
        'has it (see api/order.api.spec.ts), so a missing row is known defect SHOP-101-D2',
    ).to.be.true;
  });

  it('AC-6: the amount saved is the expected 25% @known-defect SHOP-101-D2 @known-defect SHOP-101-D1', async () => {
    expect(await OrderSuccessPage.getDiscount()).to.equal(expected.discount);
  });
});
