/**
 * KBクライアント（保存用ヘルパー）
 * 既存アプリから使用
 */

import {
  KBItem,
  PersonaPayload,
  BannerExtractionPayload,
  MarketInsightPayload,
  AggregationReportPayload,
  StrategyOptionPayload,
  PlanPayload,
} from '@/kb/types';
import { Extraction, Aggregation, MarketInsight, StrategyOption, LPRough, BBox } from '@/types/schema';

/**
 * BBoxをBBoxCoordに変換
 */
function convertBBox(bbox: BBox, coordType: 'normalized' | 'pixel' = 'pixel'): {
  x: number;
  y: number;
  w: number;
  h: number;
  coord_type: 'normalized' | 'pixel';
} {
  return {
    x: bbox.x,
    y: bbox.y,
    w: bbox.w,
    h: bbox.h,
    coord_type: coordType,
  };
}

/**
 * エラーレスポンスを安全に処理するヘルパー関数
 */
async function handleErrorResponse(response: Response, defaultMessage: string): Promise<never> {
  const errorText = await response.text();
  
  // JSONかどうかを確認（HTMLエラーページの場合を考慮）
  let errorMessage = defaultMessage;
  try {
    const errorJson = JSON.parse(errorText);
    errorMessage = errorJson.error || errorJson.message || defaultMessage;
  } catch (parseError) {
    // JSONでない場合（HTMLエラーページなど）
    if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
      errorMessage = `APIエラー (${response.status}): HTMLエラーページが返されました。APIエンドポイントが正しく設定されているか確認してください。`;
    } else {
      errorMessage = `APIエラー (${response.status}): ${errorText.substring(0, 200)}`;
    }
  }
  
  throw new Error(errorMessage);
}

/**
 * Banner Extractionを保存
 */
export async function saveBannerExtraction(
  extraction: Extraction,
  imageUrl?: string,
  options?: {
    title?: string;
    folder_path?: string;
    tags?: string[];
    source_app?: string;
    source_project_id?: string;
  }
): Promise<KBItem> {
  const payload: BannerExtractionPayload = {
    type: 'banner',
    banner_id: extraction.banner_id,
    extraction,
    image_url: imageUrl,
  };

  const response = await fetch('/api/kb/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'banner',
      title: options?.title,
      folder_path: options?.folder_path || 'My Files/Banners',
      tags: options?.tags || [],
      source_app: options?.source_app || 'banner-analyzer',
      source_project_id: options?.source_project_id,
      payload,
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Failed to save banner extraction');
  }

  const data = await response.json();
  return data.item;
}

/**
 * Market Insightを保存
 */
export async function saveMarketInsight(
  insight: MarketInsight,
  options?: {
    title?: string;
    folder_path?: string;
    tags?: string[];
    source_app?: string;
    source_project_id?: string;
  }
): Promise<KBItem> {
  // 根拠リンクチェック
  if (insight.supporting_banners.length === 0) {
    throw new Error('根拠リンク（supporting_banners）は必須です。Insightを保存するには、対象バナーIDを指定してください。');
  }

  const payload: MarketInsightPayload = {
    type: 'insight',
    insight_id: `insight-${Date.now()}`,
    persona_premise: insight.persona_assumption,
    observed_facts: {
      choice: insight.competitor_choice.choice,
      evidence: insight.competitor_choice.evidence,
      bbox_references: insight.competitor_choice.bbox_references?.map((ref) => ({
        banner_id: ref.banner_id,
        bbox: convertBBox(ref.bbox),
      })),
    },
    rationale_hypothesis: insight.rationality_hypothesis,
    market_constraints: insight.taken_for_granted_risk,
    planning_hooks: insight.planning_hooks,
    evidence_links: {
      target_banner_ids: insight.supporting_banners,
      target_bboxes: insight.competitor_choice.bbox_references?.map((ref) => ({
        banner_id: ref.banner_id,
        bbox: convertBBox(ref.bbox),
      })),
    },
    category: insight.category,
    persona_relevance: insight.persona_relevance,
  };

  const response = await fetch('/api/kb/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'insight',
      title: options?.title,
      folder_path: options?.folder_path || 'My Files/Insights',
      tags: options?.tags || [],
      source_app: options?.source_app || 'banner-analyzer',
      source_project_id: options?.source_project_id,
      payload,
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Failed to save market insight');
  }

  const data = await response.json();
  return data.item;
}

/**
 * Aggregation Reportを保存
 */
export async function saveAggregationReport(
  aggregation: Aggregation,
  totalBanners: number,
  options?: {
    title?: string;
    folder_path?: string;
    tags?: string[];
    source_app?: string;
    source_project_id?: string;
  }
): Promise<KBItem> {
  const payload: AggregationReportPayload = {
    type: 'report',
    report_id: `report-${Date.now()}`,
    aggregation,
    total_banners: totalBanners,
  };

  const response = await fetch('/api/kb/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'report',
      title: options?.title,
      folder_path: options?.folder_path || 'My Files/Reports',
      tags: options?.tags || [],
      source_app: options?.source_app || 'banner-analyzer',
      source_project_id: options?.source_project_id,
      payload,
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Failed to save aggregation report');
  }

  const data = await response.json();
  return data.item;
}

/**
 * Strategy Optionを保存
 */
export async function saveStrategyOption(
  option: StrategyOption,
  relatedInsightIds: string[],
  options?: {
    title?: string;
    folder_path?: string;
    tags?: string[];
    source_app?: string;
    source_project_id?: string;
  }
): Promise<KBItem> {
  const payload: StrategyOptionPayload = {
    type: 'option',
    option_id: `option-${Date.now()}`,
    option_type: option.option_type,
    title: option.title,
    description: option.description,
    benefits: option.benefits,
    risks: option.risks,
    rationality_assessment: option.rationality_assessment,
    risk_assessment: option.risk_assessment,
    persona_risk_assessment: option.persona_risk_assessment,
    related_insight_ids: relatedInsightIds,
  };

  const response = await fetch('/api/kb/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'option',
      title: options?.title,
      folder_path: options?.folder_path || 'My Files/Options',
      tags: options?.tags || [],
      source_app: options?.source_app || 'banner-analyzer',
      source_project_id: options?.source_project_id,
      payload,
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Failed to save strategy option');
  }

  const data = await response.json();
  return data.item;
}

/**
 * Plan (LP Rough)を保存
 */
export async function savePlan(
  lpRough: LPRough,
  options?: {
    title?: string;
    folder_path?: string;
    tags?: string[];
    source_app?: string;
    source_project_id?: string;
  }
): Promise<KBItem> {
  const payload: PlanPayload = {
    type: 'plan',
    plan_id: `plan-${Date.now()}`,
    strategy_option: lpRough.strategy_option,
    sections: lpRough.sections,
    cautions: lpRough.cautions,
    planning_hooks: lpRough.planning_hooks,
  };

  const response = await fetch('/api/kb/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'plan',
      title: options?.title,
      folder_path: options?.folder_path || 'My Files/Plans',
      tags: options?.tags || [],
      source_app: options?.source_app || 'banner-analyzer',
      source_project_id: options?.source_project_id,
      payload,
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Failed to save plan');
  }

  const data = await response.json();
  return data.item;
}

/**
 * Personaを保存
 */
export async function savePersona(
  persona: any, // Persona型（types/index.tsのPersona型）
  options?: {
    title?: string;
    folder_path?: string;
    tags?: string[];
    source_app?: string;
    source_project_id?: string;
  }
): Promise<KBItem> {
  const payload: PersonaPayload = {
    type: 'persona',
    persona_id: persona.id || `persona-${Date.now()}`,
    hypothesis_label: '仮説ペルソナ',
    summary: persona.one_line_summary || '',
    story: persona.background_story || '',
    proxy_structure: {
      whose_problem: persona.proxy_purchase_structure?.whose_problem || '',
      who_solves: persona.proxy_purchase_structure?.who_solves || '',
      how: persona.proxy_purchase_structure?.how || '',
    },
    jtbd: {
      functional: persona.job_to_be_done?.functional || [],
      emotional: persona.job_to_be_done?.emotional || [],
      social: persona.job_to_be_done?.social || [],
    },
    decision_criteria_top5: persona.decision_criteria_top5 || [],
    journey: {
      trigger: persona.typical_journey?.trigger || '',
      consider: persona.typical_journey?.consideration || '',
      purchase: persona.typical_journey?.purchase || '',
      continue: persona.typical_journey?.retention || '',
    },
    pitfalls: persona.common_misconceptions || [],
    tactics: {
      message: persona.effective_strategies?.messages || [],
      route: persona.effective_strategies?.touchpoints || [],
      offer: persona.effective_strategies?.offers || [],
    },
    evidence: {
      quotes: (persona.evidence?.quotes || []).map((q: any) => ({
        text: q.text || q.quoteText || '',
        respondent_id: q.respondent_id || q.respondentId || '',
        category: q.category || 'general',
      })),
      count: persona.evidence?.count || persona.evidence?.quotes?.length || 0,
    },
    evidence_quotes: (persona.evidence?.quotes || []).map((q: any) => ({
      text: q.text || q.quoteText || '',
      source_file: q.source_file || q.source || '',
      line_number: q.line_number || q.lineNumber,
      line_range: q.line_range || (q.lineRange ? { start: q.lineRange.start, end: q.lineRange.end } : undefined),
      statement_id: q.statement_id || q.statementId,
      category: q.category || 'general',
    })),
  };

  const response = await fetch('/api/kb/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      type: 'persona',
      title: options?.title,
      folder_path: options?.folder_path || 'My Files/Personas',
      tags: options?.tags || [],
      source_app: options?.source_app || 'persona-app',
      source_project_id: options?.source_project_id, // productIdをsource_project_idとして使用
      payload,
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Failed to save persona');
  }

  const data = await response.json();
  return data.item;
}
