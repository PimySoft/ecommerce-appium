import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import { setUpGuestCartWithProduct } from '../helpers/cartSetup.js';
import { products } from '../fixtures/products.js';
import { coupons } from '../fixtures/coupons.js';
import { expectedTotal, formatPence, lineSubtotal } from '../helpers/expectedPricing.js';

describe('AC-4: how the order total is built', () => {
  const subtotal = lineSubtotal(products.primary);

  beforeEach(async () => {
    await setUpGuestCartWithProduct(products.primary);
  });

  it('AC-4: with no coupon, the total adds up from the summary rows', async () => {
    expect(await CartPage.getSubtotal(), 'displayed subtotal should be the product price × 1').to.equal(subtotal);

    const shipping = await CartPage.getShipping();
    const discountShown = await CartPage.isDiscountLineDisplayed();
    const discount = discountShown ? await CartPage.getDiscount() : 0;
    const total = await CartPage.getTotal();

    expect(total).to.equal(subtotal - discount + shipping);
    expect(total, `expected total for ${formatPence(subtotal)} with no coupon`).to.equal(
      expectedTotal(subtotal, undefined),
    );
  });

  // Uses the app's own discount, so this stays independent of AC-2's percentage defect.
  it('AC-4: with SAVE25, the total adds up from the summary rows', async () => {
    await CartPage.applyCoupon(coupons.valid);

    expect(await CartPage.getSubtotal(), 'displayed subtotal should be the product price × 1').to.equal(subtotal);

    const shipping = await CartPage.getShipping();
    const discount = await CartPage.getDiscount();
    const total = await CartPage.getTotal();

    expect(total).to.equal(subtotal - discount + shipping);
  });

  it('AC-4: with SAVE25, the total matches the expected figure @known-defect SHOP-101-D1', async () => {
    await CartPage.applyCoupon(coupons.valid);

    const expected = expectedTotal(subtotal, coupons.valid);
    expect(
      await CartPage.getTotal(),
      `expected ${formatPence(expected)} (${formatPence(subtotal)} less 25%, plus ${formatPence(500)} shipping); ` +
        'a wrong discount (known defect SHOP-101-D1) shows up here as well',
    ).to.equal(expected);
  });
});
