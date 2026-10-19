import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import { setUpCartWithProduct } from '../helpers/cartSetup.js';
import { products } from '../fixtures/products.js';
import { coupons, notes } from '../fixtures/coupons.js';
import { expectedTotal, lineSubtotal } from '../helpers/expectedPricing.js';

describe('AC-5: codes that should not give a discount', () => {
  const subtotal = lineSubtotal(products.primary);
  const totalWithoutCoupon = expectedTotal(subtotal, undefined);

  beforeEach(async () => {
    await setUpCartWithProduct(products.primary);
  });

  it('AC-5: an unknown code changes nothing and shows an error', async () => {
    const totalBefore = await CartPage.getTotal();

    await CartPage.applyCoupon(coupons.invalid);

    const note = await CartPage.getNoteText();
    const discountShown = await CartPage.isDiscountLineDisplayed();
    const totalAfter = await CartPage.getTotal();

    expect(discountShown, 'an unknown code should not add a discount row').to.be.false;
    expect(note, 'error text for an unknown code').to.equal(notes.invalid);
    expect(totalAfter, 'total should not move').to.equal(totalBefore);
    expect(totalAfter, 'total should be the expected no-coupon total').to.equal(totalWithoutCoupon);
  });

  it('AC-5: tapping Apply with the field blank changes nothing and shows an error', async () => {
    const totalBefore = await CartPage.getTotal();

    await CartPage.applyCoupon(coupons.empty);

    const note = await CartPage.getNoteText();
    const discountShown = await CartPage.isDiscountLineDisplayed();
    const totalAfter = await CartPage.getTotal();

    expect(discountShown, 'a blank code should not add a discount row').to.be.false;
    expect(note, 'error text for a blank code').to.equal(notes.invalid);
    expect(totalAfter, 'total should not move').to.equal(totalBefore);
    expect(totalAfter, 'total should be the expected no-coupon total').to.equal(totalWithoutCoupon);
  });
});
