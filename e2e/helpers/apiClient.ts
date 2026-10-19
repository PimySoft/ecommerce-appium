import { seededUser } from '../fixtures/users.js';
import type { Pence } from './expectedPricing.js';

export const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

export interface CartLine {
  productId: string;
  size: string;
  quantity: number;
}

export interface ApiResponse<T> {
  status: number;
  body: T;
}

export interface CartSummary {
  couponCode: string | null;
  couponApplied: boolean;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export interface StoredOrder {
  id: string;
  orderNumber: string;
  userId: string;
  couponCode: string | null;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  status: string;
}

export interface OrderRequest {
  items: CartLine[];
  couponCode?: string;
  customer: { name: string; email: string };
  shipping: { address: string; city: string; postcode: string };
}

export const toPence = (pounds: number): Pence => Math.round(pounds * 100);

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: (await response.json()) as T };
}

export async function assertBackendUp(): Promise<void> {
  try {
    const { status } = await request('GET', '/api/health');
    if (status !== 200) throw new Error(`health check returned ${status}`);
  } catch (err) {
    throw new Error(
      `Backend not reachable at ${API_URL} (${err}). Start it with "npm run dev:backend" from the repo root, ` +
        'or set API_URL.',
    );
  }
}

export async function login(email = seededUser.email, password = seededUser.password): Promise<string> {
  const { status, body } = await request<{ token: string }>('POST', '/api/auth/login', { body: { email, password } });
  if (status !== 200) throw new Error(`Login as ${email} failed with ${status}`);
  return body.token;
}

export function cartSummary(items: CartLine[], couponCode?: string): Promise<ApiResponse<CartSummary>> {
  return request('POST', '/api/cart/summary', { body: { items, couponCode } });
}

export function createOrder(
  token: string | undefined,
  order: OrderRequest,
): Promise<ApiResponse<{ order: StoredOrder }>> {
  return request('POST', '/api/orders', { body: order, token });
}

export function getOrder(token: string, id: string): Promise<ApiResponse<{ order: StoredOrder }>> {
  return request('GET', `/api/orders/${id}`, { token });
}
