import { expect } from 'chai';
import {
  expectedDiscount,
  expectedShipping,
  expectedTotal,
  expectedTotals,
  formatPence,
  isValidCoupon,
  lineSubtotal,
  parsePence,
} from '../helpers/expectedPricing.js';

describe('unit: expectedPricing (the documented rule the suite asserts against)', () => {
  describe('parsePence / formatPence', () => {
    it("reads the app's £X.XX and -£X.XX text as signed integer pence", () => {
      expect(parsePence('£18.99')).to.equal(1899);
      expect(parsePence('-£0.25')).to.equal(-25);
      expect(parsePence('  £0.05 ')).to.equal(5);
      expect(parsePence('£120.00')).to.equal(12000);
    });

    it('rejects text that is not exactly two-decimal pounds, rather than guessing', () => {
      for (const text of ['18.99', '£18.9', '£18.999', '£ 18.99', '$18.99', '']) {
        expect(() => parsePence(text), text).to.throw('Unrecognised currency text');
      }
    });

    it('formats pence the way the app renders it, and round-trips with parsePence', () => {
      expect(formatPence(1899)).to.equal('£18.99');
      expect(formatPence(-25)).to.equal('-£0.25');
      expect(formatPence(0)).to.equal('£0.00');
      for (const pence of [0, 1, 99, 1899, -475, 12000]) expect(parsePence(formatPence(pence))).to.equal(pence);
    });
  });

  describe('isValidCoupon', () => {
    it('accepts SAVE25 in any case and with surrounding whitespace', () => {
      for (const code of ['SAVE25', 'save25', 'SaVe25', '  SAVE25 ']) expect(isValidCoupon(code), code).to.be.true;
    });

    it('rejects other, partial, empty and missing codes', () => {
      for (const code of ['SAVE2', 'SAVE250', 'SA VE25', '', '   ', undefined]) {
        expect(isValidCoupon(code), String(code)).to.be.false;
      }
    });
  });

  describe('expectedDiscount', () => {
    it('is 25% of the subtotal, not a flat amount', () => {
      expect(expectedDiscount(2000, 'SAVE25')).to.equal(500);
      expect(expectedDiscount(10000, 'SAVE25')).to.equal(2500);
    });

    it('rounds a fractional penny half up', () => {
      expect(expectedDiscount(3798, 'SAVE25'), '25% of £37.98 is £9.495').to.equal(950);
      expect(expectedDiscount(1899, 'SAVE25'), '25% of £18.99 is £4.7475').to.equal(475);
      expect(expectedDiscount(2997, 'SAVE25'), '25% of £29.97 is £7.4925').to.equal(749);
      expect(expectedDiscount(2, 'SAVE25'), '25% of 2p is 0.5p').to.equal(1);
      expect(expectedDiscount(1, 'SAVE25'), '25% of 1p is 0.25p').to.equal(0);
    });

    it('is zero for an invalid or missing coupon and for an empty basket', () => {
      expect(expectedDiscount(1899, 'NOPE')).to.equal(0);
      expect(expectedDiscount(1899, undefined)).to.equal(0);
      expect(expectedDiscount(0, 'SAVE25')).to.equal(0);
    });
  });

  describe('shipping and total', () => {
    it('charges £5.00 shipping on any non-empty basket and none on an empty one', () => {
      expect(expectedShipping(1)).to.equal(500);
      expect(expectedShipping(99999)).to.equal(500);
      expect(expectedShipping(0)).to.equal(0);
    });

    it('totals subtotal − discount + shipping', () => {
      expect(expectedTotal(1899, 'SAVE25'), '£18.99 − £4.75 + £5.00').to.equal(1924);
      expect(expectedTotal(1899, undefined), '£18.99 + £5.00').to.equal(2399);
      expect(expectedTotal(0, 'SAVE25')).to.equal(0);
    });

    it('expectedTotals agrees with the individual functions', () => {
      expect(expectedTotals(3798, 'SAVE25')).to.deep.equal({
        subtotal: 3798,
        discount: 950,
        shipping: 500,
        total: 3348,
      });
      expect(expectedTotals(3798)).to.deep.equal({ subtotal: 3798, discount: 0, shipping: 500, total: 4298 });
    });

    it('lineSubtotal multiplies the unit price by the quantity, defaulting to one', () => {
      expect(lineSubtotal({ pricePence: 1899 })).to.equal(1899);
      expect(lineSubtotal({ pricePence: 1899 }, 3)).to.equal(5697);
    });
  });
});
