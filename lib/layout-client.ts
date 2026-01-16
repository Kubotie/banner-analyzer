/**
 * Banner Layout保存/復元クライアント
 */

import { Component } from '@/types/schema';
import { BannerLayoutPayload } from '@/kb/types';
import { BannerLayoutPayloadSchema } from '@/kb/schemas';
import { createKBItem, getBannerLayout, generateKBTitle } from '@/kb/db';
import { updateImageAsset } from '@/lib/image-asset-db';
import { migrateType, getBBoxTypeLabel } from './bbox-types';
// UUID生成関数（kb/db.tsと同じ実装を使用）
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 手動BBoxをBannerLayoutPayloadに変換して保存
 */
export async function saveBannerLayout(
  imageId: string,
  manualComponents: Component[],
  options?: {
    productId?: string;
    title?: string;
    notes?: string;
  }
): Promise<string> {
  // 手動BBoxのみを抽出（source==='manual'）
  const manualBBoxes = manualComponents.filter((comp) => (comp as any).source === 'manual');

  if (manualBBoxes.length === 0) {
    throw new Error('保存する手動BBoxがありません');
  }

  // BannerLayoutPayloadを作成
  const payload: BannerLayoutPayload = {
    type: 'banner_layout',
    schemaVersion: 1,
    imageId,
    productId: options?.productId,
    title: options?.title,
    updatedAt: new Date().toISOString(),
    components: manualBBoxes.map((comp) => {
      // Componentのtypeをkeyにマッピング
      const keyMap: Record<string, 'product_image' | 'logo' | 'price' | 'cta' | 'limited' | 'other'> = {
        '商品画像': 'product_image',
        'product_image': 'product_image',
        'ロゴ': 'logo',
        'logo': 'logo',
        '価格': 'price',
        'price': 'price',
        'CTA': 'cta',
        'cta': 'cta',
        '期間限定': 'limited',
        'limited': 'limited',
      };
      const key = keyMap[comp.type] || 'other';

      return {
        key,
        label: comp.text || comp.type,
        bbox: {
          x: Math.max(0, Math.min(1, comp.bbox.x)),
          y: Math.max(0, Math.min(1, comp.bbox.y)),
          w: Math.max(0.001, Math.min(1, comp.bbox.w)),
          h: Math.max(0.001, Math.min(1, comp.bbox.h)),
          coord: 'normalized' as const,
        },
        source: 'manual' as const,
      };
    }),
    notes: options?.notes,
  };

  // Zod検証
  const validated = BannerLayoutPayloadSchema.parse(payload);

  // KBアイテムを作成
  const kbItem = {
    kb_id: generateUUID(),
    type: 'banner_layout' as const,
    title: validated.title || generateKBTitle('banner_layout', validated.title),
    folder_path: 'My Files/Banners',
    tags: ['layout', 'manual'],
    owner_id: 'user',
    visibility: 'private' as const,
    source_app: 'banner-analyzer',
    source_project_id: validated.productId,
    source_refs: [imageId],
    created_at: new Date().toISOString(),
    updated_at: validated.updatedAt,
    payload: validated,
  };

  // KBに保存
  const saved = createKBItem(kbItem);

  // ImageAssetを更新
  try {
    updateImageAsset(imageId, {
      hasManualLayout: true,
      lastLayoutKbId: saved.kb_id,
    });
  } catch (error) {
    console.warn('ImageAsset更新に失敗（無視）:', error);
  }

  return saved.kb_id;
}

/**
 * BannerLayoutを復元してComponentsに変換
 */
export function restoreBannerLayout(layout: BannerLayoutPayload): Component[] {
  return layout.components.map((comp, idx) => {
    // keyをtypeKeyにマッピング（新形式）
    const typeKey = migrateType(comp.key || 'main_copy');
    const typeLabel = getBBoxTypeLabel(typeKey);

    return {
      id: `comp-manual-${idx}`,
      type: typeLabel, // 旧形式互換用
      typeKey, // 新形式
      typeLabel, // UI表示用
      text: comp.label,
      bbox: {
        ...comp.bbox,
        coord: 'normalized' as const,
      },
      source: 'manual' as const,
    } as Component;
  });
}
