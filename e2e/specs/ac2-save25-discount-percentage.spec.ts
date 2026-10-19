import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import CheckoutPage from '../pageobjects/CheckoutPage.js';
import LoginPage from '../pageobjects/LoginPage.js';
import { setUpGuestCartWithProduct } from '../helpers/cartSetup.js';
import { products } from '../fixtures/products.js';
import { coupons } from '../fixtures/coupons.js';
import { seededUser } from '../fixtures/users.js';
import { expectedDiscount, formatPence, lineSubtotal } from '../helpers/expectedPricing.js';

describe('AC-2: percentage discount for SAVE25', () => {
  it('AC-2: SAVE25 takes a quarter off the subtotal @known-defect SHOP-101-D1', async () => {
    await setUpGuestCartWithProduct(products.primary);

    const subtotal = lineSubtotal(products.primary);

    await CartPage.applyCoupon(coupons.valid);
    const actualDiscount = await CartPage.getDiscount();

    const expected = expectedDiscount(subtotal, coupons.valid);
    expect(
      actualDiscount,
      `SAVE25 should take 25% (${formatPence(expected)}) off ${formatPence(subtotal)}; ` +
        'a fixed amount off instead is known defect SHOP-101-D1',
    ).to.equal(expected);
  });

  it('AC-2: a guest who applies SAVE25 still has it after signing in at checkout @known-defect SHOP-101-D3', async () => {
    await setUpGuestCartWithProduct(products.secondary);
    const subtotal = lineSubtotal(products.secondary);

    await CartPage.applyCoupon(coupons.valid);
    await CartPage.proceedToCheckout();
    await LoginPage.loginAndContinueToCheckout(seededUser.email, seededUser.password);

    const expected = expectedDiscount(subtotal, coupons.valid);
    const discountDisplayed = await CheckoutPage.isDiscountLineDisplayed();
    expect(
      discountDisplayed,
      `Checkout should show a ${formatPence(expected)} discount row; if it is missing, the coupon was lost ` +
        'on the way through sign-in (known defect SHOP-101-D3)',
    ).to.be.true;
  });
});
