/**
 * KB共通保存/検索API
 * 全KB typeがこの共通関数を使う
 */

import { z } from 'zod';
import { getKBItem, getKBItemsMeta, updateKBItem } from './db';
import type { KBKind, KBSource, KBMeta, KBPayloadBase } from './common';
import {
  KBMetaSchema,
  KBPayloadBaseSchema,
  InsightPayloadBaseSchema,
  BannerAutoLayoutPayloadSchema,
  BannerInsightPayloadSchema,
  MarketInsightPayloadSchema,
  StrategyOptionPayloadSchema,
  PlanningHookPayloadSchema,
} from './common-schemas';
import type {
  BannerAutoLayoutPayload,
  BannerInsightPayload,
  MarketInsightPayload,
  StrategyOptionPayload,
  PlanningHookPayload,
} from './common';

/**
 * UUID生成（簡易実装）
 */
function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * KBアイテムを保存（共通関数）
 */
export async function saveKbItem<TPayload extends KBPayloadBase>(
  kind: KBKind,
  payload: TPayload,
  meta: {
    title?: string;
    productId?: string;
    imageId?: string;
    relatedKbIds?: string[];
    tags?: string[];
    source?: KBSource;
  }
): Promise<string> {
  try {
    // ペイロードの検証（kindに応じたスキーマで）
    let validatedPayload: any;
    switch (kind) {
      case 'banner_auto_layout':
        validatedPayload = BannerAutoLayoutPayloadSchema.parse(payload);
        break;
      case 'banner_insight':
        validatedPayload = BannerInsightPayloadSchema.parse(payload);
        break;
      case 'market_insight':
        validatedPayload = MarketInsightPayloadSchema.parse(payload);
        break;
      case 'strategy_option':
        validatedPayload = StrategyOptionPayloadSchema.parse(payload);
        break;
      case 'planning_hook':
        validatedPayload = PlanningHookPayloadSchema.parse(payload);
        break;
      default:
        // その他のkindは基本スキーマで検証
        validatedPayload = KBPayloadBaseSchema.parse(payload);
    }

    // 既存のKBItem形式に変換（後方互換のため）
    // 注意: 既存のKBItem型と互換性を保つため、typeマッピングが必要
    const legacyType = kind === 'banner_auto_layout' ? 'banner_layout' : 
                       kind === 'banner_insight' ? 'insight' :
                       kind === 'market_insight' ? 'insight' :
                       kind === 'strategy_option' ? 'option' :
                       kind === 'planning_hook' ? 'plan' : kind as any;

    // タイトルを生成
    const title = meta.title || generateKBTitle(kind);

    console.log(`[KB保存] 開始: kind=${kind}, title=${title}`);
    
    // APIエンドポイント経由で保存
    // 注意: MarketInsight/StrategyOption/PlanningHookは既にmeta/payload構造を持っているため、
    // 追加のmetaを上書きしないようにする
    let payloadToSend: any;
    if (kind === 'market_insight' || kind === 'strategy_option' || kind === 'planning_hook') {
      // 既にmeta/payload構造を持っている場合は、そのまま使用
      // _kindのみ追加（識別用）
      payloadToSend = {
        ...validatedPayload,
        _kind: kind,
      };
    } else {
      // その他のkindは、metaを追加
      payloadToSend = {
        ...validatedPayload,
        _kind: kind,
        meta: {
          productId: meta.productId,
          imageId: meta.imageId,
          relatedKbIds: meta.relatedKbIds,
        },
      };
    }
    
    const response = await fetch('/api/kb/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: legacyType,
        title,
        folder_path: 'My Files',
        tags: meta.tags || [],
        owner_id: 'user',
        visibility: 'private',
        source_app: 'banner-analyzer',
        source_project_id: meta.productId,
        payload: payloadToSend,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to save KB item';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
        console.error(`[KB保存] APIエラー:`, errorData);
      } catch (parseError) {
        if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
          errorMessage = `APIエラー (${response.status}): HTMLエラーページが返されました。`;
        } else {
          errorMessage = `APIエラー (${response.status}): ${errorText.substring(0, 200)}`;
        }
        console.error(`[KB保存] APIエラー:`, errorMessage);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[KB保存] 成功: kb_id=${data.item.kb_id}, type=${data.item.type}`);
    
    return data.item.kb_id;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[KB保存] 検証エラー (${kind}):`, error.errors);
      throw new Error(`KB保存検証エラー: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    console.error(`[KB保存] エラー (${kind}):`, error);
    throw error;
  }
}

/**
 * KBアイテム一覧を取得（共通関数）
 */
export function listKbItems(filters?: {
  kind?: KBKind;
  productId?: string;
  imageId?: string;
  tags?: string[];
  limit?: number;
  sort?: 'createdAt' | 'updatedAt';
}): any[] {
  if (typeof window === 'undefined') return [];

  try {
    const allItems = getKBItemsMeta({
      type: filters?.kind === 'banner_auto_layout' || filters?.kind === 'banner_insight' ? 'insight' :
            filters?.kind === 'market_insight' ? 'insight' :
            filters?.kind === 'strategy_option' ? 'option' :
            filters?.kind === 'planning_hook' ? 'plan' :
            filters?.kind as any,
    });

    let filtered = allItems;

    // 追加フィルタ
    if (filters?.productId) {
      filtered = filtered.filter((item) => {
        const fullItem = getKBItem(item.kb_id);
        return fullItem && (fullItem.payload as any).meta?.productId === filters.productId;
      });
    }

    if (filters?.imageId) {
      filtered = filtered.filter((item) => {
        const fullItem = getKBItem(item.kb_id);
        return fullItem && (fullItem.payload as any).meta?.imageId === filters.imageId;
      });
    }

    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter((item) =>
        filters.tags!.some((tag) => item.tags.includes(tag))
      );
    }

    // ソート
    const sortKey = filters?.sort === 'createdAt' ? 'created_at' : 'updated_at';
    filtered.sort((a, b) => new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime());

    // リミット
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered.map((meta) => {
      const fullItem = getKBItem(meta.kb_id);
      return fullItem;
    }).filter(Boolean);
  } catch (error) {
    console.error('KB一覧取得エラー:', error);
    return [];
  }
}

/**
 * KBタイトルを自動生成
 */
function generateKBTitle(kind: KBKind): string {
  const kindLabels: Record<KBKind, string> = {
    persona: 'Persona',
    banner_layout: 'Banner Layout',
    banner_auto_layout: 'Auto Layout',
    banner_insight: 'Banner Insight',
    market_insight: 'Market Insight',
    strategy_option: 'Strategy Option',
    planning_hook: 'Planning Hook',
    report: 'Report',
    option: 'Option',
  };

  const kindLabel = kindLabels[kind] || kind;
  const timestamp = new Date().toLocaleDateString('ja-JP');
  return `${kindLabel}_${timestamp}`;
}
