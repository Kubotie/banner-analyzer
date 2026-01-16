/**
 * AI（LLM）クライアント
 * OpenAI APIまたはOpenRouter.ai APIを使用して、Extraction/Aggregation/Persona生成を行う
 */

// 環境変数からAPIキーを取得（.env.localに設定）
// OpenRouter.aiを使用する場合: NEXT_PUBLIC_OPENROUTER_API_KEY
// OpenAI APIを使用する場合: NEXT_PUBLIC_OPENAI_API_KEY
const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_BASE_URL || 
  (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');

// 使用するモデル（環境変数で指定可能、デフォルトはClaude Sonnet 4.5）
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_AI_MODEL || 
  (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ? 'anthropic/claude-sonnet-4.5' : 'gpt-4o-mini');

/**
 * LLM APIを呼び出す汎用関数（リトライ機能付き）
 * @param allowArrayResponse - trueの場合、JSON配列を返すことを許可（response_formatを設定しない）
 * @param maxRetries - 最大リトライ回数（デフォルト: 3）
 */
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3,
  allowArrayResponse: boolean = false,
  maxRetries: number = 3
): Promise<string> {
  if (!API_KEY) {
    const errorMessage = 'APIキーが設定されていません。\n\n設定方法:\n1. プロジェクトルートに .env.local ファイルを作成\n2. 以下を記入:\n   NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key_here\n\nまたは\n   NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here\n\n3. 開発サーバーを再起動';
    throw new Error(errorMessage);
  }

  // OpenRouter.aiを使用する場合のヘッダー
  const isOpenRouter = API_BASE_URL.includes('openrouter.ai');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };

  // OpenRouter.aiの推奨ヘッダーを追加
  if (isOpenRouter) {
    // サーバーサイドとクライアントサイドの両方に対応
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    headers['HTTP-Referer'] = siteUrl;
    headers['X-Title'] = 'Persona Summary App';
  }

  // requestBodyを先に定義
  const requestBody: any = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
  };
  
  // JSON配列を返す場合は response_format を設定しない
  // response_format: { type: 'json_object' } は単一オブジェクトのみを返すため、配列の場合は使わない
  if (!allowArrayResponse) {
    requestBody.response_format = { type: 'json_object' };
  }

  let lastError: Error | null = null;
  
  // リトライループ
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // fetchオプションを設定（HTTP/2エラー対策）
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        // HTTP/2エラー対策: keepaliveを無効化
        keepalive: false,
        // キャッシュを無効化
        cache: 'no-store',
      };

      const response = await fetch(`${API_BASE_URL}/chat/completions`, fetchOptions);

      // HTTP/2プロトコルエラーの場合、ステータスが200でもbodyの読み取りに失敗する可能性がある
      if (!response.ok) {
        // エラーレスポンスをテキストとして取得
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (textError) {
          // テキスト読み取りに失敗した場合
          throw new Error(`API呼び出しエラー: HTTP ${response.status} ${response.statusText} (レスポンス読み取り失敗)`);
        }
        
        // JSONかどうかを確認（HTMLエラーページの場合を考慮）
        let errorMessage = response.statusText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorJson.message || response.statusText;
        } catch (parseError) {
          // JSONでない場合（HTMLエラーページなど）
          // HTMLの場合は最初の200文字程度を表示
          if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
            errorMessage = `APIエラー (${response.status}): HTMLエラーページが返されました。APIエンドポイントが正しく設定されているか確認してください。`;
          } else {
            errorMessage = `APIエラー (${response.status}): ${errorText.substring(0, 200)}`;
          }
        }
        
        throw new Error(`API呼び出しエラー: ${errorMessage}`);
      }

      // レスポンスボディを読み取る（HTTP/2エラー対策）
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (textError) {
        // テキスト読み取りに失敗した場合、リトライ
        if (attempt < maxRetries) {
          console.warn(`レスポンス読み取り失敗 (試行 ${attempt}/${maxRetries}), リトライします...`, textError);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 指数バックオフ
          continue;
        }
        throw new Error(`レスポンス読み取りエラー: ${textError instanceof Error ? textError.message : String(textError)}`);
      }

      // JSONパース
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // JSONパースに失敗した場合、リトライ
        if (attempt < maxRetries) {
          console.warn(`JSONパース失敗 (試行 ${attempt}/${maxRetries}), リトライします...`, parseError);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(`JSONパースエラー: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      const content = data.choices[0]?.message?.content || '';
      if (!content) {
        if (attempt < maxRetries) {
          console.warn(`レスポンスにコンテンツが含まれていません (試行 ${attempt}/${maxRetries}), リトライします...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error('レスポンスにコンテンツが含まれていません');
      }

      return content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // リトライ可能なエラーの場合
      const isRetryableError = 
        error instanceof TypeError && error.message.includes('Failed to fetch') ||
        error instanceof TypeError && error.message.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
        (error instanceof Error && error.message.includes('ネットワーク'));
      
      if (isRetryableError && attempt < maxRetries) {
        const delay = 1000 * attempt; // 指数バックオフ: 1秒、2秒、3秒...
        console.warn(`API呼び出しエラー (試行 ${attempt}/${maxRetries}), ${delay}ms後にリトライします...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // リトライ不可能、または最後の試行
      if (attempt === maxRetries) {
        console.error(`LLM API呼び出しエラー (全${maxRetries}回試行失敗):`, error);
        throw lastError;
      }
    }
  }

  // ここに到達することはないはずだが、念のため
  throw lastError || new Error('予期しないエラーが発生しました');
}

/**
 * 入力ソース全体からExtractionRecordを生成（LLMがrespondentを識別）
 */
export async function generateExtractionFromSource(
  sourceText: string,
  sourceId: string,
  metadata?: { interviewName?: string; interviewDate?: string; segment?: string; owner?: string },
  maxRetries: number = 2
): Promise<any[]> {
  const systemPrompt = `あなたは定性データ分析の専門家です。アンケートやインタビュー記録から、回答者（respondent）を識別し、各回答者ごとに事実のみを抽出して構造化されたJSONを生成してください。

制約:
- 入力テキストを分析し、回答者（respondent）を識別してください（1人のアンケートなら1人、複数人のインタビューなら複数人）
- 発言に存在しない情報は推測せず、nullを返してください
- 解釈や要約をせず、発言から直接抽出できる事実のみを記録してください
- 各フィールドに対応する原文の引用（quotes）を必ず含めてください
- 断定表現は使用せず、事実のみを記録してください
- **特に重要: trigger（購入・検討のきっかけ）とbarriers（迷い・不安・離脱理由）は、入力テキストに該当する情報が含まれている場合は必ず抽出してください。質問文と回答文の両方を注意深く確認し、見落とさないでください。**
- 出力はJSONのみで、余計な文章は含めないでください

出力形式: ExtractionRecordの配列（JSON配列）`;

  const metadataText = metadata 
    ? `\nメタデータ:\n- インタビュー名: ${metadata.interviewName || '未指定'}\n- 実施日: ${metadata.interviewDate || '未指定'}\n- セグメント: ${metadata.segment || '未指定'}\n- 担当者: ${metadata.owner || '未指定'}`
    : '';

  const userPrompt = `以下のアンケート/インタビュー記録から、回答者（respondent）を識別し、各回答者ごとにExtraction JSONを生成してください。

入力テキスト:
${sourceText}${metadataText}

【重要: 複数回答者の識別】
- 入力テキストを注意深く分析し、回答者の数を正確に判断してください
- テキストに「属性」「自身使用」「年齢」「都道府県」などの見出しや区切りがある場合、それぞれが別の回答者を示している可能性があります
- 複数の回答者が含まれている場合は、必ずすべての回答者に対してExtractionRecordを生成してください
- 年齢、都道府県、職業、購入履歴などの異なる情報が含まれている場合、それらは異なる回答者である可能性が高いです
- 見出し（「属性」「自身使用」など）や空行で区切られているセクションは、別の回答者の情報である可能性があります

【回答者の識別方法】
1. 「属性」「自身使用」などの見出しで区切られている場合 → 各セクションごとに1人の回答者
2. 年齢・都道府県・職業が異なる情報が続いている場合 → 異なる回答者
3. 家族構成や購入履歴などが大きく異なる場合 → 異なる回答者
4. 同じパターンが複数回繰り返されている場合 → 複数の回答者

重要:
- 入力テキスト内に含まれる回答者の数に応じて、必ず同じ数のExtractionRecordを生成してください
- 例: 6人のインタビューが含まれている場合、6つのExtractionRecordを生成してください
- 回答者を統合したり、省略したりしないでください
- 各回答者ごとに、以下のフィールドを抽出してください:
  - respondent_id: 回答者ID（識別できない場合は生成、例: "R001"）
  - role: 代理購入者/本人購入者/不明 または null（柔軟に判断してください。固定の選択肢に限定せず、適切な表現を使用）
  - relationship: 配偶者/親/子/その他 または null（柔軟に判断してください。例: "恋人"、"同棲パートナー"なども可）
  - household: オブジェクト形式 {composition?: string, age_range?: string, occupation?: string} または null
  - purchase_context: オブジェクト形式 {timing?: string, channel?: string, type?: "定期"|"まとめ買い"|"単発"|null} または null
  - trigger: 配列形式 ["トリガー1", "トリガー2", ...]（最低でも空配列[]）
    **重要: trigger（購入・検討のきっかけ）は必ず抽出してください。以下のような表現を探してください:**
    - 「きっかけ」「購入した理由」「なぜ購入したか」「購入のきっかけ」「購入に至った理由」
    - 「〜が気になって」「〜を探していて」「〜が必要で」「〜が欲しくて」
    - 「〜を見て」「〜を聞いて」「〜を調べて」「〜を知って」
    - 「〜で悩んでいて」「〜が気になって」「〜を改善したくて」
    - 「〜の広告を見て」「〜の口コミを見て」「〜のレビューを見て」
    - 「〜がなくなった」「〜が切れた」「〜が足りない」
    - 「〜のタイミングで」「〜の時に」「〜のシーンで」
    - 質問文に「どうやって情報を仕入れて、なぜ購入に行きつきましたか？」「その時は、どうやって情報を仕入れて、なぜ購入に行きつきましたか？」などがある場合、その回答部分を抽出
    - 質問文に「オルビスでお買い物をするタイミングはどんなときですか？」などがある場合、その回答部分を抽出
    - 質問文に「直近1か月で、ご自分のために購入された化粧品はありますか？」などがある場合、その購入理由やきっかけを抽出
    **例: 「おすすめに出てきた、あおこにあったコメント、いい匂い<効果が出る」→ trigger: ["おすすめに出てきた", "あおこにあったコメント", "いい匂い", "効果が出る"]**
    **例: 「なくなったタイミングか安くなったタイミングで」→ trigger: ["なくなったタイミング", "安くなったタイミング"]**
    **例: 「肌の状態を気にする」「年齢的に気になって」→ trigger: ["肌の状態を気にする", "年齢的に気になって"]**
  - job_to_be_done: オブジェクト形式 {functional?: string[], emotional?: string[], social?: string[]} または null
  - barriers: 配列形式 ["障壁1", "障壁2", ...]（最低でも空配列[]）
    **重要: barriers（迷い・不安・離脱理由）も必ず抽出してください。以下のような表現を探してください:**
    - 「迷った」「不安だった」「心配だった」「躊躇した」
    - 「〜が高くて」「〜が高すぎて」「〜が高かった」
    - 「〜が合わなかった」「〜が効果なかった」「〜が期待外れだった」
    - 「〜が面倒で」「〜が手間で」「〜が複雑で」
    - 「〜がわからなくて」「〜が不明確で」「〜が不透明で」
  - decision_criteria: オブジェクト形式 {price?: number, trust?: number, effort?: number, effectiveness?: number} または null（各値は0-1の範囲）
  - information_sources: 配列形式 ["情報源1", "情報源2", ...]（最低でも空配列[]）
  - behavior_patterns: オブジェクト形式 {who?: string, when?: string, what?: string} または null
  - quotes: 各フィールドに対応する原文引用（必須、最低1件以上含めること）
    - 各quoteには以下を含める:
      - quoteText: 原文抜粋（必須、入力テキストから正確に引用。要約や言い換えではなく、元のテキストの該当部分をそのまま引用してください。文字単位で一致する必要があります）
      - source: 出典ファイル（必須、入力ソースID: "${sourceId}"）
      - category: フィールド名（例: "trigger", "barrier", "role"）
      - linked_fields: このquoteが紐付いているフィールド名の配列（例: ["role", "trigger"]）

重要: quoteTextは、入力テキストから文字単位で正確に引用してください。
- **要約や言い換え、再構成は厳禁です。元のテキストの該当部分を文字単位でそのままコピーしてください**
- **例: 入力テキストに「子供が小さいので仕事終わりは…今育休中なのでずっと家にいるんですけど、帰ってくると12時なんですけど、家事をして筋トレが趣味なので、ジムには行けてないんですけど、鍛えたりランニングしたりしてます」がある場合、quoteTextは「家事をして筋トレが趣味なので、ジムには行けてないんですけど、鍛えたりランニングしたりしてます」のように、元のテキストの該当部分をそのまま引用してください。「子供が小さいので家事をして筋トレが趣味」のように要約しないでください**
- **例: 入力テキストに「妻が化粧品（ウカ）でたくさん商品が転がっている、世の中男性も色々やっているので妻にやりなさいって言われて」がある場合、quoteTextは「妻が化粧品（ウカ）でたくさん商品が転がっている、世の中男性も色々やっているので妻にやりなさいって言われて」のように、元のテキストをそのまま引用してください。「妻が化粧品でたくさん商品が転がっている」のように要約しないでください**
- **フィールド名（「職業」「年齢」「都道府県」など）をquoteTextに含めないでください。値のみを引用してください**
- **例: 入力テキストに「会社員、経営企画」がある場合、quoteTextは「会社員、経営企画」のみとしてください。「職業 会社員、経営企画」のようにフィールド名を含めないでください**
- 例: 入力テキストに「インスタでたまに流れてくるもの見たり」がある場合、これをそのまま引用してください（「Instagramで時々見る」のような要約は不可）
- **長い文章の場合でも、元のテキストから該当部分をそのまま引用してください。要約や短縮は禁止です**

出力形式: ExtractionRecordの配列（JSON配列）
[
  {
    "respondent_id": "R001",
    "role": "本人購入者",
    "relationship": null,
    "household": { "age_range": "40代", "occupation": "会社員" },
    "purchase_context": null,
    "trigger": ["おすすめに出てきた", "あおこにあったコメント", "いい匂い", "効果が出る"],
    "job_to_be_done": null,
    "barriers": ["障壁1"],
    "decision_criteria": null,
    "information_sources": [],
    "behavior_patterns": null,
    "quotes": [
      {
        "quoteText": "原文から抜粋したテキスト",
        "source": "${sourceId}",
        "category": "trigger",
        "linked_fields": ["trigger"]
      }
    ]
  }
]

重要: 
- quotes配列は必須です。最低1件以上のquoteを含めてください。
- **各フィールド（role, trigger, barriers等）に対応するquoteを必ず生成してください。特にtriggerとbarriersは、入力テキストに該当する情報が含まれている場合は必ず抽出し、対応するquoteを生成してください。**
- **triggerやbarriersが空配列[]の場合でも、入力テキストを再確認してください。質問文と回答文の両方を確認し、購入のきっかけや障壁に関する情報が含まれていないか確認してください。**
- roleやrelationshipは、固定の選択肢に限定せず、入力テキストから適切に判断してください。
- **入力テキスト内に含まれるすべての回答者に対してExtractionRecordを生成してください。省略しないでください。**
- **6人のインタビューが含まれている場合は、必ず6つのExtractionRecordを生成してください。**
- **複数の回答者が同じ年齢・都道府県・職業を持つ場合でも、異なるrespondent_idを割り当てて、それぞれ別のExtractionRecordとして生成してください。**
- JSON配列のみを返してください。余計な文章や説明は含めないでください。

【抽出の優先順位】
1. 基本的な属性情報（年齢、職業、都道府県など）を抽出
2. **購入・検討のきっかけ（trigger）を必ず抽出** - 質問文と回答文の両方を確認
3. **迷い・不安・離脱理由（barriers）を必ず抽出** - 否定的な表現や懸念を探す
4. 判断基準（decision_criteria）を抽出
5. その他の情報を抽出

出力例（複数回答者の場合）:
[
  { "respondent_id": "R001", ... },
  { "respondent_id": "R002", ... },
  { "respondent_id": "R003", ... },
  { "respondent_id": "R004", ... },
  { "respondent_id": "R005", ... },
  { "respondent_id": "R006", ... }
]`;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 配列を返す場合は allowArrayResponse を true に設定
      const response = await callLLM(systemPrompt, userPrompt, 0.2, true);
      
      // JSONパース
      let parsedResponse: any;
      try {
        // 余計な文章を除去（JSON配列部分のみを抽出）
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          // 単一オブジェクトの場合も配列に変換
          const objMatch = response.match(/\{[\s\S]*\}/);
          if (objMatch) {
            parsedResponse = [JSON.parse(objMatch[0])];
          } else {
            parsedResponse = JSON.parse(response);
          }
        }
        
        // 配列でない場合は配列に変換
        if (!Array.isArray(parsedResponse)) {
          parsedResponse = [parsedResponse];
        }
        
        // デバッグ: 生成されたExtractionRecordの数を確認
        console.log(`AIが生成したExtractionRecord数: ${parsedResponse.length}件`);
        
        // デバッグ: quotesが存在するか確認、およびtrigger/barriersの抽出状況を確認
        for (const record of parsedResponse) {
          if (!record.quotes || !Array.isArray(record.quotes) || record.quotes.length === 0) {
            console.warn('AIの出力にquotesが含まれていません:', {
              respondentId: record.respondent_id,
              hasQuotes: !!record.quotes,
              quotesType: typeof record.quotes,
              quotesLength: Array.isArray(record.quotes) ? record.quotes.length : 'not array',
            });
          }
          
          // triggerとbarriersの抽出状況を確認
          const triggerCount = Array.isArray(record.trigger) ? record.trigger.length : 0;
          const barriersCount = Array.isArray(record.barriers) ? record.barriers.length : 0;
          const triggerQuotes = Array.isArray(record.quotes) 
            ? record.quotes.filter((q: any) => q.category === 'trigger' || (q.linked_fields && q.linked_fields.includes('trigger')))
            : [];
          const barriersQuotes = Array.isArray(record.quotes)
            ? record.quotes.filter((q: any) => q.category === 'barriers' || (q.linked_fields && q.linked_fields.includes('barriers')))
            : [];
          
          if (triggerCount === 0) {
            console.warn(`⚠️ triggerが抽出されていません (${record.respondent_id}):`, {
              triggerCount,
              triggerQuotesCount: triggerQuotes.length,
              hasQuotes: Array.isArray(record.quotes) && record.quotes.length > 0,
            });
          } else {
            console.log(`✓ trigger抽出成功 (${record.respondent_id}):`, {
              triggerCount,
              triggers: record.trigger,
              triggerQuotesCount: triggerQuotes.length,
            });
          }
          
          if (barriersCount === 0) {
            console.warn(`⚠️ barriersが抽出されていません (${record.respondent_id}):`, {
              barriersCount,
              barriersQuotesCount: barriersQuotes.length,
            });
          } else {
            console.log(`✓ barriers抽出成功 (${record.respondent_id}):`, {
              barriersCount,
              barriers: record.barriers,
              barriersQuotesCount: barriersQuotes.length,
            });
          }
        }
        
        // 警告: 生成された数が少ない場合
        if (parsedResponse.length < 3) {
          console.warn(`⚠️ 生成されたExtractionRecord数が少ない可能性があります: ${parsedResponse.length}件`);
          console.warn('入力テキストに複数の回答者が含まれている可能性があります。プロンプトを確認してください。');
        }
      } catch (parseError) {
        console.error('JSONパースエラー:', parseError, 'Response:', response.substring(0, 500));
        throw new Error(`JSONパースエラー: ${parseError instanceof Error ? parseError.message : '不明なエラー'}`);
      }
      
      return parsedResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`Extraction生成リトライ (${attempt + 1}/${maxRetries}):`, lastError.message);
        // リトライ前に少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError || new Error('Extraction生成に失敗しました');
}

/**
 * Extraction生成用のプロンプト（リトライ機能付き）
 * @deprecated 新しい実装では generateExtractionFromSource を使用してください
 */
export async function generateExtractionWithAI(
  statements: Array<{ id: string; text: string; source: string; metadata?: { lineNumber?: number; line_range?: { start: number; end: number } } }>,
  maxRetries: number = 2
): Promise<any> {
  const systemPrompt = `あなたは定性データ分析の専門家です。発言から事実のみを抽出し、構造化されたJSONを生成してください。

制約:
- 発言に存在しない情報は推測せず、nullを返してください
- 解釈や要約をせず、発言から直接抽出できる事実のみを記録してください
- 各フィールドに対応する発言の引用（quotes）を必ず含めてください
- 断定表現は使用せず、事実のみを記録してください
- 出力はJSONのみで、余計な文章は含めないでください

出力形式: JSON（ExtractionRecord形式）のみ`;

  const statementsText = statements.map((s, idx) => {
    const lineInfo = s.metadata?.line_range 
      ? `行範囲: ${s.metadata.line_range.start}-${s.metadata.line_range.end}`
      : s.metadata?.lineNumber 
        ? `行番号: ${s.metadata.lineNumber}`
        : '';
    return `[${idx + 1}] ID: ${s.id}\n発言: ${s.text}\n出典: ${s.source}${lineInfo ? `\n${lineInfo}` : ''}`;
  }).join('\n\n');

  const userPrompt = `以下の発言から、Extraction JSONを生成してください。

発言リスト:
${statementsText}

各respondent（回答者）ごとに、以下のフィールドを抽出してください:
- respondent_id: 回答者ID（識別できない場合は生成）
- role: 代理購入者/本人購入者/不明/null
- relationship: 配偶者/親/子/その他/null
- household: オブジェクト形式 {composition?: string, age_range?: string, occupation?: string} または null
- purchase_context: オブジェクト形式 {timing?: string, channel?: string, type?: "定期"|"まとめ買い"|"単発"|null} または null
- trigger: 配列形式 ["トリガー1", "トリガー2", ...]（最低でも空配列[]）
- job_to_be_done: オブジェクト形式 {functional?: string[], emotional?: string[], social?: string[]} または null
- barriers: 配列形式 ["障壁1", "障壁2", ...]（最低でも空配列[]）
- decision_criteria: オブジェクト形式 {price?: number, trust?: number, effort?: number, effectiveness?: number} または null（各値は0-1の範囲）
- information_sources: 配列形式 ["情報源1", "情報源2", ...]（最低でも空配列[]）
- behavior_patterns: オブジェクト形式 {who?: string, when?: string, what?: string} または null
- quotes: 各フィールドに対応する原文引用（必須、最低1件以上含めること）
  - 各quoteには以下を含める:
    - statementId: 元のStatement ID（必須、発言リストのIDを使用）
    - quoteText: 原文抜粋（必須、該当statement.textに含まれること）
    - source: 出典ファイル（必須）
    - line_range: 行範囲 {start: number, end: number}（可能な場合）
    - category: フィールド名（例: "trigger", "barrier", "role"）
    - linked_fields: このquoteが紐付いているフィールド名の配列（例: ["role", "trigger"]）

重要: 
- quotes配列は必須です。最低1件以上のquoteを含めてください。
- 各フィールド（role, trigger, barriers等）に対応するquoteを必ず生成してください。
- 各quoteには必ずstatementId、quoteText、sourceを含めてください。
- JSONのみを返してください。余計な文章や説明は含めないでください。

出力例:
{
  "respondent_id": "R001",
  "role": "代理購入者",
  "relationship": "配偶者",
  "household": null,
  "purchase_context": null,
  "trigger": ["きっかけ1", "きっかけ2"],
  "job_to_be_done": null,
  "barriers": ["障壁1"],
  "decision_criteria": null,
  "information_sources": [],
  "behavior_patterns": null,
  "quotes": [
    {
      "statementId": "stmt-001",
      "quoteText": "発言から抜粋したテキスト",
      "source": "ファイル名",
      "category": "trigger",
      "linked_fields": ["trigger"]
    }
  ]
}`;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(systemPrompt, userPrompt, 0.2);
      
      // JSONパース
      let parsedResponse: any;
      try {
        // 余計な文章を除去（JSON部分のみを抽出）
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          parsedResponse = JSON.parse(response);
        }
        
        // デバッグ: quotesが存在するか確認
        if (!parsedResponse.quotes || !Array.isArray(parsedResponse.quotes) || parsedResponse.quotes.length === 0) {
          console.warn('AIの出力にquotesが含まれていません:', {
            hasQuotes: !!parsedResponse.quotes,
            quotesType: typeof parsedResponse.quotes,
            quotesLength: Array.isArray(parsedResponse.quotes) ? parsedResponse.quotes.length : 'not array',
            responsePreview: response.substring(0, 500),
          });
        }
      } catch (parseError) {
        console.error('JSONパースエラー:', parseError, 'Response:', response.substring(0, 500));
        throw new Error(`JSONパースエラー: ${parseError instanceof Error ? parseError.message : '不明なエラー'}`);
      }
      
      return parsedResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`Extraction生成リトライ (${attempt + 1}/${maxRetries}):`, lastError.message);
        // リトライ前に少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError || new Error('Extraction生成に失敗しました');
}

/**
 * Aggregation生成用のプロンプト
 */
export async function generateAggregationWithAI(extractionRecords: any[]): Promise<any> {
  const systemPrompt = `あなたは定性データ分析の専門家です。Extraction JSONの配列から、クラスタリングとパターン抽出を行ってください。

制約:
- Extraction JSONのみを入力として使用してください
- 生テキストや発言には直接戻らないでください
- 優劣や正解を決めないでください
- 2〜5個のクラスタを生成してください
- 各クラスタの出現率を算出してください
- 代表的パターン（trigger/decision_criteria/barriers）を抽出してください
- 代表引用（3〜7件）をquotesから選択してください

出力形式: JSON（Aggregation形式）のみ。マークダウンコードブロック（\`\`\`json ... \`\`\`）は使用せず、JSONオブジェクトのみを返してください。文字列値には必ずダブルクォート（"）を使用してください。シングルクォート（'）は使用しないでください。`;

  const extractionText = JSON.stringify(extractionRecords, null, 2);

  const userPrompt = `以下のExtraction JSONの配列から、Aggregationを生成してください。

Extraction Records:
${extractionText}

以下の形式でJSONを返してください:
{
  "clusters": [
    {
      "id": "cluster-1",
      "name": "クラスタ名",
      "respondent_ids": ["R001", "R002", ...],
      "prevalence": 0.35,
      "patterns": {
        "triggers": ["トリガー1", "トリガー2"],
        "decision_criteria": { "price": 0.8, "trust": 0.3 },
        "barriers": ["障壁1", "障壁2"]
      },
      "representative_quotes": [
        { "quote": "引用テキスト", "respondent_id": "R001", "category": "trigger", "quote_id": "quote-001" }
      ]
    }
  ],
  "total_respondents": 20,
  "metadata": {
    "generated_at": "ISO日時",
    "extraction_count": 20
  }
}

重要: JSONのみを返してください。余計な文章やマークダウンコードブロックは含めないでください。`;

  const response = await callLLM(systemPrompt, userPrompt, 0.3);
  
  // JSONパース（マークダウンコードブロックや余計な文章を除去）
  try {
    let jsonString = response.trim();
    
    // マークダウンコードブロックを除去
    const jsonBlockMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1].trim();
    } else {
      const codeBlockMatch = jsonString.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      } else {
        // JSONオブジェクト部分のみを抽出
        const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonString = jsonObjectMatch[0];
        }
      }
    }
    
    // JSONパースを試みる
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (firstError) {
      // 最初のパースが失敗した場合、シングルクォートをダブルクォートに置換して再試行
      // 注意: これは完全には正確ではない可能性があるが、LLMがシングルクォートを使用した場合のフォールバック
      console.warn('JSONパース失敗、シングルクォートをダブルクォートに置換して再試行:', firstError);
      
      // シングルクォートをダブルクォートに置換（ただし、これは危険な可能性がある）
      // より安全な方法: 正規表現で文字列値内のシングルクォートのみを置換
      // 簡易版: すべてのシングルクォートをダブルクォートに置換
      const fixedJsonString = jsonString.replace(/'/g, '"');
      
      try {
        parsed = JSON.parse(fixedJsonString);
        console.log('シングルクォート置換後のパース成功');
      } catch (secondError) {
        // それでも失敗した場合は、元のエラーをスロー
        throw firstError;
      }
    }
    
    // デバッグ: パース成功をログに記録
    console.log('Aggregation生成成功:', {
      clustersCount: parsed.clusters?.length || 0,
      totalRespondents: parsed.total_respondents || 0,
    });
    
    return parsed;
  } catch (parseError) {
    console.error('Aggregation JSONパースエラー:', parseError);
    console.error('Response (先頭1000文字):', response.substring(0, 1000));
    
    // より詳細なエラーメッセージを提供
    const errorDetails = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`JSONパースエラー: ${errorDetails}\n\nLLM応答の先頭1000文字:\n${response.substring(0, 1000)}`);
  }
}

/**
 * Persona生成用のプロンプト（リトライ機能付き、ペルソナ軸対応）
 */
export async function generatePersonaWithAI(
  aggregation: any, 
  personaAxes: Array<{ id: string; name: string; description?: string }>, 
  maxRetries: number = 2,
  productInfo?: { name?: string; category?: string; description?: string; competitors?: Array<{ name: string }> }
): Promise<any[]> {
  const systemPrompt = `あなたは定性データ分析の専門家です。Aggregation結果から、UI表示用のPersonaカードを生成してください。

制約:
- Aggregation結果のみを入力として使用してください
- Extractionに直接戻らないでください
- A/Bにない事実を追加しないでください
- **Persona段階では、仮説を断定的に定義してください**
- 「傾向がある」「可能性がある」などの曖昧な表現は避け、断定的な表現を使用してください
- 年齢や具体的なパーソナリティを、データから類推して含めてください（仮説でも可）
- Evidence（引用と件数）は必須です
- 出力はJSON配列のみで、余計な文章は含めないでください

出力形式: JSON（Persona配列）のみ`;

  const aggregationText = JSON.stringify(aggregation, null, 2);
  
  // ペルソナ軸の説明を生成
  const axesDescription = personaAxes.length > 0
    ? personaAxes.map((axis, idx) => `  ${idx + 1}. ${axis.name}${axis.description ? `: ${axis.description}` : ''}`).join('\n')
    : '（軸が設定されていません）';

  // 商品情報コンテキストを生成
  const productContext = productInfo
    ? `\n\n【商品情報】\n- 名称: ${productInfo.name || '不明'}\n- カテゴリ: ${productInfo.category || '不明'}\n- 説明: ${productInfo.description || 'なし'}\n- 競合: ${productInfo.competitors?.map(c => c.name).join(', ') || 'なし'}`
    : '';

  const userPrompt = `以下のAggregation結果から、Personaカードを生成してください。

Aggregation:
${aggregationText}

【ペルソナ軸】
以下の軸に沿って、各クラスタからPersonaカードを生成してください：
${axesDescription}${productContext}

重要: 
- 各クラスタを、上記のペルソナ軸のいずれかに分類してください
- 1つのクラスタは1つの軸に対応します
- 複数のクラスタが同じ軸に対応する場合は、その軸に対して複数のPersonaを生成してください
- 軸に合致しないクラスタがある場合は、最も近い軸に分類してください

各クラスタから1つのPersonaカードを生成してください。以下の形式でJSON配列を返してください:

重要: Persona段階では、断定的な表現を使用してください。「傾向がある」「可能性がある」などの曖昧な表現は避けてください。年齢やパーソナリティも、データから類推して含めてください。

[
  {
    "id": "persona-1",
    "cluster_id": "cluster-1",
    "one_line_summary": "1行要約（断定的表現、例: 「30代後半の会社員で、スキンケアと日焼け対策に高い関心を持つ。」）",
    "background_story": "背景ストーリー（短文、断定的表現。年齢・職業・パーソナリティを含める。例: 「40代の会社員。清潔感を大切にし、効果的なスキンケアを求める。リモートワークと出社を併用し、バスケットボールなどの運動を定期的に行う。」）",
    "proxy_purchase_structure": {
      "whose_problem": "誰の課題か（断定的表現、例: 「自身の肌の健康に関心がある。」）",
      "who_solves": "誰が解決するか（断定的表現、例: 「信頼できるブランドが解決する。」）",
      "how": "どう解決しているか（断定的表現、例: 「効果的な製品を選ぶことで解決している。」）"
    },
    "job_to_be_done": {
      "functional": ["機能面JTBD（断定的表現）"],
      "emotional": ["感情面JTBD（断定的表現）"],
      "social": ["社会面JTBD（断定的表現）"]
    },
    "decision_criteria_top5": [
      { "criterion": "価格", "weight": 0.8 },
      ...
    ],
    "typical_journey": {
      "trigger": "きっかけ（断定的表現、例: 「肌の状態を気にする。」）",
      "consideration": "検討（断定的表現、例: 「使用感や効果を重視して検討する。」）",
      "purchase": "購入（断定的表現、例: 「信頼できるブランドから購入する。」）",
      "retention": "継続（断定的表現、例: 「効果を感じれば継続する。」情報不足の場合は「（情報不足）」）"
    },
    "common_misconceptions": ["誤解しやすいポイント（断定的表現、例: 「高価な製品が必ず効果的とは限らない。」）"],
    "effective_strategies": {
      "messages": ["メッセージ案（断定的表現）"],
      "touchpoints": ["導線案"],
      "offers": ["オファー案"]
    },
    "evidence": {
      "quotes": [
        { "text": "引用", "respondent_id": "R001", "category": "trigger" }
      ],
      "count": 15
    }
  }
]

重要:
- JSON配列のみを返してください。余計な文章や説明は含めないでください。
- 各クラスタに対して1つのPersonaを生成してください。
- evidence.quotesは必須です。最低1件以上のquoteを含めてください。
- 「傾向がある」「可能性がある」などの曖昧な表現は使用しないでください。断定的な表現を使用してください。
- 年齢、職業、パーソナリティなどの具体的な情報を、データから類推して含めてください。`;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(systemPrompt, userPrompt, 0.4);
      
      // JSONパース
      let parsedResponse: any;
      try {
        // 余計な文章を除去（JSON配列部分のみを抽出）
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          // 単一オブジェクトの場合も配列に変換
          const objMatch = response.match(/\{[\s\S]*\}/);
          if (objMatch) {
            parsedResponse = [JSON.parse(objMatch[0])];
          } else {
            parsedResponse = JSON.parse(response);
          }
        }
        
        // 配列でない場合は配列に変換
        if (!Array.isArray(parsedResponse)) {
          parsedResponse = [parsedResponse];
        }
        
        // デバッグ: Personaが存在するか確認
        console.log('Persona生成結果:', {
          count: parsedResponse.length,
          personas: parsedResponse.map((p: any) => ({
            id: p.id,
            cluster_id: p.cluster_id,
            hasEvidence: !!p.evidence,
            evidenceQuotesCount: p.evidence?.quotes?.length || 0,
          })),
        });
      } catch (parseError) {
        console.error('JSONパースエラー:', parseError, 'Response:', response.substring(0, 500));
        throw new Error(`JSONパースエラー: ${parseError instanceof Error ? parseError.message : '不明なエラー'}`);
      }
      
      return parsedResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`Persona生成リトライ (${attempt + 1}/${maxRetries}):`, lastError.message);
        // リトライ前に少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError || new Error('Persona生成に失敗しました');
}

/**
 * ペルソナ比較の詳細分析を生成（AI使用）
 */
export async function generateComparisonWithAI(personas: any[], maxRetries: number = 2): Promise<any> {
  const systemPrompt = `あなたは定性データ分析の専門家です。複数のペルソナを詳細に比較分析してください。

制約:
- 各ペルソナの情報を詳細に分析し、具体的な共通点と相違点を抽出してください
- 各フィールド（1行要約、背景ストーリー、代理購入構造、JTBD、判断基準、典型ジャーニー、誤解しやすいポイント、有効な施策）ごとに、個別に分析してください
- 「各ペルソナの特徴が異なる」のような一般的な記述は避け、具体的な違いを記述してください
- 共通点は、すべてのペルソナに共通する具体的な要素を抽出してください
- 相違点は、各ペルソナの個別の特徴や違いを具体的に記述してください
- 事実ベースで分析し、推測や補完は行わないでください
- 出力はJSON形式のみで、余計な文章は含めないでください

出力形式: JSON（比較分析結果）のみ`;

  const personasText = JSON.stringify(personas, null, 2);

  const userPrompt = `以下のペルソナを詳細に比較分析してください。

ペルソナ:
${personasText}

以下の形式でJSONを返してください:

{
  "commonPoints": [
    "共通点1（具体的に記述、例: 「すべてのペルソナが価格を判断基準として重視している。」）",
    "共通点2（例: 「機能面のJTBDとして、基本的なスキンケア機能を求めている。」）",
    ...
  ],
  "differences": [
    "相違点1（具体的に記述、例: 「ペルソナAは価格を最優先するが、ペルソナBは効果を最優先する。」）",
    "相違点2（例: 「ペルソナAは代理購入者で配偶者が購入するが、ペルソナBは本人購入者で自身が購入する。」）",
    ...
  ],
  "detailedAnalysis": {
    "one_line_summary": {
      "commonPoints": ["1行要約の共通点（具体的に）"],
      "differences": ["1行要約の相違点（具体的に、各ペルソナの違いを記述）"]
    },
    "background_story": {
      "commonPoints": ["背景ストーリーの共通点（具体的に）"],
      "differences": ["背景ストーリーの相違点（具体的に、各ペルソナの違いを記述）"]
    },
    "proxy_purchase_structure": {
      "commonPoints": ["代理購入構造の共通点（具体的に）"],
      "differences": ["代理購入構造の相違点（具体的に、各ペルソナの違いを記述）"]
    },
    "job_to_be_done": {
      "commonPoints": ["JTBDの共通点（具体的に）"],
      "differences": ["JTBDの相違点（具体的に、各ペルソナの違いを記述）"]
    },
    "decision_criteria_top5": {
      "commonPoints": ["判断基準の共通点（具体的に）"],
      "differences": ["判断基準の相違点（具体的に、各ペルソナの違いを記述）"]
    },
    "typical_journey": {
      "commonPoints": ["典型ジャーニーの共通点（具体的に）"],
      "differences": ["典型ジャーニーの相違点（具体的に、各ペルソナの違いを記述）"]
    },
    "common_misconceptions": {
      "commonPoints": ["誤解しやすいポイントの共通点（具体的に）"],
      "differences": ["誤解しやすいポイントの相違点（具体的に、各ペルソナの違いを記述）"]
    },
    "effective_strategies": {
      "commonPoints": ["有効な施策の共通点（具体的に）"],
      "differences": ["有効な施策の相違点（具体的に、各ペルソナの違いを記述）"]
    }
  }
}

重要:
- JSONのみを返してください。余計な文章や説明は含めないでください。
- 「各ペルソナの特徴が異なる」のような一般的な記述は避け、具体的な違いを記述してください。
- 各フィールドごとに、共通点と相違点を個別に分析してください。
- 共通点は、すべてのペルソナに共通する具体的な要素を抽出してください。
- 相違点は、各ペルソナの個別の特徴や違いを具体的に記述してください（例: 「ペルソナAは...だが、ペルソナBは...」）。`;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(systemPrompt, userPrompt, 0.3);
      
      // JSONパース
      let parsedResponse: any;
      try {
        // 余計な文章を除去（JSON部分のみを抽出）
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          parsedResponse = JSON.parse(response);
        }
        
        // デバッグ: 比較分析結果を確認
        console.log('比較分析結果:', {
          commonPointsCount: parsedResponse.commonPoints?.length || 0,
          differencesCount: parsedResponse.differences?.length || 0,
          hasDetailedAnalysis: !!parsedResponse.detailedAnalysis,
        });
      } catch (parseError) {
        console.error('JSONパースエラー:', parseError, 'Response:', response.substring(0, 500));
        throw new Error(`JSONパースエラー: ${parseError instanceof Error ? parseError.message : '不明なエラー'}`);
      }
      
      return parsedResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`比較分析リトライ (${attempt + 1}/${maxRetries}):`, lastError.message);
        // リトライ前に少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError || new Error('比較分析に失敗しました');
}

/**
 * ペルソナ軸を自動生成（AI使用）
 */
export async function generatePersonaAxesWithAI(aggregation: any, maxRetries: number = 2): Promise<Array<{ id: string; name: string; description?: string; order: number }>> {
  const systemPrompt = `あなたは定性データ分析の専門家です。Aggregation結果を分析して、適切なペルソナ軸を生成してください。

制約:
- Aggregation結果のクラスタを分析し、適切な分類軸を提案してください
- 2〜5個の軸を生成してください
- 各軸は明確で区別可能な分類基準であること
- 軸名は簡潔で分かりやすいこと
- 出力はJSON配列のみで、余計な文章は含めないでください

出力形式: JSON（PersonaAxis配列）のみ`;

  const aggregationText = JSON.stringify(aggregation, null, 2);

  const userPrompt = `以下のAggregation結果を分析して、適切なペルソナ軸を生成してください。

Aggregation:
${aggregationText}

以下の形式でJSON配列を返してください:

[
  {
    "id": "axis-1",
    "name": "軸名（例: 自身購入で悩みが深い人）",
    "description": "軸の説明（任意）",
    "order": 0
  },
  {
    "id": "axis-2",
    "name": "軸名（例: 自身購入で悩みが浅い人）",
    "description": "軸の説明（任意）",
    "order": 1
  },
  ...
]

重要:
- JSON配列のみを返してください。余計な文章や説明は含めないでください。
- 2〜5個の軸を生成してください。
- 各軸は、Aggregation結果のクラスタを適切に分類できるものであること。
- 軸名は簡潔で分かりやすいこと。`;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(systemPrompt, userPrompt, 0.4, true); // allowArrayResponse=true
      
      // JSONパース
      let parsedResponse: any;
      try {
        // 余計な文章を除去（JSON配列部分のみを抽出）
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          parsedResponse = JSON.parse(response);
        }
        
        // 配列でない場合は配列に変換
        if (!Array.isArray(parsedResponse)) {
          parsedResponse = [parsedResponse];
        }
        
        // orderを設定（既に含まれていない場合）
        parsedResponse = parsedResponse.map((axis: any, idx: number) => ({
          ...axis,
          order: axis.order !== undefined ? axis.order : idx,
        }));
        
        console.log('ペルソナ軸生成結果:', {
          count: parsedResponse.length,
          axes: parsedResponse.map((a: any) => ({ id: a.id, name: a.name })),
        });
      } catch (parseError) {
        console.error('JSONパースエラー:', parseError, 'Response:', response.substring(0, 500));
        throw new Error(`JSONパースエラー: ${parseError instanceof Error ? parseError.message : '不明なエラー'}`);
      }
      
      return parsedResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`ペルソナ軸生成リトライ (${attempt + 1}/${maxRetries}):`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError || new Error('ペルソナ軸生成に失敗しました');
}
