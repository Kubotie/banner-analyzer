import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouterJSON, OpenRouterMessage } from '@/lib/openrouter';
import { MarketInsight, Persona } from '@/types/schema';
import { Aggregation, Extraction } from '@/types/schema';

/**
 * Market Insight生成APIエンドポイント
 * AggregationとExtractionを受け取り、LLMでMarket Insightを生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { aggregation, extractions, personas } = body as {
      aggregation: Aggregation;
      extractions: Extraction[];
      personas: Persona[];
    };

    if (!aggregation || !extractions || extractions.length === 0) {
      return NextResponse.json(
        { error: 'aggregation and extractions are required' },
        { status: 400 }
      );
    }

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `あなたは市場インサイト分析の専門家です。Aggregationデータ（市場の集計結果）を分析し、Market Insightカードを生成してください。

Market Insightスキーマ（各カード）:
{
  "persona_assumption": {
    "assumption": string,  // 想定されているペルソナ前提（人の不安・制約・心理状態）
    "evidence": string      // 根拠（出現率、要素の多寡など）
  },
  "competitor_choice": {
    "choice": string,       // 観測された競合の選択（事実）
    "evidence": string,     // 根拠（出現率、要素の多寡など）
    "bbox_references": Array<{ "banner_id": string, "bbox": {...} }>  // 任意
  },
  "rationality_hypothesis": string,  // なぜその選択が合理的か（仮説）
  "taken_for_granted_risk": string, // 当たり前になっている可能性（外すとリスク）
  "supporting_banners": string[],    // 根拠となるバナーID
  "category": "high_frequency" | "low_frequency" | "combination" | "brand_difference",
  "persona_relevance": Array<{
    "persona_id": string,
    "relevance_level": "high" | "medium" | "low" | "unknown",  // ◎◯△？
    "reasoning": string  // 判定理由（1-2文の仮説）
  }>,
  "planning_hooks": Array<{
    "question": string,     // 企画に使える問い
    "context": string,      // 背景・文脈
    "related_persona_ids": string[]  // 任意
  }>
}

重要な制約:
- 断定表現は禁止（「〜である」ではなく「〜の可能性がある」）
- 最低3枚のMarket Insightカードを生成
- すべて仮説表現
- 根拠（出現率/BBox）を必ず含める
- Planning Hooksは各カードに3つ生成`,
      },
      {
        role: 'user',
        content: `以下のAggregationデータとExtractionデータを分析し、Market Insightカードを最低3枚生成してください。

Aggregation:
${JSON.stringify(aggregation, null, 2)}

Extractions (${extractions.length}件):
${JSON.stringify(extractions.slice(0, 5), null, 2)}${extractions.length > 5 ? '\n... (他' + (extractions.length - 5) + '件)' : ''}

Personas:
${personas && personas.length > 0 ? JSON.stringify(personas, null, 2) : 'なし'}

以下の観点からMarket Insightを生成してください:
1. 高頻度要素から構造を読み取る（出現率70%以上）
2. 低頻度要素から構造を読み取る（出現率20%以下）
3. よくある組み合わせから構造を読み取る
4. ブランド別差分から構造を読み取る（差分がある場合）

各Market Insightカードは、4要素（ペルソナ前提、競合の選択、合理性仮説、当たり前の可能性）を必ず含み、Persona Overlay（◎◯△？）とPlanning Hooks（3つ）を生成してください。`,
      },
    ];

    const marketInsights = await callOpenRouterJSON<MarketInsight[]>(
      messages,
      'anthropic/claude-3.5-sonnet',
      0.5
    );

    // 最低3枚保証
    if (!Array.isArray(marketInsights) || marketInsights.length < 3) {
      return NextResponse.json(
        { error: 'LLM returned insufficient insights. Expected at least 3, got ' + (marketInsights?.length || 0) },
        { status: 500 }
      );
    }

    return NextResponse.json({ marketInsights });
  } catch (error) {
    console.error('Market Insight generation error:', error);
    return NextResponse.json(
      {
        error: 'Market Insight generation failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
