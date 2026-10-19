import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import { setUpCartWithProduct } from '../helpers/cartSetup.js';
import { products } from '../fixtures/products.js';
import { coupons } from '../fixtures/coupons.js';
import { expectedDiscount, lineSubtotal } from '../helpers/expectedPricing.js';

describe('Coupon input edge cases', () => {
  const subtotal = lineSubtotal(products.primary);

  beforeEach(async () => {
    await setUpCartWithProduct(products.primary);
  });

  it('AC-2: a lowercase code ("save25") is accepted @known-defect SHOP-101-D1', async () => {
    expect(await CartPage.getSubtotal(), 'displayed subtotal should be the product price × 1').to.equal(subtotal);

    await CartPage.applyCoupon(coupons.validLowercase);

    const discountShown = await CartPage.isDiscountLineDisplayed();
    expect(discountShown, 'a lowercase code should still be accepted').to.be.true;

    const discount = await CartPage.getDiscount();

    expect(discount).to.equal(expectedDiscount(subtotal, coupons.validLowercase));
  });

  it('AC-2: a mixed-case code ("SaVe25") is accepted @known-defect SHOP-101-D1', async () => {
    await CartPage.applyCoupon(coupons.validMixedCase);

    const discountShown = await CartPage.isDiscountLineDisplayed();
    expect(discountShown, 'a mixed-case code should still be accepted').to.be.true;

    const discount = await CartPage.getDiscount();

    expect(discount).to.equal(expectedDiscount(subtotal, coupons.validMixedCase));
  });

  it('AC-1: spaces before and after a valid code are ignored @known-defect SHOP-101-D1', async () => {
    await CartPage.applyCoupon(coupons.validWithWhitespace);

    const discountShown = await CartPage.isDiscountLineDisplayed();
    expect(discountShown, 'a valid code with spaces around it should still be accepted').to.be.true;

    const discount = await CartPage.getDiscount();
    expect(discount).to.equal(expectedDiscount(subtotal, coupons.validWithWhitespace));
  });

  it('AC-1: tapping Apply twice with the same code does not double the discount', async () => {
    await CartPage.applyCoupon(coupons.valid);
    const firstDiscount = await CartPage.getDiscount();

    await CartPage.applyCoupon(coupons.valid);
    const secondDiscount = await CartPage.getDiscount();

    expect(secondDiscount, 'a second Apply with the same code should leave the discount as it was').to.equal(firstDiscount);
  });

  it('AC-5: replacing a valid code with an invalid one removes the discount', async () => {
    await CartPage.applyCoupon(coupons.valid);
    expect(await CartPage.isDiscountLineDisplayed(), 'the valid code should add a discount').to.be.true;

    await CartPage.applyCoupon(coupons.invalid);
    expect(await CartPage.isDiscountLineDisplayed(), 'the discount should go once the code is invalid').to.be
      .false;
  });
});
