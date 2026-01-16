/**
 * BBox座標正規化ユーティリティ
 * px座標をnormalized(0..1)座標に変換する
 */

import { BBox, Extraction } from '@/types/schema';

/**
 * BBoxを正規化座標（0..1）に変換
 * @param bbox - 変換対象のBBox（pxまたはnormalized）
 * @param imageNaturalWidth - 画像の自然な幅（ピクセル）
 * @param imageNaturalHeight - 画像の自然な高さ（ピクセル）
 * @returns 正規化されたBBox（0..1範囲）
 */
export function normalizeBbox(
  bbox: BBox,
  imageNaturalWidth: number,
  imageNaturalHeight: number
): BBox {
  // 1より大きい値がある場合はpx座標とみなす
  const isPixelCoord = bbox.x > 1 || bbox.y > 1 || bbox.w > 1 || bbox.h > 1;

  let normalized: BBox;

  if (isPixelCoord) {
    // px座標をnormalized座標に変換
    normalized = {
      x: bbox.x / imageNaturalWidth,
      y: bbox.y / imageNaturalHeight,
      w: bbox.w / imageNaturalWidth,
      h: bbox.h / imageNaturalHeight,
    };
  } else {
    // 既にnormalized座標の場合はそのまま使用
    normalized = { ...bbox };
  }

  // 0..1範囲にクリッピング
  const clamped: BBox = {
    x: Math.max(0, Math.min(1, normalized.x)),
    y: Math.max(0, Math.min(1, normalized.y)),
    w: Math.max(0, Math.min(1, normalized.w)),
    h: Math.max(0, Math.min(1, normalized.h)),
  };

  // 範囲外の場合は警告（ただし大きく逸脱する場合のみ）
  const threshold = 0.1; // 10%以上の逸脱で警告
  if (
    Math.abs(normalized.x - clamped.x) > threshold ||
    Math.abs(normalized.y - clamped.y) > threshold ||
    Math.abs(normalized.w - clamped.w) > threshold ||
    Math.abs(normalized.h - clamped.h) > threshold
  ) {
    console.warn('[normalizeBbox] 座標が大きく範囲外でした（クリッピング済み）:', {
      original: bbox,
      normalized,
      clamped,
      isPixelCoord,
      imageSize: { width: imageNaturalWidth, height: imageNaturalHeight },
    });
  } else if (isPixelCoord) {
    // デバッグログ: 1件だけ表示
    console.debug('[normalizeBbox] px→normalized変換:', {
      original: bbox,
      normalized: clamped,
      imageSize: { width: imageNaturalWidth, height: imageNaturalHeight },
    });
  }

  return clamped;
}

/**
 * Extractionの全BBoxを正規化
 */
export function normalizeExtractionBboxes(
  extraction: Extraction,
  imageNaturalWidth: number,
  imageNaturalHeight: number
): Extraction {
  return {
    ...extraction,
    components: extraction.components.map((comp) => ({
      ...comp,
      bbox: normalizeBbox(comp.bbox, imageNaturalWidth, imageNaturalHeight),
    })),
    appeal_axes: extraction.appeal_axes.map((appeal) => ({
      ...appeal,
      bbox: normalizeBbox(appeal.bbox, imageNaturalWidth, imageNaturalHeight),
    })),
  };
}
