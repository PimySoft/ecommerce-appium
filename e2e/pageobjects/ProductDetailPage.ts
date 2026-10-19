import BasePage from './BasePage.js';
import type { Product } from '../fixtures/products.js';
import { goBack } from '../helpers/gestures.js';
import { APP_LAUNCH_TIMEOUT, ELEMENT_TIMEOUT } from '../helpers/timeouts.js';

class ProductDetailPage extends BasePage {
  // Home and Products only exist to reach a product, so that navigation lives here.
  get homeShopNowButton() { return this.byTestId('home_shop_now_button'); }
  categoryFilter(categoryFilter: string) { return this.byTestId(`products_filter_${categoryFilter}`); }
  productCard(productId: string) { return this.byTestId(`products_product_card_${productId}`); }
  sizeSelector(size: string) { return this.byTestId(`product_detail_size_selector_${size}`); }
  get addToCartButton() { return this.byTestId('product_detail_add_button'); }
  /** Where Add to Cart lands. */
  get cartProceedButton() { return this.byTestId('cart_proceed_button'); }

  /** Selects the category filter first: the default newest-first list pushes the fixture products off-screen. */
  async openFromHome(productId: string, categoryFilter: string): Promise<void> {
    await this.tapAndRetryIfStuck(this.homeShopNowButton);
    await this.waitForDisplayedAndTap(this.categoryFilter(categoryFilter));
    await this.tapAndRetryIfStuck(this.productCard(productId));
  }

  async selectSize(size: string): Promise<void> {
    await this.waitForDisplayedAndTap(this.sizeSelector(size));
  }

  /** Navigates to Cart on success, so a retry cannot add the product twice. */
  async addToCart(): Promise<void> {
    await this.tapAndRetryIfStuck(this.addToCartButton);
  }

  async addProductToCart(product: Product): Promise<void> {
    await this.openFromHome(product.id, product.categoryFilter);
    await this.selectSize(product.size);
    await this.addToCart();
  }

  /**
   * From the Cart (where Add to Cart lands), pops back through the product
   * screen to Products and adds another product, or the same one again to raise
   * its quantity (the app has no quantity control). Products keeps its own
   * category filter, so the target's filter is selected again.
   */
  async addAnotherProduct(product: Product): Promise<void> {
    // Each back waits for the screen it starts from: a back sent while Add to Cart was still navigating popped
    // product -> Products -> Home instead (seen on Android).
    await $(this.cartProceedButton).waitForDisplayed({ timeout: ELEMENT_TIMEOUT });
    await goBack(); // Cart -> product
    await $(this.addToCartButton).waitForDisplayed({ timeout: ELEMENT_TIMEOUT });
    await goBack(); // product -> Products
    await this.waitForDisplayedAndTap(this.categoryFilter(product.categoryFilter));
    await this.tapAndRetryIfStuck(this.productCard(product.id));
    await this.selectSize(product.size);
    await this.addToCart();
  }

  /** Blocks until the Home screen is showing, e.g. after an app relaunch. */
  async waitForHome(timeout = APP_LAUNCH_TIMEOUT): Promise<void> {
    await $(this.homeShopNowButton).waitForDisplayed({ timeout });
  }
}

export default new ProductDetailPage();
