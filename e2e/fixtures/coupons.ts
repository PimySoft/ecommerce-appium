export const coupons = {
  valid: 'SAVE25',
  validLowercase: 'save25',
  validMixedCase: 'SaVe25',
  validWithWhitespace: ' SAVE25 ',
  invalid: 'INVALID10',
  empty: '',
};

export const notes = {
  applied: /^Coupon applied: -£\d+\.\d{2}$/,
  invalid: 'That coupon is not valid.',
};
