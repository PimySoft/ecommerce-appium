import { expect } from 'chai';
import { assertBackendUp, cartSummary, toPence, type CartLine } from '../helpers/apiClient.js';
import { products, roundingBoundary } from '../fixtures/products.js';
import { coupons } from '../fixtures/coupons.js';
import { expectedTotals, formatPence, lineSubtotal } from '../helpers/expectedPricing.js';

const line = (product: typeof products.primary, quantity = 1): CartLine => ({
  productId: product.id,
  size: product.size,
  quantity,
});

const D1 =
  'SAVE25 should take 25% off the subtotal, not a fixed amount (known defect SHOP-101-D1)';

/** Calls POST /api/cart/summary for one basket and coupon, and returns the amounts in pence. */
async function summaryFor(items: CartLine[], couponCode?: string) {
  const { status, body } = await cartSummary(items, couponCode);
  expect(status, 'the summary request should return 200').to.equal(200);
  return {
    body,
    actual: {
      subtotal: toPence(body.subtotal),
      discount: toPence(body.discount),
      shipping: toPence(body.shipping),
      total: toPence(body.total),
    },
  };
}

describe('API: basket summary from POST /api/cart/summary', () => {
  before(assertBackendUp);

  describe('AC-2: percentage discount for SAVE25', () => {
    const subtotal = lineSubtotal(products.primary);

    it('AC-2: API takes 25% off for SAVE25 @known-defect SHOP-101-D1', async () => {
      const { actual } = await summaryFor([line(products.primary)], coupons.valid);
      const expected = expectedTotals(subtotal, coupons.valid);
      expect(actual.subtotal, 'subtotal should be the product price × 1').to.equal(subtotal);
      expect(
        actual.discount,
        `${D1}. Expected ${formatPence(expected.discount)} on ${formatPence(subtotal)}, got ${formatPence(actual.discount)}`,
      ).to.equal(expected.discount);
    });

    it('AC-2: API takes 25% off the combined price of two products @known-defect SHOP-101-D1', async () => {
      const basketSubtotal = lineSubtotal(products.primary) + lineSubtotal(products.secondary);
      const { actual } = await summaryFor([line(products.primary), line(products.secondary)], coupons.valid);
      const expected = expectedTotals(basketSubtotal, coupons.valid);
      expect(actual.subtotal, 'subtotal should be both product prices added together').to.equal(basketSubtotal);
      expect(actual.discount, `${D1}. Expected ${formatPence(expected.discount)}, got ${formatPence(actual.discount)}`).to.equal(
        expected.discount,
      );
    });

    it('AC-2: API rounds a 25% discount ending in half a penny up (£9.495 → £9.50) @known-defect SHOP-101-D1', async () => {
      const { product, quantity } = roundingBoundary;
      const basketSubtotal = lineSubtotal(product, quantity);
      const { actual } = await summaryFor([line(product, quantity)], coupons.valid);
      const expected = expectedTotals(basketSubtotal, coupons.valid);
      expect(actual.subtotal, 'subtotal should be the product price × quantity').to.equal(basketSubtotal);
      expect(actual.discount, `${D1}. Expected ${formatPence(expected.discount)}, got ${formatPence(actual.discount)}`).to.equal(
        expected.discount,
      );
    });
  });

  describe('AC-2: SAVE25 accepted regardless of case or surrounding spaces', () => {
    const subtotal = lineSubtotal(products.primary);
    const variants = [
      ['in lowercase', coupons.validLowercase],
      ['in mixed case', coupons.validMixedCase],
      ['with spaces around it', coupons.validWithWhitespace],
    ] as const;

    for (const [label, code] of variants) {
      it(`AC-2: API accepts SAVE25 ${label} @known-defect SHOP-101-D1`, async () => {
        const { body, actual } = await summaryFor([line(products.primary)], code);
        const expected = expectedTotals(subtotal, code);
        expect(body.couponApplied, `"${code}" should count as SAVE25`).to.be.true;
        expect(actual.discount, `${D1}. Expected ${formatPence(expected.discount)}, got ${formatPence(actual.discount)}`).to.equal(
          expected.discount,
        );
      });
    }
  });

  describe('AC-3: flat shipping charge', () => {
    it('AC-3: API adds £5.00 shipping to a basket with one item', async () => {
      const { actual } = await summaryFor([line(products.primary)], coupons.valid);
      expect(actual.shipping).to.equal(expectedTotals(lineSubtotal(products.primary), coupons.valid).shipping);
    });

    it('AC-3: API adds the same £5.00 to a basket with two items', async () => {
      const { actual } = await summaryFor([line(products.primary), line(products.secondary)]);
      expect(actual.shipping).to.equal(500);
    });

    it('AC-3: API adds no shipping to an empty basket', async () => {
      const { actual } = await summaryFor([], coupons.valid);
      expect(actual).to.deep.equal({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
    });
  });

  describe('AC-4: how the order total is built', () => {
    const subtotal = lineSubtotal(products.primary);

    it('AC-4: API total adds up from its own subtotal, discount and shipping', async () => {
      const { actual } = await summaryFor([line(products.primary)], coupons.valid);
      expect(actual.total).to.equal(actual.subtotal - actual.discount + actual.shipping);
    });

    it('AC-4: API total with SAVE25 matches the expected figure @known-defect SHOP-101-D1', async () => {
      const { actual } = await summaryFor([line(products.primary)], coupons.valid);
      const expected = expectedTotals(subtotal, coupons.valid);
      expect(
        actual.total,
        `${D1}. Expected ${formatPence(expected.total)} (${formatPence(subtotal)} − ${formatPence(expected.discount)} + ` +
          `${formatPence(expected.shipping)}), got ${formatPence(actual.total)}`,
      ).to.equal(expected.total);
    });
  });

  describe('AC-5: codes that should not give a discount', () => {
    const subtotal = lineSubtotal(products.primary);
    const noCoupon = expectedTotals(subtotal);
    const cases = [
      ['an unknown code', coupons.invalid],
      ['a blank code', coupons.empty],
      ['a request with no coupon field', undefined],
      ['a code made only of spaces', '   '],
    ] as const;

    for (const [label, code] of cases) {
      it(`AC-5: API gives no discount for ${label}`, async () => {
        const { body, actual } = await summaryFor([line(products.primary)], code);
        expect(body.couponApplied, 'couponApplied should be false').to.be.false;
        expect(body.couponCode, 'couponCode should come back as null').to.equal(null);
        expect(actual.discount).to.equal(0);
        expect(actual.total, 'total should be the expected no-coupon total').to.equal(noCoupon.total);
      });
    }
  });
});
