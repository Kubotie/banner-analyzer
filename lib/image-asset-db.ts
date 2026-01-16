/**
 * ImageAsset永続層（ローカルストレージベース、MVP）
 */

import { ImageAsset } from '@/types/image-asset';

const STORAGE_KEY = 'image_assets';

/**
 * ImageAsset一覧を取得
 */
export function getImageAssets(filters?: {
  productId?: string;
  hasExtraction?: boolean;
  q?: string; // 検索（title/tags/notes）
}): ImageAsset[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    let assets: ImageAsset[] = JSON.parse(stored);
    assets = assets.filter((a) => !a.deletedAt);

    // フィルタ適用
    if (filters) {
      if (filters.productId) {
        assets = assets.filter((a) => a.productId === filters.productId);
      }
      if (filters.hasExtraction !== undefined) {
        assets = assets.filter((a) => a.hasExtraction === filters.hasExtraction);
      }
      if (filters.q) {
        const q = filters.q.toLowerCase();
        assets = assets.filter(
          (a) =>
            (a.title && a.title.toLowerCase().includes(q)) ||
            (a.tags && a.tags.some((tag) => tag.toLowerCase().includes(q))) ||
            (a.notes && a.notes.toLowerCase().includes(q))
        );
      }
    }

    // updatedAt descでソート
    assets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return assets;
  } catch (error) {
    console.error('Failed to load image assets:', error);
    return [];
  }
}

/**
 * ImageAssetを取得
 */
export function getImageAsset(imageId: string): ImageAsset | null {
  if (typeof window === 'undefined') return null;

  try {
    const assets = getImageAssets();
    return assets.find((a) => a.imageId === imageId) || null;
  } catch (error) {
    console.error('Failed to get image asset:', error);
    return null;
  }
}

/**
 * ImageAssetを作成
 */
export function createImageAsset(asset: Omit<ImageAsset, 'imageId' | 'createdAt' | 'updatedAt'>): ImageAsset {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const newAsset: ImageAsset = {
    ...asset,
    imageId: generateUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const stored = localStorage.getItem(STORAGE_KEY);
  const assets: ImageAsset[] = stored ? JSON.parse(stored) : [];
  assets.push(newAsset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));

  return newAsset;
}

/**
 * ImageAssetを更新
 */
export function updateImageAsset(imageId: string, updates: Partial<Omit<ImageAsset, 'imageId' | 'createdAt'>>): ImageAsset {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('Image assets not found');

  const assets: ImageAsset[] = JSON.parse(stored);
  const index = assets.findIndex((a) => a.imageId === imageId);
  
  if (index === -1) {
    throw new Error(`Image asset not found: ${imageId}`);
  }

  const updatedAsset: ImageAsset = {
    ...assets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  assets[index] = updatedAsset;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));

  return updatedAsset;
}

/**
 * ImageAssetを削除（論理削除）
 */
export function deleteImageAsset(imageId: string): void {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('Image assets not found');

  const assets: ImageAsset[] = JSON.parse(stored);
  const index = assets.findIndex((a) => a.imageId === imageId);
  
  if (index === -1) {
    throw new Error(`Image asset not found: ${imageId}`);
  }

  assets[index].deletedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
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
