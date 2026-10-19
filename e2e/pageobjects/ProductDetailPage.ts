import BasePage from './BasePage.js';
import type { Product } from '../fixtures/products.js';
import { goBack } from '../helpers/gestures.js';
import { APP_LAUNCH_TIMEOUT } from '../helpers/timeouts.js';

class ProductDetailPage extends BasePage {
  get homeShopNowButton() {
    return this.byTestId('home_shop_now_button');
  }
  get addToCartButton() {
    return this.byTestId('product_detail_add_button');
  }
  get cartProceedButton() {
    return this.byTestId('cart_proceed_button');
  }

  categoryFilter(slug: string) {
    return this.byTestId(`products_filter_${slug}`);
  }
  productCard(productId: string) {
    return this.byTestId(`products_product_card_${productId}`);
  }
  sizeSelector(size: string) {
    return this.byTestId(`product_detail_size_selector_${size}`);
  }

  async waitForHome(): Promise<void> {
    await this.waitForDisplayed(this.homeShopNowButton, APP_LAUNCH_TIMEOUT);
  }

  async addProductToCart(product: Product): Promise<void> {
    await this.tap(this.homeShopNowButton);
    await this.chooseAndAdd(product);
  }

  // The app has no quantity control: adding the same product again raises its quantity.
  async addAnotherProduct(product: Product): Promise<void> {
    await this.waitForDisplayed(this.cartProceedButton);
    await goBack();
    await this.waitForDisplayed(this.addToCartButton);
    await goBack();
    await this.chooseAndAdd(product);
  }

  // The product list is newest first, which puts the test products below the fold; filtering brings them on screen.
  private async chooseAndAdd(product: Product): Promise<void> {
    await this.tap(this.categoryFilter(product.categoryFilter));
    await this.tap(this.productCard(product.id));
    await this.tap(this.sizeSelector(product.size));
    await this.tap(this.addToCartButton);
  }
}

export default new ProductDetailPage();
