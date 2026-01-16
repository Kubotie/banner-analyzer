/**
 * PersonaHistory永続層（ローカルストレージベース、MVP）
 */

import { PersonaHistory } from '@/types/persona-history';

const STORAGE_KEY = 'persona-histories';

/**
 * UUID生成（簡易実装）
 */
function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * PersonaHistory一覧を取得
 */
export function getPersonaHistories(): PersonaHistory[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const histories: PersonaHistory[] = JSON.parse(stored);
    // updatedAt descでソート
    histories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return histories;
  } catch (error) {
    console.error('Failed to load persona histories:', error);
    return [];
  }
}

/**
 * PersonaHistoryを取得
 */
export function getPersonaHistory(historyId: string): PersonaHistory | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const histories: PersonaHistory[] = JSON.parse(stored);
    return histories.find((h) => h.historyId === historyId) || null;
  } catch (error) {
    console.error('Failed to load persona history:', error);
    return null;
  }
}

/**
 * PersonaHistoryを作成
 */
export function createPersonaHistory(history: Omit<PersonaHistory, 'historyId' | 'createdAt' | 'updatedAt'>): PersonaHistory {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const newHistory: PersonaHistory = {
    ...history,
    historyId: generateUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const stored = localStorage.getItem(STORAGE_KEY);
  const histories: PersonaHistory[] = stored ? JSON.parse(stored) : [];
  histories.push(newHistory);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));

  return newHistory;
}

/**
 * PersonaHistoryを更新
 */
export function updatePersonaHistory(historyId: string, updates: Partial<Omit<PersonaHistory, 'historyId' | 'createdAt'>>): PersonaHistory {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('Persona histories not found');

  const histories: PersonaHistory[] = JSON.parse(stored);
  const index = histories.findIndex((h) => h.historyId === historyId);

  if (index === -1) {
    throw new Error(`Persona history not found: ${historyId}`);
  }

  const updated: PersonaHistory = {
    ...histories[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  histories[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));

  return updated;
}

/**
 * PersonaHistoryを削除
 */
export function deletePersonaHistory(historyId: string): void {
  if (typeof window === 'undefined') throw new Error('localStorage is not available');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('Persona histories not found');

  const histories: PersonaHistory[] = JSON.parse(stored);
  const filtered = histories.filter((h) => h.historyId !== historyId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * ステップ名を日本語に変換
 */
export function getStepName(step: PersonaHistory['currentStep']): string {
  const stepNames: Record<PersonaHistory['currentStep'], string> = {
    extraction: 'Extraction',
    'extraction-review': 'Extraction確認',
    aggregation: 'Aggregation',
    'persona-axis': 'ペルソナ軸',
    summary: 'Summary',
    comparison: '比較',
    'knowledge-base': 'ナレッジベース',
  };
  return stepNames[step] || step;
}
