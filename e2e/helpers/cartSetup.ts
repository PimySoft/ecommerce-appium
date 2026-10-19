import LoginPage from '../pageobjects/LoginPage.js';
import ProductDetailPage from '../pageobjects/ProductDetailPage.js';
import { resetApp } from './appLifecycle.js';
import { seededUser } from '../fixtures/users.js';
import type { Product } from '../fixtures/products.js';

// The Cart prices coupons the same way signed in or out, so only tests that reach Checkout sign in.
// Sign-in and cart state live in memory in the app, with no deep links, so they can only be built through the UI.

export async function setUpGuestCartWithProduct(product: Product): Promise<void> {
  await resetApp();
  await ProductDetailPage.addProductToCart(product);
}

export async function setUpSignedInCartWithProduct(product: Product): Promise<void> {
  await resetApp();
  await LoginPage.openFromHome();
  await LoginPage.login(seededUser.email, seededUser.password);
  await ProductDetailPage.addProductToCart(product);
}
