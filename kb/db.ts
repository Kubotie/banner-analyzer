/**
 * KB永続層（ローカルストレージベース、MVP）
 * 本番環境ではDBに置き換える
 * 
 * 注意: この実装はクライアントサイド（localStorage）を使用しています。
 * サーバーサイド（API Routes）から呼び出す場合は、別の実装が必要です。
 */

import { KBItem, KBBaseMeta, KBPayload, BannerLayoutPayload } from './types';

const STORAGE_KEY = 'kb_items';
const ACTIVE_CONTEXT_KEY = 'active_context';

/**
 * KBアイテム一覧を取得（メタのみ）
 */
export function getKBItemsMeta(
  filters?: {
    q?: string; // 検索クエリ（title/tags対象）
    type?: string;
    folder_path?: string;
    owner_id?: string;
  }
): KBBaseMeta[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const items: KBItem[] = JSON.parse(stored);
    let filtered = items.filter((item) => !item.deleted_at);

    // フィルタ適用
    if (filters) {
      if (filters.q) {
        const q = filters.q.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      if (filters.type) {
        filtered = filtered.filter((item) => item.type === filters.type);
      }
      if (filters.folder_path) {
        filtered = filtered.filter((item) => item.folder_path === filters.folder_path);
      }
      if (filters.owner_id) {
        filtered = filtered.filter((item) => item.owner_id === filters.owner_id);
      }
    }

    // updated_at descでソート
    filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // メタのみ返す（payloadを除外）
    return filtered.map(({ payload, ...meta }) => meta);
  } catch (error) {
    console.error('Failed to load KB items:', error);
    return [];
  }
}

/**
 * KBアイテム詳細を取得（メタ + ペイロード）
 */
export function getKBItem(kbId: string): KBItem | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const items: KBItem[] = JSON.parse(stored);
    const item = items.find((item) => item.kb_id === kbId && !item.deleted_at);
    return item || null;
  } catch (error) {
    console.error('Failed to load KB item:', error);
    return null;
  }
}

/**
 * KBアイテムを作成
 */
export function createKBItem(item: KBItem): KBItem {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const items: KBItem[] = stored ? JSON.parse(stored) : [];

    // 既存のアイテムをチェック（同じkb_idがある場合はエラー）
    if (items.some((i) => i.kb_id === item.kb_id)) {
      throw new Error(`KB item with id ${item.kb_id} already exists`);
    }

    items.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return item;
  } catch (error) {
    console.error('Failed to create KB item:', error);
    throw error;
  }
}

/**
 * KBアイテムを更新
 */
export function updateKBItem(
  kbId: string,
  updates: {
    title?: string;
    folder_path?: string;
    tags?: string[];
    visibility?: 'private' | 'shared';
  }
): KBItem | null {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const items: KBItem[] = JSON.parse(stored);
    const index = items.findIndex((item) => item.kb_id === kbId && !item.deleted_at);

    if (index === -1) return null;

    const updated: KBItem = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    items[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return updated;
  } catch (error) {
    console.error('Failed to update KB item:', error);
    throw error;
  }
}

/**
 * KBアイテムを論理削除
 */
export function deleteKBItem(kbId: string): boolean {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const items: KBItem[] = JSON.parse(stored);
    const index = items.findIndex((item) => item.kb_id === kbId && !item.deleted_at);

    if (index === -1) return false;

    items[index] = {
      ...items[index],
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Failed to delete KB item:', error);
    throw error;
  }
}

/**
 * BannerLayoutを取得（imageIdで検索、最新1件）
 */
export function getBannerLayout(imageId: string): KBItem | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const items: KBItem[] = JSON.parse(stored);
    const layoutItems = items.filter(
      (item) =>
        item.type === 'banner_layout' &&
        !item.deleted_at &&
        (item.payload as BannerLayoutPayload).imageId === imageId
    );

    if (layoutItems.length === 0) return null;

    // updated_at descでソートして最新1件を返す
    layoutItems.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return layoutItems[0];
  } catch (error) {
    console.error('Failed to get banner layout:', error);
    return null;
  }
}

/**
 * ActiveContextを取得
 */
export function getActiveContext(): any | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(ACTIVE_CONTEXT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load active context:', error);
    return null;
  }
}

/**
 * ActiveContextを設定
 */
export function setActiveContext(context: any): void {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  try {
    const contextWithTimestamp = {
      ...context,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(ACTIVE_CONTEXT_KEY, JSON.stringify(contextWithTimestamp));
  } catch (error) {
    console.error('Failed to save active context:', error);
    throw error;
  }
}

/**
 * 自動命名を生成
 */
export function generateKBTitle(type: string, label?: string): string {
  const typeLabels: Record<string, string> = {
    persona: 'Persona',
    banner: 'Banner',
    insight: 'Insight',
    report: 'Report',
    option: 'Option',
    plan: 'Plan',
  };

  const typeLabel = typeLabels[type] || type;
  const timestamp = Date.now();
  const suffix = label ? `_${label}` : '';

  return `KB-${typeLabel}-${timestamp}${suffix}`;
}
