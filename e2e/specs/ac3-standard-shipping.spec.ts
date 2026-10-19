import { expect } from 'chai';
import CartPage from '../pageobjects/CartPage.js';
import ProductDetailPage from '../pageobjects/ProductDetailPage.js';
import { setUpCartWithProduct } from '../helpers/cartSetup.js';
import { products } from '../fixtures/products.js';
import { expectedShipping, formatPence, lineSubtotal } from '../helpers/expectedPricing.js';

describe('AC-3: flat shipping charge', () => {
  beforeEach(async () => {
    await setUpCartWithProduct(products.primary);
  });

  it('AC-3: one item in the basket costs £5.00 to ship', async () => {
    const subtotal = lineSubtotal(products.primary);
    expect(await CartPage.getSubtotal(), 'displayed subtotal should be the product price × 1').to.equal(subtotal);

    const shipping = await CartPage.getShipping();

    expect(shipping).to.equal(expectedShipping(subtotal));
    expect(shipping, `shipping should be the flat ${formatPence(500)}`).to.equal(500);
  });

  it('AC-3: adding a second product leaves shipping at £5.00', async () => {
    await ProductDetailPage.addAnotherProduct(products.secondary);

    const subtotal = lineSubtotal(products.primary) + lineSubtotal(products.secondary);
    expect(await CartPage.getSubtotal(), 'displayed subtotal should be both product prices').to.equal(subtotal);

    const shipping = await CartPage.getShipping();

    expect(shipping).to.equal(expectedShipping(subtotal));
    expect(shipping, `shipping should be the flat ${formatPence(500)}`).to.equal(500);
  });
});
