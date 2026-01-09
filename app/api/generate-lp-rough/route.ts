import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouterJSON, OpenRouterMessage } from '@/lib/openrouter';
import { StrategyOption, MarketInsight, Persona, LPRough } from '@/types/schema';
import { generateLPRough } from '@/lib/lp-rough';

/**
 * LPラフ生成APIエンドポイント
 * Strategy Optionを受け取り、LLMでLP構成の骨子を生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategyOption, marketInsights, personas, useLLM = false } = body as {
      strategyOption: StrategyOption;
      marketInsights: MarketInsight[];
      personas: Persona[];
      useLLM?: boolean;
    };

    if (!strategyOption || !marketInsights || !personas) {
      return NextResponse.json(
        { error: 'strategyOption, marketInsights, and personas are required' },
        { status: 400 }
      );
    }

    // LLMモードの場合
    if (useLLM) {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `あなたはLP構成設計の専門家です。Strategy Optionに基づいて、LP構成の骨子を生成してください。

LPRoughスキーマ:
{
  "strategy_option": "A" | "B" | "C",
  "sections": Array<{
    "section_name": string,
    "order": number,
    "purpose": string,  // 解消する不安/前提（仮説表現）
    "include": string[], // 入れるべき要素（仮説表現）
    "evidence_links": {
      "related_insights": string[],
      "related_persona_ids": string[]
    }
  }>,
  "cautions": Array<{
    "point": string,     // 誤解しやすいポイント（仮説表現）
    "condition": string, // 壊れる条件（仮説表現）
    "evidence_links": {...}
  }>,
  "planning_hooks": Array<{
    "question": string,
    "context": string,
    "related_section_order": number
  }>
}

重要な制約:
- 完成コピーやデザイン案は生成しない
- 構成（順序・役割・入れるべき情報）だけを出す
- 断定せず仮説表現（「〜の可能性がある」）
- 根拠を必ず紐付ける（Market Insight / Persona Evidence）

生成ルール:
- Option A（同調）：当たり前→安心→納得→CTA→FAQの順を基本
- Option B（ずらす）：当たり前＋差分→差分説明→安心→CTA→FAQ
- Option C（外す）：前提転換→理由→代替安心→具体→CTA→FAQ`,
        },
        {
          role: 'user',
          content: `以下のStrategy Optionに基づいて、LP構成の骨子を生成してください。

Strategy Option: ${strategyOption.option_type} - ${strategyOption.title}

Market Insights:
${JSON.stringify(marketInsights.slice(0, 5), null, 2)}${marketInsights.length > 5 ? '\n... (他' + (marketInsights.length - 5) + '件)' : ''}

Personas:
${JSON.stringify(personas, null, 2)}

Strategy Optionの詳細:
- 参考要素: ${strategyOption.referenced_elements.components?.join(', ') || 'なし'}
- 訴求軸: ${strategyOption.referenced_elements.appeal_axes?.join(', ') || 'なし'}
- 使わない要素: ${strategyOption.avoided_elements.components?.join(', ') || 'なし'}
- 合理性: ${strategyOption.rationality_assessment.level} - ${strategyOption.rationality_assessment.reasoning}
- リスク: ${strategyOption.risk_assessment.level} - ${strategyOption.risk_assessment.reasoning}

上記の生成ルールに従って、LP構成の骨子を生成してください。`,
        },
      ];

      const lpRough = await callOpenRouterJSON<LPRough>(
        messages,
        'anthropic/claude-3.5-sonnet',
        0.5
      );

      return NextResponse.json({ lpRough });
    } else {
      // ダミーモード：ロジックベースで生成
      const lpRough = generateLPRough(strategyOption, marketInsights, personas);
      return NextResponse.json({ lpRough });
    }
  } catch (error) {
    console.error('LP Rough generation error:', error);
    return NextResponse.json(
      {
        error: 'LP Rough generation failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
