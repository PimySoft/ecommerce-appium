import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import { setUpGuestCartWithProduct } from '../helpers/cartSetup.js';
import { products } from '../fixtures/products.js';
import { coupons, notes } from '../fixtures/coupons.js';

describe('AC-1: coupon entry on the basket screen', () => {
  beforeEach(async () => {
    await setUpGuestCartWithProduct(products.primary);
  });

  it('AC-1: entering a code and tapping Apply gives visible feedback', async () => {
    await CartPage.applyCoupon(coupons.valid);

    const note = await CartPage.getNoteText();
    const discountShown = await CartPage.isDiscountLineDisplayed();

    expect(note, 'a valid code should produce the "Coupon applied" note').to.match(notes.applied);
    expect(discountShown, 'a discount row should appear in the summary').to.be.true;
  });
});
