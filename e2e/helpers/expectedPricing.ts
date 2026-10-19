// The documented pricing rule, in integer pence. Never import the app's or the backend's pricing code here:
// a test would then only compare the app with itself.
export type Pence = number;

const VALID_COUPON = 'SAVE25';
const DISCOUNT_PERCENT = 25;
const FLAT_SHIPPING: Pence = 500;

export function parsePence(text: string): Pence {
  const match = text.trim().match(/^(-?)£(\d+)\.(\d{2})$/);
  if (!match) throw new Error(`Unrecognised currency text: "${text}"`);
  const [, sign, pounds, pennies] = match;
  return (sign === '-' ? -1 : 1) * (Number(pounds) * 100 + Number(pennies));
}

export function formatPence(pence: Pence): string {
  return `${pence < 0 ? '-' : ''}£${(Math.abs(pence) / 100).toFixed(2)}`;
}

export function lineSubtotal(product: { pricePence: Pence }, quantity = 1): Pence {
  return product.pricePence * quantity;
}

export function isValidCoupon(couponCode: string | undefined): boolean {
  return (
    String(couponCode ?? '')
      .trim()
      .toUpperCase() === VALID_COUPON
  );
}

export function expectedDiscount(subtotal: Pence, couponCode: string | undefined): Pence {
  if (!isValidCoupon(couponCode)) return 0;
  const discount = Math.floor((subtotal * DISCOUNT_PERCENT + 50) / 100); // rounds half a penny up
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
