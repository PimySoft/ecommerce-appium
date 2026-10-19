// Backend seed products. Unit price is flat regardless of size, in integer pence.
// `categoryFilter` is the products-screen filter slug used to reach the product.
export interface Product {
  id: string;
  name: string;
  pricePence: number;
  size: string;
  categoryFilter: string;
}

export const products: Record<'primary' | 'secondary', Product> = {
  primary: { id: 'p-canvas-cap', name: 'Canvas Cap', pricePence: 1899, size: 'M', categoryFilter: 'hats' },
  secondary: { id: 'p-fleece-jacket', name: 'Fleece Jacket', pricePence: 3499, size: 'M', categoryFilter: 'jackets' },
};

// Two primary units = £37.98, so 25% is £9.495: a half-penny that must round to £9.50.
export const roundingBoundary = { product: products.primary, quantity: 2 };
