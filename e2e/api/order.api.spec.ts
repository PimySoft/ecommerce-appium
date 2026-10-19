import { expect } from 'chai';
import {
  assertBackendUp,
  createOrder,
  getOrder,
  login,
  toPence,
  type OrderRequest,
} from '../helpers/apiClient.js';
import { products } from '../fixtures/products.js';
import { coupons } from '../fixtures/coupons.js';
import { testShippingDetails } from '../fixtures/checkoutDetails.js';
import { expectedTotals, formatPence, lineSubtotal } from '../helpers/expectedPricing.js';

const orderFor = (couponCode?: string): OrderRequest => ({
  items: [{ productId: products.primary.id, size: products.primary.size, quantity: 1 }],
  couponCode,
  customer: { name: testShippingDetails.name, email: testShippingDetails.email },
  shipping: {
    address: testShippingDetails.address,
    city: testShippingDetails.city,
    postcode: testShippingDetails.postcode,
  },
});

describe('API: orders saved through POST /api/orders', () => {
  const subtotal = lineSubtotal(products.primary);
  let token: string;

  // Backend data is wiped on restart, so each test places its own order and never relies on an earlier run.
  before(async () => {
    await assertBackendUp();
    token = await login();
  });

  it('AC-6: API saves the coupon code with the order', async () => {
    const { status, body } = await createOrder(token, orderFor(coupons.valid));
    expect(status).to.equal(201);
    expect(body.order.couponCode, 'the saved order should carry the coupon code').to.equal(coupons.valid);
  });

  it('AC-6: API saves the expected discount with the order @known-defect SHOP-101-D1', async () => {
    const { body } = await createOrder(token, orderFor(coupons.valid));
    const expected = expectedTotals(subtotal, coupons.valid);
    expect(toPence(body.order.subtotal), 'saved subtotal should be the product price × 1').to.equal(subtotal);
    expect(
      toPence(body.order.discount),
      `the saved discount should be 25% of the subtotal (${formatPence(expected.discount)}), not a fixed amount; ` +
        'known defect SHOP-101-D1',
    ).to.equal(expected.discount);
  });

  it('AC-6: API saves the expected total with the order @known-defect SHOP-101-D1', async () => {
    const { body } = await createOrder(token, orderFor(coupons.valid));
    const expected = expectedTotals(subtotal, coupons.valid);
    expect(toPence(body.order.shipping_cost), 'saved shipping should be the flat £5.00').to.equal(expected.shipping);
    expect(
      toPence(body.order.total),
      `saved total should be ${formatPence(expected.total)} (${formatPence(subtotal)} − ${formatPence(expected.discount)} + ` +
        `${formatPence(expected.shipping)}); a wrong discount (known defect SHOP-101-D1) shows up here as well`,
    ).to.equal(expected.total);
  });

  it('AC-6: API order numbers follow the expected pattern', async () => {
    const { body } = await createOrder(token, orderFor(coupons.valid));
    // Order numbers come from a counter that carries over between runs, so only the pattern is checked.
    expect(body.order.orderNumber).to.match(/^WS-\d{4}-\d{6}$/);
  });

  it('AC-6: API returns the same coupon, discount and total when the order is fetched again', async () => {
    const { body: created } = await createOrder(token, orderFor(coupons.valid));
    const { status, body } = await getOrder(token, created.order.id);
    expect(status).to.equal(200);
    expect(body.order.couponCode).to.equal(created.order.couponCode);
    expect(body.order.discount).to.equal(created.order.discount);
    expect(body.order.total).to.equal(created.order.total);
  });

  it('AC-5: API saves no coupon or discount for an unknown code', async () => {
    const { status, body } = await createOrder(token, orderFor(coupons.invalid));
    const expected = expectedTotals(subtotal);
    expect(status).to.equal(201);
    expect(body.order.couponCode).to.equal(null);
    expect(toPence(body.order.discount)).to.equal(0);
    expect(toPence(body.order.total), 'total should be the expected no-coupon total').to.equal(expected.total);
  });

  it('AC-5: API saves no coupon or discount when the order has no coupon', async () => {
    const { body } = await createOrder(token, orderFor(undefined));
    expect(body.order.couponCode).to.equal(null);
    expect(toPence(body.order.discount)).to.equal(0);
    expect(toPence(body.order.total)).to.equal(expectedTotals(subtotal).total);
  });

  it('AC-6: API refuses an order with no sign-in token', async () => {
    const { status } = await createOrder(undefined, orderFor(coupons.valid));
    expect(status).to.equal(401);
  });
});
