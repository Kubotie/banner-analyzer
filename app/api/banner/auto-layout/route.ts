import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// Zodスキーマ: LLMレスポンスの検証
const ComponentSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['logo', 'product_image', 'headline', 'cta', 'annotation']),
  bbox: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0.02).max(1),
    h: z.number().min(0.02).max(1),
  }),
  confidence: z.number().min(0).max(1).optional(),
  note: z.string().optional(),
});

const LLMResponseSchema = z.object({
  components: z.array(ComponentSchema),
});

/**
 * バナー画像の自動レイアウト検出API
 * Vision LLMで画像を分析し、BBoxを自動配置
 */
export async function POST(request: NextRequest) {
  let currentStep = '初期化';
  
  try {
    // Step 1: formData取得
    currentStep = 'Step1: formData取得';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let formData: FormData;
    try {
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        throw new Error(`Unsupported content-type: ${contentType}. Expected multipart/form-data`);
      }
      formData = await request.formData();
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        formDataKeys: Array.from(formData.keys()),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 2: file取得
    currentStep = 'Step2: file取得';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let file: File;
    let imageWidth: number;
    let imageHeight: number;
    try {
      const fileValue = formData.get('file') as File | null;
      if (!fileValue) {
        throw new Error('file is required');
      }
      file = fileValue;
      
      const widthStr = formData.get('width') as string | null;
      const heightStr = formData.get('height') as string | null;
      if (!widthStr || !heightStr) {
        throw new Error('width and height are required');
      }
      
      imageWidth = parseInt(widthStr);
      imageHeight = parseInt(heightStr);
      if (isNaN(imageWidth) || isNaN(imageHeight)) {
        throw new Error('width and height must be valid numbers');
      }
      
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        fileType: file.type,
        fileSize: file.size,
        imageWidth,
        imageHeight,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 3: arrayBuffer取得
    currentStep = 'Step3: arrayBuffer取得';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        arrayBufferByteLength: arrayBuffer.byteLength,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 4: 画像リサイズ（最大768px、jpeg quality 0.7）
    currentStep = 'Step4: 画像リサイズ';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let resizedBuffer: Buffer;
    let resizedMime: string;
    try {
      // sharpが使えるか試す（動的インポートでビルド時エラーを回避）
      let sharp: any = null;
      try {
        // Functionコンストラクタを使って動的インポート（ビルド時の静的解析を回避）
        const dynamicImport = new Function('modulePath', 'return import(modulePath)');
        sharp = await dynamicImport('sharp');
      } catch (e) {
        console.log('[auto-layout API] sharp未インストール、リサイズなしで続行');
      }

      if (sharp && sharp.default) {
        // sharpを使用してリサイズ
        const sharpInstance = sharp.default(arrayBuffer);
        const metadata = await sharpInstance.metadata();
        
        const maxSize = 768;
        let resizeWidth = metadata.width;
        let resizeHeight = metadata.height;
        
        if (metadata.width > maxSize || metadata.height > maxSize) {
          if (metadata.width > metadata.height) {
            resizeWidth = maxSize;
            resizeHeight = Math.round((maxSize / metadata.width) * metadata.height);
          } else {
            resizeHeight = maxSize;
            resizeWidth = Math.round((maxSize / metadata.height) * metadata.width);
          }
        }
        
        resizedBuffer = await sharpInstance
          .resize(resizeWidth, resizeHeight, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 70 })
          .toBuffer();
        resizedMime = 'image/jpeg';
        
        console.log(`[auto-layout API] ${currentStep} 完了 (sharp)`, {
          originalSize: { width: metadata.width, height: metadata.height },
          resizedSize: { width: resizeWidth, height: resizeHeight },
          bufferSize: resizedBuffer.length,
        });
      } else {
        // sharpが使えない場合は、元のBufferをそのまま使用（リサイズなし）
        // 注意: 大きな画像の場合はbase64が長くなる可能性がある
        resizedBuffer = Buffer.from(arrayBuffer);
        resizedMime = file.type || 'image/png';
        
        console.log(`[auto-layout API] ${currentStep} 完了 (sharp未使用、リサイズなし)`, {
          bufferSize: resizedBuffer.length,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 5: base64化
    currentStep = 'Step5: base64化';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let dataUrl: string;
    try {
      const base64 = resizedBuffer.toString('base64');
      dataUrl = `data:${resizedMime};base64,${base64}`;
      
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        bufferLength: resizedBuffer.length,
        base64Length: base64.length,
        dataUrlLength: dataUrl.length,
        dataUrlPrefix: dataUrl.slice(0, 50),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 6: fetch body JSON.stringify 前
    currentStep = 'Step6: fetch body JSON.stringify前';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let reqBodyStr: string;
    try {
      const userMessageText = `このバナー画像を分析し、ロゴ、商品画像、キャッチコピー、CTA、注釈のBBoxを検出してください。

必ずJSONだけ返す。前後の文字禁止。マークダウンコードブロックも不要。

出力形式（JSONのみ）:
{
  "components": [
    {
      "id": "comp_1",
      "type": "logo" | "product_image" | "headline" | "cta" | "annotation",
      "bbox": { "x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0 },
      "confidence": 0.0-1.0,
      "note": "任意のメモ"
    }
  ]
}

制約:
- bbox座標は0.0-1.0の正規化座標で返す（画像サイズは${imageWidth}x${imageHeight}）
- w/hは最小0.02以上
- x+w <= 1, y+h <= 1を満たす
- テキスト内容は推測しない（bbox配置とtype分類のみ）
- 不確実なものはconfidenceを低く設定`;

      const reqBody = {
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: userMessageText },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      };
      
      reqBodyStr = JSON.stringify(reqBody);
      
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        reqBodyStrLength: reqBodyStr.length,
        reqBodyStrPrefix: reqBodyStr.slice(0, 200),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 7: fetch実行
    currentStep = 'Step7: fetch実行';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let openRouterResponse: Response;
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY環境変数が設定されていません');
      }
      
      // OpenRouterへのfetchヘッダー: 非ASCII文字は完全禁止（ByteStringエラー防止）
      // ルール: すべてのヘッダー値はASCII文字（\x00-\xFF）のみとする
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000', // ASCIIのみに固定
        'X-Title': 'banner-analyzer', // 日本語を排除、ASCIIのみ
      };
      
      // 非ASCII文字チェック: fetch直前に検証
      const hasNonAsciiHeader = Object.entries(headers).some(([key, value]) => {
        const str = String(value);
        // ASCII範囲外（\x00-\x7F）の文字が含まれているかチェック
        return /[^\x00-\x7F]/.test(str);
      });
      
      if (hasNonAsciiHeader) {
        const nonAsciiHeaders = Object.entries(headers)
          .filter(([key, value]) => /[^\x00-\x7F]/.test(String(value)))
          .map(([key, value]) => `${key}: ${String(value).slice(0, 50)}`);
        
        console.error(`[auto-layout API] ${currentStep} 非ASCIIヘッダー検出`, {
          nonAsciiHeaders,
        });
        throw new Error(`[${currentStep}] Non-ASCII header detected: ${nonAsciiHeaders.join(', ')}`);
      }
      
      console.log(`[auto-layout API] ${currentStep} ヘッダーチェック完了`, {
        headerKeys: Object.keys(headers),
        allHeadersAscii: true,
      });
      
      openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: reqBodyStr,
      });
      
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
        ok: openRouterResponse.ok,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 8: res.text() 取得
    currentStep = 'Step8: res.text()取得';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let responseText: string;
    try {
      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text();
        throw new Error(`OpenRouter API error: ${openRouterResponse.status} ${errorText.substring(0, 200)}`);
      }
      
      responseText = await openRouterResponse.text();
      
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        responseTextLength: responseText.length,
        responseTextPrefix: responseText.substring(0, 200),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
        responseStatus: openRouterResponse.status,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 9: res.json() パース & Zod検証
    currentStep = 'Step9: JSON.parse & Zod検証';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    let result: z.infer<typeof LLMResponseSchema>;
    try {
      // OpenRouterレスポンスのJSONパース
      const openRouterData = JSON.parse(responseText);
      
      if (!openRouterData.choices || openRouterData.choices.length === 0) {
        throw new Error('OpenRouter API returned no choices');
      }
      
      const content = openRouterData.choices[0].message.content;
      if (!content || typeof content !== 'string') {
        throw new Error(`OpenRouter API returned invalid content: ${typeof content}`);
      }
      
      // contentからJSONを抽出（マークダウンコードブロックがあれば除去）
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content.trim();
      
      // JSONパース
      const parsedJson = JSON.parse(jsonString);
      
      // Zod検証
      result = LLMResponseSchema.parse(parsedJson);
      
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        componentsCount: result.components.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
        responseTextPrefix: responseText?.substring(0, 500),
      });
      
      if (error instanceof z.ZodError) {
        console.error(`[auto-layout API] ${currentStep} Zod検証エラー詳細`, {
          errors: error.errors,
        });
      }
      
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }

    // Step 10: バリデーションと正規化
    currentStep = 'Step10: バリデーションと正規化';
    console.log(`[auto-layout API] ${currentStep} 開始`);
    
    try {
      const validatedComponents = result.components.map((comp) => {
        // 0..1範囲にclamp
        const clampedX = Math.max(0, Math.min(1, comp.bbox.x));
        const clampedY = Math.max(0, Math.min(1, comp.bbox.y));
        const clampedW = Math.max(0.02, Math.min(1 - clampedX, comp.bbox.w));
        const clampedH = Math.max(0.02, Math.min(1 - clampedY, comp.bbox.h));
        
        return {
          id: comp.id || `comp_${Date.now()}_${Math.random()}`,
          type: comp.type,
          bbox: {
            x: clampedX,
            y: clampedY,
            w: clampedW,
            h: clampedH,
          },
          confidence: Math.max(0, Math.min(1, comp.confidence || 0.5)),
          note: comp.note,
        };
      });
      
      console.log(`[auto-layout API] ${currentStep} 完了`, {
        validatedComponentsCount: validatedComponents.length,
      });
      
      return NextResponse.json({
        components: validatedComponents,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[auto-layout API] ${currentStep} エラー`, {
        errorMessage,
        errorStack,
      });
      throw new Error(`[${currentStep}] ${errorMessage}`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[auto-layout API] 最終エラーハンドリング', {
      step: currentStep,
      errorMessage,
      errorStack,
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        step: currentStep,
      },
      { status: 500 }
    );
  }
}
