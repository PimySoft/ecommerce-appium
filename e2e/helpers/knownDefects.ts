/**
 * Defects the suite has found, and the title tag that links a test to them.
 *
 * A test that documents a defect carries `@known-defect SHOP-101-D<n>` at the end of its title, once per defect it
 * depends on. Its assertions are never changed to make it pass; the tag only tells `scripts/defect-report.ts`
 * that a red result is expected.
 */
export const knownDefects: Record<string, string> = {
  'SHOP-101-D1': 'SAVE25 is applied as a fixed amount instead of a percentage of the subtotal, in both the app and the API',
  'SHOP-101-D2': 'The order confirmation screen does not show the coupon or the discount',
  'SHOP-101-D3': 'The coupon is lost when a signed-out shopper is sent to sign in before checkout',
};

/** Defect ids named by `@known-defect` tags in a test title (empty when the test is untagged). */
export function defectTagsIn(title: string): string[] {
  return [...title.matchAll(/@known-defect\s+(SHOP-101-D\d+)/g)].map((match) => match[1]);
}
