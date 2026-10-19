// The rule ignores letter case and surrounding spaces.
export const coupons = {
  valid: 'SAVE25',
  validLowercase: 'save25',
  validMixedCase: 'SaVe25',
  validWithWhitespace: ' SAVE25 ',
  invalid: 'INVALID10',
  empty: '',
};

// Note shown under the coupon field. Unknown and blank codes get the same message.
export const notes = {
  applied: /^Coupon applied: -£\d+\.\d{2}$/,
  invalid: 'That coupon is not valid.',
};
