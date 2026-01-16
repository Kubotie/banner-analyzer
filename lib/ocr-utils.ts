/**
 * OCR結果をcomponentsに変換するユーティリティ
 */

import { OCRResult } from '@/types/ocr';
import { Component } from '@/types/schema';

/**
 * テキストが価格・割引表現かどうかを判定
 */
function isPriceText(text: string): boolean {
  const pricePatterns = [
    /¥[\d,]+/,
    /[\d,]+円/,
    /税込/,
    /%OFF/,
    /割引/,
    /初回/,
    /0円/,
    /無料/,
    /[\d,]+%/,
    /オフ/,
  ];
  return pricePatterns.some((pattern) => pattern.test(text));
}

/**
 * テキストがCTA（行動喚起）表現かどうかを判定
 */
function isCTAText(text: string): boolean {
  const ctaPatterns = [
    /購入/,
    /申し込む/,
    /申込/,
    /詳しく/,
    /今すぐ/,
    /無料/,
    /体験/,
    /登録/,
    /始める/,
    /チェック/,
    /見る/,
    /確認/,
  ];
  return ctaPatterns.some((pattern) => pattern.test(text));
}

/**
 * テキストがヘッドライン（短い強い訴求）かどうかを判定
 * ヒューリスティクス: 文字数が少ない、または画面上部に近い
 */
function isHeadlineText(text: string, bbox: OCRResult['bbox']): boolean {
  // 文字数が少ない（20文字以下）
  if (text.length <= 20) {
    // 画面上部に近い（y座標が0.3以下）
    if (bbox.y <= 0.3) {
      return true;
    }
  }
  return false;
}

/**
 * OCR結果をComponent型に変換（MVP: text-only対応、bboxが全体でも処理可能）
 * - confidence/文字数フィルタは完全に無効化（デバッグ用）
 * - typeは price/cta/headline/body_text の簡易分類
 * - bboxが無い/全体bboxでもcomponentsに変換できる
 * - OCR由来であることは source:"ocr" で区別
 */
export function convertOCRToComponents(ocrResults: OCRResult[]): Component[] {
  const components: Component[] = [];

  console.debug('[OCR→Components] 変換開始:', { 入力件数: ocrResults.length });

  // すべてのOCR結果を採用（フィルタ無効化）
  for (const ocr of ocrResults) {
    // bboxが全体（{x:0,y:0,w:1,h:1}）かどうかを判定
    const isFullBbox = ocr.bbox.x === 0 && ocr.bbox.y === 0 && ocr.bbox.w === 1 && ocr.bbox.h === 1;
    
    // 座標が0..1の範囲外の場合は警告してクリッピング（全体bboxの場合はスキップ）
    if (!isFullBbox) {
      if (ocr.bbox.x < 0 || ocr.bbox.x > 1 || ocr.bbox.y < 0 || ocr.bbox.y > 1 ||
          ocr.bbox.w < 0 || ocr.bbox.w > 1 || ocr.bbox.h < 0 || ocr.bbox.h > 1) {
        console.warn('[OCR→Components] bbox座標が0..1の範囲外（クリッピング）:', { 
          text: ocr.text, 
          bbox: ocr.bbox,
        });
        // 範囲外の場合はクリッピング
        ocr.bbox.x = Math.max(0, Math.min(1, ocr.bbox.x));
        ocr.bbox.y = Math.max(0, Math.min(1, ocr.bbox.y));
        ocr.bbox.w = Math.max(0, Math.min(1, ocr.bbox.w));
        ocr.bbox.h = Math.max(0, Math.min(1, ocr.bbox.h));
      }
    } else {
      console.debug('[OCR→Components] 全体bboxを検出（text-only）:', { text: ocr.text?.substring(0, 30) });
    }

    // コンポーネントタイプを判定（bboxが全体の場合はheadline判定をスキップ）
    let componentType: string;
    if (isPriceText(ocr.text)) {
      componentType = 'price';
    } else if (isCTAText(ocr.text)) {
      componentType = 'cta';
    } else if (!isFullBbox && isHeadlineText(ocr.text, ocr.bbox)) {
      componentType = 'headline';
    } else {
      componentType = 'body_text';
    }

    // Componentに変換
    // text-only（全体bbox）の場合は、bboxを(0,0,1,1)のまま残すが、Overlayでは描画しない
    // Overlay描画の判定はBannerImageでsource==='manual'のみに限定する
    components.push({
      type: componentType,
      text: ocr.text,
      bbox: {
        x: ocr.bbox.x,
        y: ocr.bbox.y,
        w: ocr.bbox.w,
        h: ocr.bbox.h,
      },
      source: 'ocr', // OCR由来であることを明示（Overlayでは描画しない）
    });
  }

  console.debug('[OCR→Components] 変換完了:', { 出力件数: components.length });
  if (components.length > 0) {
    console.debug('[OCR→Components] 先頭3件:', components.slice(0, 3).map(c => ({
      type: c.type,
      text: c.text?.substring(0, 20),
      bbox: { x: c.bbox.x, y: c.bbox.y, w: c.bbox.w, h: c.bbox.h },
      source: c.source,
    })));
  } else {
    console.warn('[OCR→Components] ⚠️ 変換後も0件です。入力OCR結果:', ocrResults);
  }

  return components;
}
