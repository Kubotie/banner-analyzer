/**
 * SavedExtraction永続層（ローカルストレージベース、MVP）
 */

import { SavedExtraction } from '@/types/extraction-saved';

const STORAGE_KEY = 'saved_extractions';

/**
 * SavedExtraction一覧を取得
 */
export function getSavedExtractions(filters?: {
  productId?: string;
  q?: string; // 検索（title/tags/notes）
}): SavedExtraction[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    let extractions: SavedExtraction[] = JSON.parse(stored);
    extractions = extractions.filter((e) => !e.deletedAt);

    // フィルタ適用
    if (filters) {
      if (filters.productId) {
        extractions = extractions.filter((e) => e.productId === filters.productId);
      }
      if (filters.q) {
        const q = filters.q.toLowerCase();
        extractions = extractions.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.tags && e.tags.some((tag) => tag.toLowerCase().includes(q))) ||
            (e.notes && e.notes.toLowerCase().includes(q))
        );
      }
    }

    // updatedAt descでソート
    extractions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return extractions;
  } catch (error) {
    console.error('Failed to load saved extractions:', error);
    return [];
  }
}

/**
 * SavedExtractionを取得
 */
export function getSavedExtraction(extractionId: string): SavedExtraction | null {
  if (typeof window === 'undefined') return null;

  try {
    const extractions = getSavedExtractions();
    return extractions.find((e) => e.extractionId === extractionId) || null;
  } catch (error) {
    console.error('Failed to get saved extraction:', error);
    return null;
  }
}

/**
 * SavedExtractionを作成
 */
export function createSavedExtraction(extraction: Omit<SavedExtraction, 'extractionId' | 'createdAt' | 'updatedAt'>): SavedExtraction {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const newExtraction: SavedExtraction = {
    ...extraction,
    extractionId: generateUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const stored = localStorage.getItem(STORAGE_KEY);
  const extractions: SavedExtraction[] = stored ? JSON.parse(stored) : [];
  extractions.push(newExtraction);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extractions));

  return newExtraction;
}

/**
 * SavedExtractionを更新
 */
export function updateSavedExtraction(extractionId: string, updates: Partial<Omit<SavedExtraction, 'extractionId' | 'createdAt'>>): SavedExtraction {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('Saved extractions not found');

  const extractions: SavedExtraction[] = JSON.parse(stored);
  const index = extractions.findIndex((e) => e.extractionId === extractionId);
  
  if (index === -1) {
    throw new Error(`Saved extraction not found: ${extractionId}`);
  }

  const updated: SavedExtraction = {
    ...extractions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  extractions[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extractions));

  return updated;
}

/**
 * SavedExtractionを削除（論理削除）
 */
export function deleteSavedExtraction(extractionId: string): void {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('Saved extractions not found');

  const extractions: SavedExtraction[] = JSON.parse(stored);
  const index = extractions.findIndex((e) => e.extractionId === extractionId);
  
  if (index === -1) {
    throw new Error(`Saved extraction not found: ${extractionId}`);
  }

  extractions[index].deletedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extractions));
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
