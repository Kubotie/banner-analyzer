/**
 * Product永続層（ローカルストレージベース、MVP）
 */

import { Product } from '@/types/product';

const STORAGE_KEY = 'products';
const ACTIVE_PRODUCT_KEY = 'active_product';

/**
 * Product一覧を取得
 */
export function getProducts(): Product[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const products: Product[] = JSON.parse(stored);
    return products.filter((p) => !p.deletedAt);
  } catch (error) {
    console.error('Failed to load products:', error);
    return [];
  }
}

/**
 * Productを取得
 */
export function getProduct(productId: string): Product | null {
  if (typeof window === 'undefined') return null;

  try {
    const products = getProducts();
    return products.find((p) => p.productId === productId) || null;
  } catch (error) {
    console.error('Failed to get product:', error);
    return null;
  }
}

/**
 * Productを作成
 */
export function createProduct(product: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>): Product {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const newProduct: Product = {
    ...product,
    productId: generateUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const products = getProducts();
  products.push(newProduct);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));

  return newProduct;
}

/**
 * Productを更新
 */
export function updateProduct(productId: string, updates: Partial<Omit<Product, 'productId' | 'createdAt'>>): Product {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const products = getProducts();
  const index = products.findIndex((p) => p.productId === productId);
  
  if (index === -1) {
    throw new Error(`Product not found: ${productId}`);
  }

  const updatedProduct: Product = {
    ...products[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  products[index] = updatedProduct;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));

  return updatedProduct;
}

/**
 * Productを削除（論理削除）
 */
export function deleteProduct(productId: string): void {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const products = getProducts();
  const index = products.findIndex((p) => p.productId === productId);
  
  if (index === -1) {
    throw new Error(`Product not found: ${productId}`);
  }

  products[index].deletedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

/**
 * ActiveProductを取得
 */
export function getActiveProduct(): Product | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(ACTIVE_PRODUCT_KEY);
    if (!stored) return null;

    const productId = JSON.parse(stored);
    return getProduct(productId);
  } catch (error) {
    console.error('Failed to get active product:', error);
    return null;
  }
}

/**
 * ActiveProductを設定
 */
export function setActiveProduct(productId: string | null): void {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  if (productId === null) {
    localStorage.removeItem(ACTIVE_PRODUCT_KEY);
  } else {
    localStorage.setItem(ACTIVE_PRODUCT_KEY, JSON.stringify(productId));
  }
}

/**
 * UUID生成（簡易実装）
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
