import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouterJSON, OpenRouterMessage } from '@/lib/openrouter';
import { Extraction } from '@/types/schema';

/**
 * 画像解析APIエンドポイント
 * 画像URLを受け取り、LLMでExtractionを生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, bannerId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // 画像をbase64に変換（または画像URLをそのまま使用）
    // 注意: 実際の実装では、画像をbase64にエンコードするか、
    // 画像認識API（例: Google Vision API, AWS Rekognition）を使用する必要があります
    // ここでは、画像URLをテキストとしてLLMに渡す簡易実装とします

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `あなたは競合バナー分析の専門家です。バナー画像を分析し、以下のJSONスキーマに従ってExtractionデータを生成してください。

Extractionスキーマ:
{
  "banner_id": string,
  "brand": string | null,
  "channel": string | null,
  "format": string | null,
  "components": Array<{
    "type": string,
    "text": string | null,
    "bbox": { "x": number, "y": number, "w": number, "h": number }
  }>,
  "appeal_axes": Array<{
    "type": string,
    "evidence_text": string,
    "bbox": { "x": number, "y": number, "w": number, "h": number }
  }>,
  "tone": string | null,
  "notes": string,
  "confidence": number,
  "selected_reason_hypothesis": string | null,
  "avoided_expressions_hypothesis": string | null
}

重要な制約:
- 断定表現は禁止（「〜である」ではなく「〜の可能性がある」）
- 根拠（bbox）を必ず含める
- 不明な情報はnullにする
- confidenceは0.0-1.0の範囲で、根拠の量に基づいて設定`,
      },
      {
        role: 'user',
        content: `以下のバナー画像を分析してください。

画像URL: ${imageUrl}
バナーID: ${bannerId || 'banner_' + Date.now()}

画像から以下を抽出してください:
1. コンポーネント（商品画像、ロゴ、価格、CTA、期間限定、バッジ、レビュー、保証など）
2. 訴求軸（価格、効果、安心、時短、限定、社会的証明など）
3. トーン（強め/やわらかめ/その他）
4. この表現が選ばれている理由の仮説
5. 避けている表現の仮説

bbox（バウンディングボックス）は、画像の左上を(0,0)として、要素の位置とサイズを推定してください。
画像サイズが不明な場合は、800x600を基準としてください。`,
      },
    ];

    const extraction = await callOpenRouterJSON<Extraction>(
      messages,
      'anthropic/claude-3.5-sonnet',
      0.3
    );

    return NextResponse.json({ extraction });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
