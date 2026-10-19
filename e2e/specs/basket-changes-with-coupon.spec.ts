import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import ProductDetailPage from '../pageobjects/ProductDetailPage.js';
import { setUpGuestCartWithProduct } from '../helpers/cartSetup.js';
import { products, roundingBoundary } from '../fixtures/products.js';
import { coupons } from '../fixtures/coupons.js';
import { expectedTotals, formatPence, lineSubtotal } from '../helpers/expectedPricing.js';

describe('SAVE25 as the basket changes', () => {
  const primary = products.primary;
  const secondary = products.secondary;

  beforeEach(async () => {
    await setUpGuestCartWithProduct(primary);
  });

  async function addSecondary(): Promise<void> {
    await ProductDetailPage.addAnotherProduct(secondary);
  }

  it('AC-2: SAVE25 takes 25% off a basket with two different products @known-defect SHOP-101-D1', async () => {
    await addSecondary();
    const expected = expectedTotals(lineSubtotal(primary) + lineSubtotal(secondary), coupons.valid);
    expect(await CartPage.getSubtotal(), 'displayed subtotal should be both product prices').to.equal(
      expected.subtotal,
    );

    await CartPage.applyCoupon(coupons.valid);

    expect(
      await CartPage.getDiscount(),
      `SAVE25 should take ${formatPence(expected.discount)} (25%) off ${formatPence(expected.subtotal)}; known defect SHOP-101-D1`,
    ).to.equal(expected.discount);
  });

  it('AC-4: a two-product basket with SAVE25 totals the subtotal less 25%, plus £5.00 shipping @known-defect SHOP-101-D1', async () => {
    await addSecondary();
    const expected = expectedTotals(lineSubtotal(primary) + lineSubtotal(secondary), coupons.valid);

    await CartPage.applyCoupon(coupons.valid);

    expect(
      await CartPage.getTotal(),
      `expected ${formatPence(expected.total)}; a wrong discount (known defect SHOP-101-D1) shows up here as well`,
    ).to.equal(expected.total);
  });

  it('AC-2: adding a second unit after applying SAVE25 updates the discount @known-defect SHOP-101-D1', async () => {
    await CartPage.applyCoupon(coupons.valid);
    await ProductDetailPage.addAnotherProduct(primary);
    const expected = expectedTotals(lineSubtotal(primary, 2), coupons.valid);
    expect(await CartPage.getSubtotal(), 'displayed subtotal should be the product price × 2').to.equal(
      expected.subtotal,
    );

    expect(
      await CartPage.getDiscount(),
      `the discount should be worked out again: 25% of ${formatPence(expected.subtotal)} is ${formatPence(expected.discount)}`,
    ).to.equal(expected.discount);
  });

  it('AC-2: taking a product out after applying SAVE25 updates the discount for what is left @known-defect SHOP-101-D1', async () => {
    await addSecondary();
    await CartPage.applyCoupon(coupons.valid);

    await CartPage.removeLine(secondary);
    const expected = expectedTotals(lineSubtotal(primary), coupons.valid);
    expect(await CartPage.getSubtotal(), 'subtotal should drop to the product that is left').to.equal(
      expected.subtotal,
    );

    expect(
      await CartPage.getDiscount(),
      `the discount should be 25% of what is left, ${formatPence(expected.discount)} off ${formatPence(expected.subtotal)}`,
    ).to.equal(expected.discount);
  });

  it('AC-2: taking out the only product leaves an empty basket with no discount', async () => {
    await CartPage.applyCoupon(coupons.valid);

    await CartPage.removeLine(primary);

    expect(await CartPage.isEmpty(), 'the empty-basket message should show').to.be.true;
    expect(await CartPage.isDiscountLineDisplayed(), 'an empty basket should have no discount row').to.be.false;
  });

  it('AC-2: a 25% discount ending in half a penny is rounded up @known-defect SHOP-101-D1', async () => {
    await ProductDetailPage.addAnotherProduct(roundingBoundary.product);
    const expected = expectedTotals(lineSubtotal(roundingBoundary.product, roundingBoundary.quantity), coupons.valid);
    expect(await CartPage.getSubtotal(), 'displayed subtotal should be the product price × 2').to.equal(
      expected.subtotal,
    );

    await CartPage.applyCoupon(coupons.valid);

    expect(
      await CartPage.getDiscount(),
      `25% of ${formatPence(expected.subtotal)} ends in half a penny and should round up to ${formatPence(expected.discount)}`,
    ).to.equal(expected.discount);
  });
});
