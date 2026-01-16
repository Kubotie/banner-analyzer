/**
 * KB共通テンプレ（meta/payload共通化）
 * 全KB typeがこの形に乗る
 */

import { z } from 'zod';

/**
 * KB種別（統一版）
 */
export type KBKind =
  | 'persona'
  | 'banner_layout'
  | 'banner_auto_layout'
  | 'banner_insight'
  | 'market_insight'
  | 'strategy_option'
  | 'planning_hook'
  | 'report'
  | 'option';

/**
 * KBソース
 */
export type KBSource = 'banner' | 'interview' | 'persona' | 'system';

/**
 * 共通メタデータ（必須項目）
 */
export interface KBMeta {
  kind: KBKind;
  title: string;                 // 一覧表示用。自動生成OK
  productId?: string;            // 紐づけ（ペルソナは必須）
  imageId?: string;              // バナー系で必須
  relatedKbIds?: string[];       // 参照関係
  tags?: string[];
  createdAt: string;             // ISO
  updatedAt: string;             // ISO
  source: KBSource;
  version: number;               // schema/logic更新用
  deleted?: boolean;             // 論理削除
}

/**
 * 共通ペイロードベース
 */
export interface KBPayloadBase {
  summary: string;               // UIの先頭に出す要約
  evidence?: Array<{
    type: 'ocr_text' | 'bbox' | 'manual_note' | 'kb_ref';
    text?: string;
    bboxId?: string;
    refKbId?: string;
    reason?: string;
  }>;
  confidence: number;            // 0..1
}

/**
 * 共通KBItem
 */
export interface KBItem<TPayload extends KBPayloadBase = KBPayloadBase> {
  id: string;
  meta: KBMeta;
  payload: TPayload;
}

/**
 * BBox種類（新14種）
 */
export type BannerBBoxType = 
  | 'main_copy'
  | 'sub_copy'
  | 'product_image'
  | 'main_visual'
  | 'sub_visual'
  | 'cta'
  | 'logo'
  | 'price_discount'
  | 'limited_offer'
  | 'icon_symbol'
  | 'trust_element'
  | 'qr_code'
  | 'badge_label'
  | 'face_photo'
  | 'ingredient_technology';

/**
 * BBox座標（normalized 0..1）
 */
export interface BBox {
  x: number;  // 0..1
  y: number;  // 0..1
  w: number;  // 0..1
  h: number;  // 0..1
}

/**
 * Insight項目
 */
export interface InsightItem {
  id: string;
  label: string;                // UI見出し
  hypothesis: string;           // 断定調でOK
  evidenceIds?: string[];       // bboxId等
  weight?: number;              // 0..1
}

/**
 * Insight系共通ペイロードベース
 */
/**
 * 入力サマリー
 */
export interface InputsSummary {
  totalBboxes: number;
  textBboxesCount: number;
  totalTextLength: number;
  largestAreasTop3: Array<{
    typeKey: BannerBBoxType;
    areaRatio: number;
  }>;
  layoutBias: string;
  mainMessageCandidates: string[];
  ctaText: string | null;
  priceInfo: string | null;
  authoritySignals: string[];
}

/**
 * 検出されたパターン
 */
export interface DetectedPattern {
  pattern: string;
  confidence: number;
  evidence: string[];
}

/**
 * 訴求軸
 */
export interface AppealAxis {
  axis: string;
  weight: number;
  evidenceBboxIds: string[];
  evidenceTexts: string[];
}

/**
 * 選ばれた理由
 */
export interface ChosenReason {
  statement: string;
  evidenceBboxIds: string[];
  evidence: string[];
}

/**
 * 避けている表現
 */
export interface AvoidedExpression {
  statement: string;
  evidence: string[];
}

/**
 * 実行可能な提案
 */
export interface ActionableSuggestion {
  title: string;
  description: string;
  pattern: string;
  requiredElements: string[];
}

/**
 * InsightPayloadBase（新形式）
 */
export interface InsightPayloadBase extends KBPayloadBase {
  kbType: 'banner_insight' | 'market_insight' | 'strategy_option' | 'planning_hook';
  productId?: string | null;
  imageIds?: string[];
  inputsSummary: InputsSummary;
  detectedPatterns: DetectedPattern[];
  appealAxes: AppealAxis[];
  chosenReasons: ChosenReason[];
  avoidedExpressions: AvoidedExpression[];
  actionableSuggestions: ActionableSuggestion[];
  confidence: number;
  notes?: string;
}

/**
 * Banner自動レイアウトペイロード（BBox提案）
 */
export interface BannerAutoLayoutPayload extends KBPayloadBase {
  bboxes: Array<{
    id: string;                  // stable id
    type: BannerBBoxType;
    label: string;               // UI表示用（例: ロゴ / CTA）
    bbox: BBox;
    area: number;                // w*h
    source: 'auto';
    textCandidate?: string;      // OCR結果があれば
  }>;
  imageSize: { width: number; height: number };
}

/**
 * Banner Insightペイロード（InsightPayloadBaseをそのまま使用）
 */
export type BannerInsightPayload = InsightPayloadBase;

/**
 * Market Insightペイロード（InsightPayloadBaseをそのまま使用）
 */
export type MarketInsightPayload = InsightPayloadBase;

/**
 * Strategy Optionペイロード（InsightPayloadBaseと同じ構造）
 */
export type StrategyOptionPayload = InsightPayloadBase;

/**
 * Planning Hookペイロード（InsightPayloadBaseと同じ構造）
 */
export type PlanningHookPayload = InsightPayloadBase;
