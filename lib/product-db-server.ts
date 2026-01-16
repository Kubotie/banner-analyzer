/**
 * Product永続層（サーバーサイド用、ファイルシステムベース）
 * API Routesから使用
 */

import { Product } from '@/types/product';
import { promises as fs } from 'fs';
import path from 'path';

// データファイルのパス
const DATA_DIR = path.join(process.cwd(), '.data');
const PRODUCT_FILE = path.join(DATA_DIR, 'products.json');

// データを読み込む
async function loadData(): Promise<Product[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(PRODUCT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('[product-db-server] Failed to load data:', error);
    return [];
  }
}

/**
 * Productを取得（サーバーサイド用）
 */
export async function getProduct(productId: string): Promise<Product | null> {
  try {
    const products = await loadData();
    return products.find((p) => p.productId === productId && !p.deletedAt) || null;
  } catch (error) {
    console.error('[product-db-server] Failed to get product:', error);
    return null;
  }
}
