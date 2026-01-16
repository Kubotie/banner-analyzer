/**
 * Componentの移行処理（旧形式→新形式）
 */

import type { Component } from '@/types/schema';
import { migrateType, getBBoxTypeLabel, type BBoxTypeKey } from './bbox-types';

/**
 * Componentを新形式に移行（typeKey必須化、source enum化）
 */
export function migrateComponent(comp: Component): Component {
  // typeKeyが既にある場合はそのまま
  if (comp.typeKey && comp.typeKey in ['main_copy', 'sub_copy', 'product_image', 'main_visual', 'sub_visual', 'cta', 'logo', 'price_discount', 'limited_offer', 'icon_symbol', 'trust_element', 'qr_code', 'badge_label', 'face_photo']) {
    return {
      ...comp,
      typeKey: comp.typeKey as BBoxTypeKey,
      typeLabel: comp.typeLabel || getBBoxTypeLabel(comp.typeKey as BBoxTypeKey),
      source: normalizeSource(comp.source),
    };
  }
  
  // 旧形式から移行
  const typeKey = migrateType(comp.type);
  const typeLabel = getBBoxTypeLabel(typeKey);
  
  return {
    ...comp,
    typeKey,
    typeLabel,
    source: normalizeSource(comp.source),
    // idがない場合は生成
    id: comp.id || generateComponentId(),
  };
}

/**
 * sourceをenumに正規化
 */
function normalizeSource(source?: string): ComponentSource {
  if (source === 'manual' || source === 'ocr' || source === 'auto') {
    return source;
  }
  // 旧形式の推測
  if (source?.includes('ocr') || source?.includes('OCR')) {
    return 'ocr';
  }
  if (source?.includes('manual') || source?.includes('手動')) {
    return 'manual';
  }
  if (source?.includes('auto') || source?.includes('自動')) {
    return 'auto';
  }
  // デフォルト：ocr（既存データの多くはOCR由来）
  return 'ocr';
}

/**
 * Component IDを生成
 */
function generateComponentId(): string {
  return `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extractionの全Componentを移行
 */
export function migrateExtractionComponents(components: Component[]): Component[] {
  return components.map(migrateComponent);
}
