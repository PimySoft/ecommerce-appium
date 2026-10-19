import LoginPage from '../pageobjects/LoginPage.js';
import ProductDetailPage from '../pageobjects/ProductDetailPage.js';
import { resetApp } from './appLifecycle.js';
import { seededUser } from '../fixtures/users.js';
import type { Product } from '../fixtures/products.js';

/**
 * Shared setup flows. Each starts with `resetApp()`, so a test gets the same
 * baseline whether it runs alone or after any other test, and can rely on
 * nothing from a previous one.
 */
async function loginAsSeededUser(): Promise<void> {
  await LoginPage.openFromHome();
  await LoginPage.login(seededUser.email, seededUser.password);
}

/** Signed out, one product in the cart, no coupon; lands on the Cart screen. */
export async function setUpGuestCartWithProduct(product: Product): Promise<void> {
  await resetApp();
  await ProductDetailPage.addProductToCart(product);
}

/** Signed in, one product in the cart, no coupon; lands on the Cart screen. */
export async function setUpCartWithProduct(product: Product): Promise<void> {
  await resetApp();
  await loginAsSeededUser();
  await ProductDetailPage.addProductToCart(product);
}
