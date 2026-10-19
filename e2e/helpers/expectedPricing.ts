/**
 * The SHOP-101 pricing rule, written separately from the app. It must never
 * import the app's or the backend's pricing code, which both have the SAVE25
 * defect; a test would then only be comparing the app with itself.
 *
 * All amounts are integer pence, so no float rounding can hide (or invent) a
 * penny difference. The 25% discount is rounded half up to the nearest penny.
 */
export type Pence = number;

const VALID_COUPON = 'SAVE25';
const DISCOUNT_PERCENT = 25;
const FLAT_SHIPPING: Pence = 500;

/** Parses `£X.XX` / `-£X.XX` summary text (always two decimals, as the app renders it) into signed pence. */
export function parsePence(text: string): Pence {
  const match = text.trim().match(/^(-?)£(\d+)\.(\d{2})$/);
  if (!match) throw new Error(`Unrecognised currency text: "${text}"`);
  const [, sign, pounds, pennies] = match;
  return (sign === '-' ? -1 : 1) * (Number(pounds) * 100 + Number(pennies));
}

/** Formats pence as the app does (`£X.XX`, `-£X.XX`), for assertion messages. */
export function formatPence(pence: Pence): string {
  return `${pence < 0 ? '-' : ''}£${(Math.abs(pence) / 100).toFixed(2)}`;
}

/** Subtotal for `quantity` units of a fixture product, from its real unit price. */
export function lineSubtotal(product: { pricePence: Pence }, quantity = 1): Pence {
  return product.pricePence * quantity;
}

export function isValidCoupon(couponCode: string | undefined): boolean {
  return String(couponCode ?? '').trim().toUpperCase() === VALID_COUPON;
}

export function expectedDiscount(subtotal: Pence, couponCode: string | undefined): Pence {
  if (!isValidCoupon(couponCode)) return 0;
  const discount = Math.floor((subtotal * DISCOUNT_PERCENT + 50) / 100); // half up
  return Math.min(subtotal, discount);
}

export function expectedShipping(subtotal: Pence): Pence {
  return subtotal > 0 ? FLAT_SHIPPING : 0;
}

export function expectedTotal(subtotal: Pence, couponCode: string | undefined): Pence {
  return subtotal - expectedDiscount(subtotal, couponCode) + expectedShipping(subtotal);
}

export function expectedTotals(subtotal: Pence, couponCode?: string) {
  return {
    subtotal,
    discount: expectedDiscount(subtotal, couponCode),
    shipping: expectedShipping(subtotal),
    total: expectedTotal(subtotal, couponCode),
  };
}
