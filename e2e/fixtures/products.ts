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

// 2 × £18.99 = £37.98, and 25% of that is £9.495: a half penny.
export const roundingBoundary = { product: products.primary, quantity: 2 };
