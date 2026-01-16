/**
 * BannerHistory永続層（ローカルストレージベース、MVP）
 */

import { BannerHistory } from '@/types/banner-history';

const STORAGE_KEY = 'banner-histories';

/**
 * UUID生成（簡易実装）
 */
function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * BannerHistory一覧を取得
 */
export function getBannerHistories(): BannerHistory[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const histories: BannerHistory[] = JSON.parse(stored);
    // updatedAt descでソート
    histories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return histories;
  } catch (error) {
    console.error('Failed to load banner histories:', error);
    return [];
  }
}

/**
 * BannerHistoryを取得
 */
export function getBannerHistory(historyId: string): BannerHistory | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const histories: BannerHistory[] = JSON.parse(stored);
    return histories.find((h) => h.historyId === historyId) || null;
  } catch (error) {
    console.error('Failed to load banner history:', error);
    return null;
  }
}

/**
 * BannerHistoryを作成
 */
export function createBannerHistory(history: Omit<BannerHistory, 'historyId' | 'createdAt' | 'updatedAt'>): BannerHistory {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const newHistory: BannerHistory = {
    ...history,
    historyId: generateUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const stored = localStorage.getItem(STORAGE_KEY);
  const histories: BannerHistory[] = stored ? JSON.parse(stored) : [];
  histories.push(newHistory);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));

  return newHistory;
}

/**
 * BannerHistoryを更新
 */
export function updateBannerHistory(historyId: string, updates: Partial<Omit<BannerHistory, 'historyId' | 'createdAt'>>): BannerHistory {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('Banner histories not found');

  const histories: BannerHistory[] = JSON.parse(stored);
  const index = histories.findIndex((h) => h.historyId === historyId);

  if (index === -1) {
    throw new Error(`Banner history not found: ${historyId}`);
  }

  const updated: BannerHistory = {
    ...histories[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  histories[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));

  return updated;
}

/**
 * BannerHistoryを削除
 */
export function deleteBannerHistory(historyId: string): void {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('Banner histories not found');

  const histories: BannerHistory[] = JSON.parse(stored);
  const filtered = histories.filter((h) => h.historyId !== historyId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * タブ名を日本語に変換
 */
export function getTabName(tab: BannerHistory['currentTab']): string {
  const tabNames: Record<BannerHistory['currentTab'], string> = {
    analysis: '個別分析(A)',
    aggregation: '集計(B)',
    insight: '市場インサイト(C1)',
    strategy: '戦略オプション(C2)',
    planning: '企画フック(D)',
    persona: 'ペルソナ企画サマリー',
    summary: 'サマリー',
    images: '保存画像一覧',
  };
  return tabNames[tab] || tab;
}
