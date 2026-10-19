import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import CheckoutPage from '../pageobjects/CheckoutPage.js';
import { setUpSignedInCartWithProduct } from '../helpers/cartSetup.js';
import { products } from '../fixtures/products.js';
import { coupons } from '../fixtures/coupons.js';
import { expectedTotals, formatPence, lineSubtotal } from '../helpers/expectedPricing.js';

describe('Checkout summary after applying SAVE25', () => {
  const expected = expectedTotals(lineSubtotal(products.primary), coupons.valid);

  beforeEach(async () => {
    await setUpSignedInCartWithProduct(products.primary);
    await CartPage.applyCoupon(coupons.valid);
    await CartPage.proceedToCheckout();
  });

  it('AC-2: the coupon carries through to Checkout, with the same subtotal and £5.00 shipping', async () => {
    expect(await CheckoutPage.getSubtotal(), 'Checkout subtotal should be the product price × 1').to.equal(
      expected.subtotal,
    );
    expect(await CheckoutPage.getShipping(), 'Checkout shipping should be the flat £5.00').to.equal(expected.shipping);
    expect(await CheckoutPage.isDiscountLineDisplayed(), 'the coupon should carry through to Checkout').to.be.true;
  });

  it('AC-2: Checkout shows 25% off @known-defect SHOP-101-D1', async () => {
    expect(
      await CheckoutPage.getDiscount(),
      `Checkout should show ${formatPence(expected.discount)} (25%) off ${formatPence(expected.subtotal)}; ` +
        'known defect SHOP-101-D1',
    ).to.equal(expected.discount);
  });

  it('AC-4: Checkout shows the expected total @known-defect SHOP-101-D1', async () => {
    expect(
      await CheckoutPage.getTotal(),
      `expected ${formatPence(expected.total)} (${formatPence(expected.subtotal)} − ${formatPence(expected.discount)} + ` +
        `${formatPence(expected.shipping)} shipping); a wrong discount (known defect SHOP-101-D1) shows up here as well`,
    ).to.equal(expected.total);
  });
});
