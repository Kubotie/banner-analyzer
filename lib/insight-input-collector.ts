/**
 * C1/C2/D生成用の入力データ収集
 */

import { Extraction } from '@/types/schema';
import { listKbItems } from '@/kb/common-api';
import type { KBItem } from '@/kb/common';
import type { Product } from '@/types/product';
import { migrateType, type BBoxTypeKey, isLowPriorityType } from './bbox-types';
import { detectBannerPatterns } from './banner-pattern-detector';

export interface InsightInputs {
  activeProduct: {
    productId: string;
    name: string;
    category?: string;
    description?: string;
    competitors?: Array<{ name: string }>;
  } | null;
  personaRefs: Array<{
    id: string;
    summary: string; // 1行要約
    jtbd?: string; // JTBD
    topCriteria?: string; // 判断基準TOP
    misunderstoodPoint?: string; // 誤解しやすいポイント
  }>;
  bannerContext: {
    imageId: string;
    imageSize: { width: number; height: number };
  } | null;
  layoutBboxes: Array<{
    id: string;
    type: BBoxTypeKey; // 新形式：BBoxTypeKey
    bbox: { x: number; y: number; w: number; h: number };
    area: number;
    text?: string;
  }>;
  texts: {
    ocrTexts: string[];
    bboxTexts: Array<{ bboxId: string; text: string }>;
  };
  areas: {
    byType: Record<BBoxTypeKey, number>; // 新形式：全BBoxタイプ
    total: number;
  };
  patternScores?: Array<{ // バナー構成の型
    type: string;
    score: number;
    evidence: string[];
  }>;
  notes?: string;
}

/**
 * 入力データを収集
 */
export async function collectInsightInputs(
  imageId: string | undefined,
  productId: string | undefined,
  extraction: Extraction | null,
  imageWidth: number,
  imageHeight: number,
  activeProduct: Product | null,
  notes?: string
): Promise<InsightInputs> {
  // activeProduct
  const product = activeProduct && productId === activeProduct.productId
    ? {
        productId: activeProduct.productId,
        name: activeProduct.name,
        category: activeProduct.category,
        description: activeProduct.description,
        competitors: activeProduct.competitors?.map(c => ({ name: c.name })),
      }
    : null;

  // personaRefs（KBから取得、最大3件）
  let personaRefs: InsightInputs['personaRefs'] = [];
  if (productId) {
    try {
      const personaItems = listKbItems({ kind: 'persona', productId });
      personaRefs = personaItems.slice(0, 3).map(item => {
        const payload = item.payload as any;
        const persona = payload.persona || payload;
        return {
          id: item.id,
          summary: persona.summary || persona.name || '',
          jtbd: persona.jtbd,
          topCriteria: persona.top_criteria || persona.criteria?.[0],
          misunderstoodPoint: persona.misunderstood_point || persona.risk,
        };
      });
    } catch (error) {
      console.warn('[入力データ収集] Persona取得エラー:', error);
    }
  }

  // bannerContext
  const bannerContext = imageId
    ? {
        imageId,
        imageSize: { width: imageWidth, height: imageHeight },
      }
    : null;

  // layoutBboxes（banner_layout(manual)優先、なければbanner_auto_layout(auto)）
  let layoutBboxes: InsightInputs['layoutBboxes'] = [];
  if (imageId) {
    try {
      // まずmanualを探す
      const manualLayouts = listKbItems({ kind: 'banner_layout', imageId });
      if (manualLayouts.length > 0) {
        const layout = manualLayouts[0];
        const payload = layout.payload as any;
        if (payload.bboxes && Array.isArray(payload.bboxes)) {
          layoutBboxes = payload.bboxes.map((b: any) => {
            const typeKey = b.typeKey || migrateType(b.type || 'main_copy');
            return {
              id: b.id || `bbox-${layoutBboxes.length}`,
              type: typeKey,
              bbox: b.bbox,
              area: b.area || (b.bbox.w * b.bbox.h),
              text: b.textCandidate || b.text,
            };
          });
        }
      } else {
        // auto_layoutを探す
        const autoLayouts = listKbItems({ kind: 'banner_auto_layout', imageId });
        if (autoLayouts.length > 0) {
          const layout = autoLayouts[0];
          const payload = layout.payload as any;
          if (payload.bboxes && Array.isArray(payload.bboxes)) {
            layoutBboxes = payload.bboxes.map((b: any) => {
              const typeKey = b.typeKey || migrateType(b.type || 'main_copy');
              return {
                id: b.id || `bbox-${layoutBboxes.length}`,
                type: typeKey,
                bbox: b.bbox,
                area: b.area || (b.bbox.w * b.bbox.h),
                text: b.textCandidate || b.text,
              };
            });
          }
        }
      }
    } catch (error) {
      console.warn('[入力データ収集] Layout取得エラー:', error);
    }
  }

  // extractionからもBBoxを取得（layoutがない場合のフォールバック）
  if (layoutBboxes.length === 0 && extraction) {
    layoutBboxes = extraction.components
      .filter(c => c.bbox && c.bbox.w > 0 && c.bbox.h > 0)
      .map((comp, idx) => {
        const typeKey = (comp as any).typeKey || migrateType(comp.type);
        return {
          id: (comp as any).id || `comp-${idx}`,
          type: typeKey,
          bbox: comp.bbox,
          area: comp.bbox.w * comp.bbox.h,
          text: comp.text || undefined,
        };
      });
  }

  // texts
  const ocrTexts: string[] = [];
  const bboxTexts: Array<{ bboxId: string; text: string }> = [];
  
  if (extraction) {
    // OCRテキスト（全体から抽出、重要度低いタイプは除外）
    extraction.components.forEach((comp, idx) => {
      const typeKey = (comp as any).typeKey || migrateType(comp.type);
      if (comp.text && !isLowPriorityType(typeKey)) {
        ocrTexts.push(comp.text);
        bboxTexts.push({
          bboxId: (comp as any).id || `comp-${idx}`,
          text: comp.text,
        });
      }
    });
  }

  // areas（新BBoxタイプに対応）
  const areasByType: Record<BBoxTypeKey, number> = {
    main_copy: 0,
    sub_copy: 0,
    product_image: 0,
    main_visual: 0,
    sub_visual: 0,
    cta: 0,
    logo: 0,
    price_discount: 0,
    limited_offer: 0,
    icon_symbol: 0,
    trust_element: 0,
    qr_code: 0,
    badge_label: 0,
    face_photo: 0,
    ingredient_technology: 0,
  };
  let totalArea = 0;

  layoutBboxes.forEach(bbox => {
    const typeKey = bbox.type as BBoxTypeKey;
    if (typeKey in areasByType) {
      areasByType[typeKey] += bbox.area;
    }
    totalArea += bbox.area;
  });
  
  // バナー構成の型を検出
  const patternSummary = detectBannerPatterns({
    texts: ocrTexts,
    areaStats: areasByType,
  });

  return {
    activeProduct: product,
    personaRefs,
    bannerContext,
    layoutBboxes,
    texts: {
      ocrTexts: [...new Set(ocrTexts)], // 重複除去
      bboxTexts,
    },
    areas: {
      byType: areasByType,
      total: totalArea,
    },
    patternScores: patternSummary.patterns,
    notes,
  };
}

