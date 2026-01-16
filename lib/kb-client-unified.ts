/**
 * KBクライアント（共通テンプレ統合版）
 * market_insight / strategy_option / planning_hook を共通テンプレで保存
 */

import { saveKbItem } from '@/kb/common-api';
import type { 
  MarketInsightPayload, 
  StrategyOptionPayload, 
  PlanningHookPayload,
  InsightItem 
} from '@/kb/common';
import type { MarketInsight, StrategyOption, PlanningHook } from '@/types/schema';
import { 
  MarketInsightPayloadSchema, 
  StrategyOptionPayloadSchema, 
  PlanningHookPayloadSchema 
} from '@/kb/common-schemas';

/**
 * Market Insightを保存（共通テンプレ統合版）
 */
export async function saveMarketInsightUnified(
  insight: MarketInsight,
  options?: {
    title?: string;
    productId?: string;
    relatedKbIds?: string[];
    tags?: string[];
  }
): Promise<string> {
  // 根拠リンクチェック
  if (insight.supporting_banners.length === 0) {
    throw new Error('根拠リンク（supporting_banners）は必須です。Insightを保存するには、対象バナーIDを指定してください。');
  }

  // MarketInsightからInsightPayloadBase形式に変換
  const payload: MarketInsightPayload = {
    summary: `${insight.competitor_choice.choice}に関する市場インサイト`,
    confidence: 0.8, // デフォルト値
    evidence: [],
    inputs: {
      ocrTexts: [],
      bboxSummary: insight.competitor_choice.bbox_references?.map((ref, idx) => ({
        type: 'annotation' as const, // 暫定
        area: 0.1,
        id: `bbox-${idx}`,
        text: undefined,
      })),
    },
    outputs: {
      appealAxes: [], // MarketInsightにはappealAxesがないため空配列
      reasonsChosen: [
        {
          id: 'reason-1',
          label: '競合の選択',
          hypothesis: insight.competitor_choice.choice,
          evidenceIds: insight.competitor_choice.bbox_references?.map((_, idx) => `bbox-${idx}`),
          weight: 0.8,
        },
        {
          id: 'reason-2',
          label: '合理性仮説',
          hypothesis: insight.rationality_hypothesis,
          weight: 0.7,
        },
      ],
      avoidedExpressions: [
        {
          id: 'avoided-1',
          label: '当たり前の可能性',
          hypothesis: insight.taken_for_granted_risk,
          weight: 0.6,
        },
      ],
    },
  };

  // Zod検証
  const validated = MarketInsightPayloadSchema.parse(payload);

  // KBに保存
  const kbId = await saveKbItem('market_insight', validated, {
    title: options?.title || `市場インサイト_${insight.competitor_choice.choice.substring(0, 20)}`,
    productId: options?.productId,
    relatedKbIds: options?.relatedKbIds || insight.supporting_banners,
    tags: options?.tags || [],
  });

  return kbId;
}

/**
 * Strategy Optionを保存（共通テンプレ統合版）
 */
export async function saveStrategyOptionUnified(
  option: StrategyOption,
  relatedInsightIds: string[],
  options?: {
    title?: string;
    productId?: string;
    relatedKbIds?: string[];
    tags?: string[];
  }
): Promise<string> {
  // StrategyOptionからStrategyOptionPayload形式に変換
  const payload: StrategyOptionPayload = {
    summary: `${option.title}: ${option.description.substring(0, 100)}`,
    confidence: 0.7,
    evidence: [],
    inputs: {
      ocrTexts: [],
      bboxSummary: [],
    },
    outputs: {
      appealAxes: [],
      reasonsChosen: option.potential_benefits.map((benefit, idx) => ({
        id: `benefit-${idx}`,
        label: 'メリット',
        hypothesis: benefit,
        weight: 0.7,
      })),
      avoidedExpressions: option.potential_risks.map((risk, idx) => ({
        id: `risk-${idx}`,
        label: 'リスク',
        hypothesis: risk,
        weight: 0.6,
      })),
    },
    optionType: option.option_type,
    benefits: option.potential_benefits,
    risks: option.potential_risks,
    rationalityAssessment: option.rationality_assessment,
    riskAssessment: option.risk_assessment,
  };

  // Zod検証
  const validated = StrategyOptionPayloadSchema.parse(payload);

  // KBに保存
  const kbId = await saveKbItem('strategy_option', validated, {
    title: options?.title || `戦略オプション_${option.option_type}_${option.title}`,
    productId: options?.productId,
    relatedKbIds: options?.relatedKbIds || relatedInsightIds,
    tags: options?.tags || [],
  });

  return kbId;
}

/**
 * Planning Hookを保存（共通テンプレ統合版）
 */
export async function savePlanningHookUnified(
  hook: PlanningHook,
  relatedInsightIds: string[],
  options?: {
    title?: string;
    productId?: string;
    relatedKbIds?: string[];
    tags?: string[];
  }
): Promise<string> {
  // PlanningHookからPlanningHookPayload形式に変換
  const payload: PlanningHookPayload = {
    summary: `${hook.strategy_option}に関する企画フック`,
    confidence: 0.7,
    evidence: [],
    inputs: {
      ocrTexts: [],
      bboxSummary: [],
    },
    outputs: {
      appealAxes: [],
      reasonsChosen: hook.hooks.map((h, idx) => ({
        id: `hook-${idx}`,
        label: h.question,
        hypothesis: h.context,
        weight: 0.7,
      })),
      avoidedExpressions: [],
    },
    hooks: hook.hooks.map((h) => ({
      question: h.question,
      context: h.context,
      relatedPersonaIds: h.related_persona_ids,
      relatedSectionOrder: undefined,
    })),
  };

  // Zod検証
  const validated = PlanningHookPayloadSchema.parse(payload);

  // KBに保存
  const kbId = await saveKbItem('planning_hook', validated, {
    title: options?.title || `企画フック_${hook.strategy_option}`,
    productId: options?.productId,
    relatedKbIds: options?.relatedKbIds || relatedInsightIds,
    tags: options?.tags || [],
  });

  return kbId;
}
