/**
 * KB共通Zodスキーマ
 */

import { z } from 'zod';
import type { KBKind, KBSource, BannerBBoxType } from './common';

/**
 * KBMetaスキーマ
 */
export const KBMetaSchema = z.object({
  kind: z.enum([
    'persona',
    'banner_layout',
    'banner_auto_layout',
    'banner_insight',
    'market_insight',
    'strategy_option',
    'planning_hook',
    'report',
    'option',
  ]),
  title: z.string().min(1),
  productId: z.string().optional(),
  imageId: z.string().optional(),
  relatedKbIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.enum(['banner', 'interview', 'persona', 'system']),
  version: z.number().int().positive(),
  deleted: z.boolean().optional(),
});

/**
 * KBPayloadBaseスキーマ
 */
export const KBPayloadBaseSchema = z.object({
  summary: z.string(),
  evidence: z.array(z.object({
    type: z.enum(['ocr_text', 'bbox', 'manual_note', 'kb_ref']),
    text: z.string().optional(),
    bboxId: z.string().optional(),
    refKbId: z.string().optional(),
    reason: z.string().optional(),
  })).optional(),
  confidence: z.number().min(0).max(1),
});

/**
 * BBoxスキーマ（normalized 0..1）
 */
export const BBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

/**
 * 新しい共通JSONスキーマ（meta/payload構造）
 */
const BBoxTypeKeyEnum = z.enum([
  'main_copy', 'sub_copy', 'product_image', 'main_visual', 'sub_visual',
  'cta', 'logo', 'price_discount', 'limited_offer', 'icon_symbol',
  'trust_element', 'qr_code', 'badge_label', 'face_photo', 'ingredient_technology'
]);

const EvidenceSchema = z.object({
  bbox_type: z.string(),
  text: z.string().nullish(), // nullとundefinedの両方を許可
  areaRatio: z.number().min(0).max(1),
});

/**
 * InsightItemスキーマ（新形式）
 */
export const InsightItemSchema = z.object({
  title: z.string(),
  hypothesis: z.string(),
  appeal_axes: z.array(z.string()),
  structure_type: z.array(z.string()),
  evidence: z.array(EvidenceSchema),
});

const MetaSchema = z.object({
  kb_type: z.enum(['banner_insight', 'market_insight', 'strategy_option', 'planning_hook']),
  productId: z.string().nullable(),
  imageId: z.string().nullable(), // LLMがnullを返す可能性があるためnullableに
  generatedAt: z.string(), // ISO8601
  confidence: z.number().min(0).max(1),
});

const PayloadSchema = z.object({
  summary: z.string(),
  insights: z.array(InsightItemSchema),
});

/**
 * PlanningHookPayload用のPayloadSchema（hooksを含む）
 */
const PlanningHookPayloadSchema_internal = z.object({
  summary: z.string(),
  insights: z.array(InsightItemSchema),
  hooks: z.array(z.object({
    question: z.string(),
    context: z.string(),
    relatedPersonaIds: z.array(z.string()).optional(),
    relatedSectionOrder: z.number().int().optional(),
  })),
});

/**
 * InsightPayloadBaseスキーマ（新形式：meta/payload構造）
 */
export const InsightPayloadBaseSchema = z.object({
  meta: MetaSchema,
  payload: PayloadSchema,
});

/**
 * BannerAutoLayoutPayloadスキーマ
 */
export const BannerAutoLayoutPayloadSchema = KBPayloadBaseSchema.extend({
  bboxes: z.array(z.object({
    id: z.string(),
    type: z.enum([
      'main_copy', 'sub_copy', 'product_image', 'main_visual', 'sub_visual',
      'cta', 'logo', 'price_discount', 'limited_offer', 'icon_symbol',
      'trust_element', 'qr_code', 'badge_label', 'face_photo'
    ]),
    label: z.string(),
    bbox: BBoxSchema,
    area: z.number(),
    source: z.literal('auto'),
    textCandidate: z.string().optional(),
  })),
  imageSize: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

/**
 * BannerInsightPayloadスキーマ（InsightPayloadBaseと同じ）
 */
export const BannerInsightPayloadSchema = InsightPayloadBaseSchema;

/**
 * MarketInsightPayloadスキーマ（InsightPayloadBaseと同じ）
 */
export const MarketInsightPayloadSchema = InsightPayloadBaseSchema;

/**
 * StrategyOptionPayloadスキーマ（InsightPayloadBaseと同じ）
 */
export const StrategyOptionPayloadSchema = InsightPayloadBaseSchema;

/**
 * PlanningHookPayloadスキーマ
 */
export const PlanningHookPayloadSchema = z.object({
  meta: MetaSchema,
  payload: PlanningHookPayloadSchema_internal,
});
