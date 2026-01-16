/**
 * KB永続層（サーバーサイド用、ローカルストレージの代替）
 * API Routesから使用
 * 
 * 注意: 本番環境ではDBに置き換える必要があります。
 * 現在はファイルシステムベースの実装（JSONファイルに保存）
 */

import { KBItem, KBBaseMeta, KBPayload } from './types';
import { promises as fs } from 'fs';
import path from 'path';

// データファイルのパス
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'kb-items.json');

// データを読み込む
async function loadData(): Promise<KBItem[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合は空配列を返す
      return [];
    }
    console.error('[db-server] Failed to load data:', error);
    return [];
  }
}

// データを保存する
async function saveData(items: KBItem[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (error) {
    console.error('[db-server] Failed to save data:', error);
    throw error;
  }
}

/**
 * KBアイテム一覧を取得（メタのみ）
 */
export async function getKBItemsMeta(
  filters?: {
    q?: string;
    type?: string;
    folder_path?: string;
    owner_id?: string;
  }
): Promise<KBBaseMeta[]> {
  const memoryStore = await loadData();
  let filtered = memoryStore.filter((item) => !item.deleted_at);

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

  // メタのみ返す
  return filtered.map(({ payload, ...meta }) => meta);
}

/**
 * KBアイテム詳細を取得
 */
export async function getKBItem(kbId: string): Promise<KBItem | null> {
  console.log('[db-server] getKBItem called:', kbId);
  const memoryStore = await loadData();
  console.log('[db-server] memoryStore length:', memoryStore.length);
  console.log('[db-server] memoryStore kb_ids:', memoryStore.map(i => i.kb_id));
  const item = memoryStore.find((item) => item.kb_id === kbId && !item.deleted_at);
  console.log('[db-server] item found:', item ? item.kb_id : 'null');
  return item || null;
}

/**
 * KBアイテムを作成
 */
export async function createKBItem(item: KBItem): Promise<KBItem> {
  console.log('[db-server] createKBItem called:', item.kb_id, item.type);
  const memoryStore = await loadData();
  if (memoryStore.some((i) => i.kb_id === item.kb_id)) {
    throw new Error(`KB item with id ${item.kb_id} already exists`);
  }

  memoryStore.push(item);
  await saveData(memoryStore);
  console.log('[db-server] Item created. memoryStore length:', memoryStore.length);
  return item;
}

/**
 * KBアイテムを更新
 */
export async function updateKBItem(
  kbId: string,
  updates: {
    title?: string;
    folder_path?: string;
    tags?: string[];
    visibility?: 'private' | 'shared';
    payload?: KBPayload;
  }
): Promise<KBItem | null> {
  const memoryStore = await loadData();
  const index = memoryStore.findIndex((item) => item.kb_id === kbId && !item.deleted_at);

  if (index === -1) return null;

  const updated: KBItem = {
    ...memoryStore[index],
    ...updates,
    ...(updates.payload && { payload: updates.payload }),
    updated_at: new Date().toISOString(),
  };

  memoryStore[index] = updated;
  await saveData(memoryStore);
  return updated;
}

/**
 * KBアイテムを論理削除
 */
export async function deleteKBItem(kbId: string): Promise<boolean> {
  const memoryStore = await loadData();
  const index = memoryStore.findIndex((item) => item.kb_id === kbId && !item.deleted_at);

  if (index === -1) return false;

  memoryStore[index] = {
    ...memoryStore[index],
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await saveData(memoryStore);
  return true;
}

/**
 * ActiveContextを取得（サーバーサイドではメモリベース）
 */
let activeContext: any = null;

export function getActiveContext(): any | null {
  return activeContext;
}

/**
 * ActiveContextを設定
 */
export function setActiveContext(context: any): void {
  activeContext = {
    ...context,
    updated_at: new Date().toISOString(),
  };
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
