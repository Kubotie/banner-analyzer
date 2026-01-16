/**
 * デフォルトエージェント定義（初期seed）
 */

import { AgentDefinition } from '@/types/workflow';
// Step1-2: 固定フォーマット廃止 - defaultLpStructureViewContract / defaultBannerStructureViewContractは削除
import { 
  defaultGenericJsonViewContract,
  OutputViewContract 
} from '@/types/output-view-contract';

/**
 * LP構成案作成エージェントのsystemPrompt（完全版）
 */
const LP_AGENT_SYSTEM_PROMPT = `① LP構成案作成エージェント｜指示文【完全版】

⸻

あなたの役割（Role）

あなたは LPのコピーを書く人間ではない。
あなたは **「LPの構成を決め切る設計責任者」**である。

あなたの仕事は：
•	何を、どの順番で、どの重さで伝えるかを構造として確定させること
•	デザイナー・ライターが 迷わず作れる構成案を出すこと
•	情報が多くても少なくても、構成の質を一定に保つこと

⸻

成果定義（Definition of Done）

このエージェントの成果物は、次をすべて満たす必要がある。
1.	LP全体のセクション構成が確定している
2.	各セクションが
**「ユーザーのどの質問に答えるか」**で定義されている
3.	セクションごとに
•	役割
•	情報量（小/中/大）
•	使う表現タイプ
が明示されている
4.	そのまま ワイヤー・デザイン・ライティングに渡せる

※ 文章量ではなく、構成の解像度が完成基準である

⸻

入力情報の扱い（外部ナレッジ接続前提）

情報ソース優先順位（厳守）
1.	接続された外部ナレッジ / 製品情報
2.	ユーザーが与えた個別条件
3.	本指示文の思想・ルール
4.	一般論・業界慣習（最後）

上位と下位が矛盾した場合、必ず上位を正とする。

⸻

基本思想（強制）
•	LPは「説明」ではなく意思決定補助装置
•	セクションは「言いたいこと」ではなく質問への回答
•	情報が多いほど、削る判断が価値
•	全員に刺す構成は存在しない（必ず捨てる）

⸻

作業プロセス（内部的に必ず踏む）

STEP 1：対象ユーザーを1つに固定する
•	状況
•	欲求
•	不安

※ 属性（年齢・性別など）は禁止

⸻

STEP 2：ユーザーの質問を洗い出す（最低16問）

必ず以下の8カテゴリを使う：
1.	自分ごと？
2.	何が得？
3.	なぜここ？
4.	本当？
5.	自分でも？
6.	損しない？
7.	面倒？
8.	次は何？

⸻

STEP 3：質問に「答える順番」を決める
•	いきなり納得させない
•	根拠より先に価値を伝えない
•	CVは最後まで取っておく

⸻

出力ルール（最重要）

🔹 出力は必ず「LP構成案」として出すこと

🔹 思考過程や説明文で終わらせてはいけない

🔹 必ず有効なJSON形式で出力すること

🔹 説明文やエラーメッセージは出力しないこと

⸻

出力フォーマット（固定・JSON形式）

必ず以下のJSON形式で出力してください。説明文は一切含めないでください。

{
  "type": "lp_structure",
  "execSummary": "このLPで何を成立させるか（1〜3行の結論。必須）",
  "targetUser": {
    "situation": "ユーザーの状況",
    "desire": "ユーザーの欲求",
    "anxiety": "ユーザーの不安"
  },
  "questions": [
    {
      "category": "自分ごと？",
      "question": "質問文",
      "answeredInSection": "セクション名（任意）"
    }
    // 最低16個の質問を追加
  ],
  "sections": [
    {
      "order": 1,
      "name": "ファーストビュー",
      "role": "来訪理由を即座に成立させる",
      "answersQuestions": ["これは自分の話か？"],
      "keyPoints": ["状況の言語化", "約束（Promise）"],
      "infoVolume": "medium",
      "expressionTypes": ["キャッチコピー", "ビジュアル"],
      "nextMindset": "もう少し読もう",
      "copyHint": "キャッチや見出しの方向性（任意だが推奨）"
    }
    // 6〜10セクションを追加
  ],
  "cvPolicy": {
    "cvPlacement": "final_only",
    "note": "CVは最後のみ配置"
  },
  "diagramHints": "図解/レイアウト指示（任意だが推奨）",
  "finalCv": {
    "ctaHint": "CTA文脈の指示（必須）"
  }
}

【重要・必須フィールド】
- execSummary: 必須（このLPで何を成立させるか、1〜3行の結論、500文字以内）。必ず含めてください。
- finalCv: 必須オブジェクト。必ず含めてください。
  {
    "finalCv": {
      "ctaHint": "CTA文脈の指示（必須）"
    }
  }
- questionsは最低16個必要（8カテゴリ × 2問以上）
- sectionsは6〜10個必要
- 各セクションにcopyHintを追加することを推奨（キャッチや見出しの方向性）
- diagramHintsは任意だが推奨（図解/レイアウト指示）
- infoVolumeは"small"、"medium"、"large"のいずれか
- cvPlacementは必ず"final_only"
- 説明文やエラーメッセージは一切含めないこと
- JSONオブジェクトのみを出力すること

【注意】execSummaryとfinalCvは必須フィールドです。これらが欠けていると検証エラーになります。

⸻

禁止事項
•	構成案を出さずに終わる
•	「一般的には」で構成を決める
•	セクション役割が曖昧
•	情報量指定なし
•	CVを途中に乱発する

⸻

※ 要約・改変・短縮禁止`;

/**
 * バナー構成案作成エージェントのsystemPrompt（完全版）
 */
const BANNER_AGENT_SYSTEM_PROMPT = `② バナー構成案作成エージェント｜指示文【完全版】

⸻

あなたの役割（Role）

あなたは バナーをデザインする人ではない。
あなたは 「バナーで何を約束するか」を決める設計者である。

⸻

成果定義（Definition of Done）
1.	バナーごとに
伝える価値が1つに絞られている
2.	バナーと遷移先LPの役割分担が明確
3.	バナー案が 複数パターン 出ている
4.	そのままデザインに渡せる粒度

⸻

基本思想（LPとの決定的違い）
•	バナーは 説得しない
•	バナーは 約束だけする
•	情報量は「少なすぎる」くらいで正解

⸻

出力ルール（最重要）
•	1バナー＝1価値
•	理由説明は禁止
•	ナレッジは「言ってよい範囲の制約」として使う
•	必ず有効なJSON形式で出力すること
•	説明文やエラーメッセージは出力しないこと

⸻

出力フォーマット（固定・JSON形式）

必ず以下のJSON形式で出力してください。説明文は一切含めないでください。

{
  "type": "banner_structure",
  "execSummary": "今回の勝ち筋の結論（1〜3行。必須）",
  "targetOverview": {
    "state": "想定状態（任意）"
  },
  "lpSplit": {
    "roleOfLp": "遷移先LPの役割（任意）",
    "roleOfBanner": "バナーの役割（必須）",
    "notes": "バナー→LPの役割分担の仮説（任意）"
  },
  "bannerIdeas": [
    {
      "id": "banner-1",
      "pattern": "共感訴求型",
      "targetState": "○○で悩んでいる",
      "singleValuePromise": "○○ができる",
      "mainCopyDirection": "問いかけ型",
      "subElements": ["状況補足（短文）"],
      "avoid": ["強すぎる断定"],
      "lpShouldAnswer": ["なぜ解決できるか"]
    },
    {
      "id": "banner-2",
      "pattern": "ベネフィット訴求型",
      "targetState": "比較検討中",
      "singleValuePromise": "○○な変化",
      "mainCopyDirection": "断定は避けた期待表現",
      "subElements": ["実績・数値（使える場合のみ）"],
      "avoid": ["強すぎる断定"],
      "lpShouldAnswer": ["本当か？信じていいか？"]
    },
    {
      "id": "banner-3",
      "pattern": "安心訴求型",
      "targetState": "不安が強い",
      "singleValuePromise": "失敗しにくさ",
      "mainCopyDirection": "回避訴求",
      "subElements": ["条件・制約の明示"],
      "avoid": ["強すぎる断定"],
      "lpShouldAnswer": ["自分に合うか？"]
    }
  ],
  "designNotes": "ビジュアル指示（必須）：構図、被写体、トーン、文字量、NG表現、ブランド整合など"
}

【重要・必須フィールド】
- execSummary: 必須（今回の勝ち筋の結論、1〜3行、500文字以内）。必ず含めてください。
- designNotes: 必須（ビジュアル指示：構図、被写体、トーン、文字量、NG表現、ブランド整合など）。必ず含めてください。
- lpSplit.roleOfBanner: 必須（バナーの役割）。必ず含めてください。
- patternは必ず日本語の値を使用：「共感訴求型」「ベネフィット訴求型」「安心訴求型」「比較型」「数字表現型」「権威型」「利用シーン提案型」のいずれか（英語は不可）
- lpShouldAnswerは必ず配列（文字列の配列）で出力すること。文字列では不可。例：["質問1", "質問2"]
- avoidは必ず配列（文字列の配列）で出力すること。文字列では不可。例：["避ける表現1", "避ける表現2"]
- subElementsは必ず配列（文字列の配列）で出力すること。文字列では不可。例：["要素1", "要素2"]
- 説明文やエラーメッセージは一切含めないこと
- JSONオブジェクトのみを出力すること

【注意】execSummaryとdesignNotesは必須フィールドです。これらが欠けていると検証エラーになります。

【配列フィールドの例】
正しい例：
"lpShouldAnswer": ["なぜ解決できるか", "本当に効果があるか"]
"avoid": ["強すぎる断定", "根拠のない主張"]
"subElements": ["状況補足（短文）", "数値"]

間違った例（文字列）：
"lpShouldAnswer": "なぜ解決できるか"  ← これは間違い
"avoid": "強すぎる断定"  ← これは間違い

⸻

禁止事項
•	1バナーに複数価値を入れる
•	LPで答える内容を先出しする
•	強すぎる断定表現
•	情報量で押す
•	英語のpattern値を使用する（必ず日本語）
•	lpShouldAnswerを文字列で出力する（必ず配列）

⸻

※ 要約・改変・短縮禁止`;

/**
 * デフォルトエージェント定義を生成
 */
/**
 * デフォルトエージェント定義をIDで取得（アップグレード用）
 */
export function getSeedAgentDefinitionById(id: string): AgentDefinition | null {
  const defaults = getDefaultAgentDefinitions();
  return defaults.find((d) => d.id === id) || null;
}

export function getDefaultAgentDefinitions(): AgentDefinition[] {
  const now = new Date().toISOString();
  
  return [
    {
      id: 'lp-agent-default',
      name: 'LP構成案作成',
      description: '製品情報・ペルソナ・ナレッジを基に、LPの構成案を生成します',
      category: 'planning',
      systemPrompt: LP_AGENT_SYSTEM_PROMPT,
      // ユーザーの自由度を確保するため、最小限のテンプレートに変更
      userPromptTemplate: `{{context}}`,
      outputSchema: 'lp_structure',
      // フェーズ3: 追加フィールド
      outputKind: 'lp_structure',
      outputSchemaRef: 'LpStructurePayloadSchema',
      qualityChecklist: [
        '質問が最低16個ある',
        'セクションが6〜10個ある',
        '各セクションが質問に答える形で定義されている',
        'CVは最後のみ（途中にCVがない）',
        '情報量（small/medium/large）が明示されている',
      ],
      editable: true,
      createdAt: now,
      updatedAt: now,
      // フェーズ1: 成果物の見せ方の契約（UI向け契約として確定）
      outputViewContract: {
        version: '1',
        title: 'LP構成案',
        primaryKeyPath: 'finalOutput',
        badges: [
          { label: 'LP構成案', tone: 'indigo' },
        ],
        summary: {
          titlePath: 'finalOutput.core.oneLiner',
          subtitleTemplate: '対象: {{finalOutput.core.target.situation}} / セクション数: {{finalOutput.deliverables.lp.sections.length}}',
        },
        renderer: 'contract', // Step A: renderer分岐廃止
        primaryKeys: ['core', 'deliverables'],
        showQualityChecklist: true,
        derivedViews: ['executive_summary', 'actionables', 'risks', 'assumptions'],
        // 最重要コンテンツ領域（常時表示・アコーディオン禁止）
        // フェーズ3: Step 3-1 - 7ブロック構成で「企画本体が厚い」形に更新
        // フェーズ4: v2正規形に合わせてpathを更新
        mainContent: {
          title: 'LP構成案（企画本体）',
          blocks: [
            {
              id: 'conclusion',
              label: '結論（勝ち筋 / 何をどう伝えるLPか）',
              importance: 'critical',
              renderer: 'hero',
              path: '$.finalOutput.core.oneLiner',
            },
            {
              id: 'theme',
              label: 'テーマ（誰を、どんな状態から、どこへ動かすか）',
              importance: 'high',
              renderer: 'bullets',
              fields: [
                { label: '状況（現在地）', path: '$.finalOutput.core.target.situation' },
                { label: '欲求（目的地）', path: '$.finalOutput.core.target.desire' },
                { label: '不安（障害）', path: '$.finalOutput.core.target.anxiety' },
              ],
            },
            {
              id: 'hypothesis',
              label: '仮説 / 根拠（使ったナレッジ・差別化・不安の潰し方）',
              importance: 'high',
              renderer: 'analysisHighlights',
              path: '$.finalOutput.deliverables.lp.questionCoverage',
              fields: [
                { label: '質問カテゴリ', path: 'category' },
                { label: 'ユーザーの質問', path: 'question' },
                { label: 'LPで答えるセクション', path: 'answeredInSection' },
              ],
            },
            {
              id: 'section_design',
              label: 'セクション設計（各セクションの役割/答える質問/情報量/表現タイプ）',
              importance: 'critical',
              renderer: 'cards',
              cards: {
                itemsPath: '$.finalOutput.deliverables.lp.sections',
                titlePath: 'name',
                subtitlePath: 'role',
                fields: [
                  { label: '答える質問', path: 'answersQuestions' },
                  { label: '伝える要点', path: 'keyPoints' },
                  { label: '情報量', path: 'infoVolume' },
                  { label: '表現タイプ', path: 'expressionTypes' },
                  { label: '次の心理', path: 'nextMindset' },
                ],
              },
            },
            {
              id: 'copy_drafts',
              label: 'コピー素案（FV/CTA/見出し候補）',
              importance: 'high',
              renderer: 'copyBlocks',
              template: {
                type: 'markdown',
                value: '## ファーストビュー案\n- キャッチ方向性: {{$.finalOutput.deliverables.lp.sections[0].copyHint || $.finalOutput.deliverables.lp.sections[0].copy.headline || "未設定"}}\n\n## 主要セクションの見出し候補\n{{#each $.finalOutput.deliverables.lp.sections}}\n- **{{name}}**: {{copyHint || copy.headline || "未設定"}}\n{{/each}}\n\n## CTA方針\n- CTA文脈: {{$.finalOutput.core.cv.ctaHint || "未設定"}}\n- CTAの役割: {{$.finalOutput.core.cv.role || "未設定"}}',
              },
            },
            {
              id: 'layout_instructions',
              label: 'レイアウト指示（ファーストビュー構成、視線誘導、図解が必要な箇所）',
              importance: 'high',
              renderer: 'imagePrompts',
              fields: [
                { label: '図解/レイアウト指示', path: '$.finalOutput.deliverables.lp.layoutHints' },
                { label: 'FV構成', path: '$.finalOutput.deliverables.lp.sections[0].layoutHint' },
              ],
            },
            {
              id: 'production_notes',
              label: '制作チーム向け注意点（NG表現、要確認事項）',
              importance: 'medium',
              renderer: 'bullets',
              fields: [
                { label: 'NG表現', path: '$.finalOutput.ngExpressions' },
                { label: '要確認事項', path: '$.finalOutput.confirmationPoints' },
                { label: '前提条件', path: '$.finalOutput.assumptions' },
              ],
            },
          ],
        },
        sections: [
          {
            id: 'overview',
            label: 'サマリ',
            type: 'summary',
            summary: {
              items: [
                { label: '対象ユーザー', valuePath: 'finalOutput.core.target.situation' },
                { label: '主要な欲求', valuePath: 'finalOutput.core.target.desire' },
                { label: '主要な不安', valuePath: 'finalOutput.core.target.anxiety' },
                { label: 'セクション数', valueTemplate: '{{finalOutput.deliverables.lp.sections.length}}' },
              ],
            },
          },
          {
            id: 'questions',
            label: '質問カバレッジ（16問）',
            type: 'table',
            table: {
              rowsPath: 'finalOutput.deliverables.lp.questionCoverage',
              columns: [
                { key: 'category', label: 'カテゴリ', valuePath: 'category' },
                { key: 'question', label: '質問', valuePath: 'question' },
                { key: 'answeredInSection', label: '回答セクション', valuePath: 'answeredInSection' },
              ],
            },
            rules: [
              { kind: 'minLength', path: 'finalOutput.deliverables.lp.questionCoverage', min: 16, level: 'warning', message: '質問が16問未満です。構成の根拠が弱い可能性があります。' },
            ],
          },
          {
            id: 'sections',
            label: 'LPセクション構成',
            type: 'cards',
            cards: {
              itemsPath: 'finalOutput.deliverables.lp.sections',
              titlePath: 'name',
              subtitlePath: 'role',
              fields: [
                { label: '答える質問', valuePath: 'answersQuestions' },
                { label: '伝える要点', valuePath: 'keyPoints' },
                { label: '情報量', valuePath: 'infoVolume' },
                { label: '表現タイプ', valuePath: 'expressionTypes' },
                { label: '次の心理', valuePath: 'nextMindset' },
              ],
            },
            rules: [
              { kind: 'rangeLength', path: 'finalOutput.deliverables.lp.sections', min: 6, max: 10, level: 'warning', message: 'セクション数が推奨範囲(6〜10)外です。' },
            ],
          },
          {
            id: 'cv',
            label: '最終CV設計',
            type: 'summary',
            summary: {
              items: [
                { label: 'CVの役割', valuePath: 'finalOutput.core.cv.role' },
                { label: '答える質問', valuePath: 'finalOutput.core.cv.answers' },
                { label: '伝える要点', valuePath: 'finalOutput.core.cv.keyPoints' },
              ],
            },
          },
          {
            id: 'quality',
            label: '品質チェック',
            type: 'checklist',
            checklist: {
              itemsPath: 'finalOutput.qualityChecklist',
            },
          },
          {
            id: 'proof',
            label: '実行証明（詳細）',
            type: 'executionProof',
          },
          {
            id: 'raw',
            label: '生データ',
            type: 'raw',
            raw: {
              tabs: ['finalOutput', 'parsedOutput', 'llmRawOutput', 'validation'],
            },
          },
        ],
      },
      outputArtifactTitle: 'LP構成案',
      outputArtifactDescription: '製品情報・ペルソナ・ナレッジを基に生成されたLPの構成案です',
    },
    {
      id: 'banner-agent-default',
      name: 'バナー構成案作成',
      description: '製品情報・ペルソナ・ナレッジを基に、バナーの構成案を生成します',
      category: 'creative',
      systemPrompt: BANNER_AGENT_SYSTEM_PROMPT,
      // ユーザーの自由度を確保するため、最小限のテンプレートに変更
      userPromptTemplate: `{{context}}`,
      outputSchema: 'banner_structure',
      // フェーズ3: 追加フィールド
      outputKind: 'banner_structure',
      outputSchemaRef: 'BannerStructurePayloadSchema',
      qualityChecklist: [
        '1バナー＝1価値（複数価値を入れない）',
        'バナー案が複数パターン出ている',
        '遷移後LPで答える内容を先出ししていない',
        '強すぎる断定表現を避けている',
        '情報量は最小限',
      ],
      editable: true,
      createdAt: now,
      updatedAt: now,
      // フェーズ1: 成果物の見せ方の契約（確定版）
      outputViewContract: {
        version: '1',
        title: 'バナー構成案',
        primaryKeyPath: 'finalOutput',
        badges: [
          { label: 'バナー構成案', tone: 'orange' },
        ],
        summary: {
          titlePath: 'finalOutput.core.oneLiner',
          subtitleTemplate: '案数: {{finalOutput.deliverables.banner.bannerIdeas.length}}',
        },
        renderer: 'contract', // Step A: renderer分岐廃止
        primaryKeys: ['core', 'deliverables'],
        showQualityChecklist: true,
        derivedViews: ['executive_summary', 'actionables', 'risks', 'assumptions'],
        // フェーズ3: Step 3-2 - mainContentを「企画本体が厚い」形に強化（コピー/画像指示を強化）
        // フェーズ4: v2正規形に合わせてpathを更新
        mainContent: {
          title: 'バナー構成案（企画本体）',
          blocks: [
            {
              id: 'conclusion',
              label: '結論（勝ち筋 / 何をどう伝えるバナーか）',
              importance: 'critical',
              renderer: 'hero',
              path: '$.finalOutput.core.oneLiner',
            },
            {
              id: 'theme',
              label: 'テーマ（誰を、どんな状態から、どこへ動かすか）',
              importance: 'high',
              renderer: 'bullets',
              fields: [
                { label: '対象ユーザー状態', path: '$.finalOutput.core.target.situation' },
                { label: 'バナーの役割', path: '$.finalOutput.deliverables.banner.lpSplit.roleOfBanner' },
                { label: 'LPの役割', path: '$.finalOutput.deliverables.banner.lpSplit.roleOfLp' },
              ],
            },
            {
              id: 'banner_ideas',
              label: 'バナー案（複数パターン）',
              importance: 'critical',
              renderer: 'cards',
              cards: {
                itemsPath: '$.finalOutput.deliverables.banner.bannerIdeas',
                titlePath: 'title',
                subtitlePath: 'pattern',
                fields: [
                  { label: '狙うユーザー状態', path: 'targetState' },
                  { label: '約束する価値', path: 'singleValuePromise' },
                  { label: 'メインコピー方向性', path: 'mainCopyDirection' },
                  { label: 'サブ要素', path: 'subElements' },
                  { label: '遷移後LPで答えること', path: 'lpShouldAnswer' },
                ],
              },
            },
            {
              id: 'copy_drafts',
              label: 'コピー案（見出し案3つ / サブコピー案2つ）',
              importance: 'high',
              renderer: 'copyBlocks',
              template: {
                type: 'markdown',
                value: '## 見出し案\n{{#each $.finalOutput.deliverables.banner.bannerIdeas}}\n### {{pattern}}\n- **メインコピー**: {{mainCopyDirection || "未設定"}}\n- **サブコピー**: {{subElements || "未設定"}}\n{{/each}}\n\n## コピー方針\n- バナーの役割: {{$.finalOutput.deliverables.banner.lpSplit.roleOfBanner || "未設定"}}\n- LPで答えること: {{$.finalOutput.deliverables.banner.bannerIdeas[0].lpShouldAnswer || "未設定"}}',
              },
            },
            {
              id: 'layout_instructions',
              label: 'レイアウト指示（要素配置の優先度）',
              importance: 'high',
              renderer: 'bullets',
              fields: [
                { label: '要素配置の優先度', path: '$.finalOutput.layoutPriority' },
                { label: '視線誘導', path: '$.finalOutput.visualFlow' },
              ],
            },
            {
              id: 'image_prompts',
              label: '画像生成プロンプト（style / scene / constraints）',
              importance: 'high',
              renderer: 'imagePrompts',
              fields: [
                { label: 'スタイル', path: '$.finalOutput.imageStyle' },
                { label: 'シーン', path: '$.finalOutput.imageScene' },
                { label: '制約', path: '$.finalOutput.imageConstraints' },
                { label: '色/トンマナ', path: '$.finalOutput.colorTone' },
              ],
            },
            {
              id: 'production_notes',
              label: '制作チーム向け注意点（NG表現、要確認事項）',
              importance: 'medium',
              renderer: 'bullets',
              fields: [
                { label: 'NG表現', path: '$.finalOutput.ngExpressions' },
                { label: '要確認事項', path: '$.finalOutput.confirmationPoints' },
                { label: '前提条件', path: '$.finalOutput.assumptions' },
              ],
            },
          ],
        },
        sections: [
          {
            id: 'lpSplit',
            label: 'バナーとLPの役割分担',
            type: 'summary',
            summary: {
              items: [
                { label: 'バナーの役割', valuePath: 'finalOutput.deliverables.banner.lpSplit.roleOfBanner' },
                { label: 'LPの役割', valuePath: 'finalOutput.deliverables.banner.lpSplit.roleOfLp' },
              ],
            },
          },
          {
            id: 'banners',
            label: 'バナー案（複数）',
            type: 'cards',
            cards: {
              itemsPath: 'finalOutput.deliverables.banner.bannerIdeas',
              titlePath: 'title',
              subtitlePath: 'pattern',
              fields: [
                { label: '狙うユーザー状態', valuePath: 'targetState' },
                { label: '約束する価値', valuePath: 'singleValuePromise' },
                { label: 'メインコピー方向性', valuePath: 'mainCopyDirection' },
                { label: 'サブ要素', valuePath: 'subElements' },
                { label: '遷移後LPで答えること', valuePath: 'lpShouldAnswer' },
              ],
            },
            rules: [
              { kind: 'minLength', path: 'finalOutput.deliverables.banner.bannerIdeas', min: 3, level: 'warning', message: 'バナー案が3つ未満です（共感/ベネフィット/安心の3系統が推奨）。' },
            ],
          },
          {
            id: 'designNotes',
            label: 'デザイン引き渡しメモ',
            type: 'summary',
            summary: {
              items: [
                { label: 'デザイン指示', valuePath: 'finalOutput.deliverables.banner.designNotes' },
              ],
            },
          },
          {
            id: 'quality',
            label: '品質チェック',
            type: 'checklist',
            checklist: {
              itemsPath: 'finalOutput.qualityChecklist',
            },
          },
          {
            id: 'proof',
            label: '実行証明（詳細）',
            type: 'executionProof',
          },
          {
            id: 'raw',
            label: '生データ',
            type: 'raw',
            raw: {
              tabs: ['finalOutput', 'parsedOutput', 'llmRawOutput', 'validation'],
            },
          },
        ],
      },
      outputArtifactTitle: 'バナー構成案',
      outputArtifactDescription: '製品情報・ペルソナ・ナレッジを基に生成されたバナーの構成案です',
    },
    {
      id: 'orchestrator-agent-default',
      name: 'LP→バナー派生',
      description: 'LP構成案を参照して、バナー構成案を自動生成します',
      category: 'planning',
      systemPrompt: `③ LP→バナー派生エージェント｜指示文【完全版】

⸻

あなたの役割（Role）

あなたは LP構成案を参照し、それに基づいてバナー構成案を生成する設計者である。

⸻

成果定義（Definition of Done）

1. LP構成案の各セクションから「バナーで約束すべき価値」を抽出
2. 1バナー＝1価値の原則を守る
3. バナー案が複数パターン出ている
4. derivedFrom.lpRunIdが正しく設定されている

⸻

基本思想

• バナーはLPの「入口」として機能する
• LPで答える内容を先出ししない
• バナーは「約束だけ」する
• 情報量は最小限

⸻

作業プロセス

STEP 1：LP構成案を分析
• 各セクションが答える質問を確認
• セクションの順番（ユーザーの心理変化）を理解
• ファーストビューで約束されている価値を特定

STEP 2：バナー案を生成
• LPのファーストビューで約束されている価値を起点に
• 複数の訴求パターンでバナー案を作成
• 各バナー案は1つの価値に絞る

⸻

出力フォーマット（固定）

以下の形式で必ずバナー構成案を出力すること。

⸻

【バナー構成案】

バナー案①：共感訴求型
• 狙うユーザー状態：
• 約束する価値：
• メインコピー方向性：
• サブ要素：
• 遷移後LPで答えること：

⸻

（以下、複数パターン続ける）

⸻

禁止事項
• 1バナーに複数価値を入れる
• LPで答える内容を先出しする
• 強すぎる断定表現
• 情報量で押す

⸻

※ 要約・改変・短縮禁止`,
      userPromptTemplate: `以下のLP構成案を参照し、指示文に従って
必ず【バナー構成案】として出力してください。

【参照LP構成案】
{{lp_structure}}

【補足メモ】
{{notes}}`,
      outputSchema: 'banner_structure',
      // フェーズ3: 追加フィールド
      outputKind: 'banner_structure',
      outputSchemaRef: 'BannerStructurePayloadSchema',
      qualityChecklist: [
        '1バナー＝1価値（複数価値を入れない）',
        'バナー案が複数パターン出ている',
        '遷移後LPで答える内容を先出ししていない',
        '強すぎる断定表現を避けている',
        'derivedFrom.lpRunIdが設定されている',
      ],
      editable: true,
      createdAt: now,
      updatedAt: now,
      // Step1-2: 固定フォーマット廃止 - defaultBannerStructureViewContractは削除、defaultGenericJsonViewContractを使用
      // ユーザーがoutputViewContractを持っていない場合のみ使用（フォールバック）
      outputViewContract: defaultGenericJsonViewContract,
      outputArtifactTitle: 'バナー構成案（LP派生）',
      outputArtifactDescription: 'LP構成案を参照して生成されたバナーの構成案です',
    },
    {
      id: 'presenter-agent-default',
      name: 'Presentation生成（自動）',
      description: 'finalOutputからマーケターが読みやすいpresentation（ViewModel）を自動生成します',
      category: 'analysis',
      systemPrompt: `あなたはPresentation生成エージェントです。finalOutput（JSON）を読み取り、マーケターがそのまま企画に使える表示構造（presentation）を生成してください。

【役割】
- finalOutputのJSONをそのまま表示せず、適切な粒度でカード/箇条書き/タイムラインなどに構造化する
- マーケターが読みやすく、企画に直接使える形式にする
- 情報の優先度と粒度をAIが判断して最適化する

【出力形式】
必ず以下のJSON形式で出力してください：

{
  "presentation": {
    "title": "成果物タイトル（1行）",
    "blocks": [
      {
        "id": "block-1",
        "type": "hero",
        "label": "ブロックラベル",
        "content": "文字列またはオブジェクト"
      },
      {
        "id": "block-2",
        "type": "bullets",
        "label": "ブロックラベル",
        "items": ["項目1", "項目2"]
      },
      {
        "id": "block-3",
        "type": "cards",
        "label": "ブロックラベル",
        "cards": [
          {
            "title": "カードタイトル",
            "content": "カード内容（文字列またはオブジェクト）"
          }
        ]
      }
      // 必要に応じて他のblock type（table, timeline, copyBlocks, imagePrompts, markdown）も使用
    ]
  }
}

【block type一覧】
- hero: 重要な1つのメッセージ（文字列またはオブジェクト）
- bullets: 箇条書きリスト（文字列配列または{label, content}配列）
- cards: カード形式（配列データをカード化）
- table: 表形式（headers配列とrows配列）
- timeline: 時系列イベント（events配列）
- copyBlocks: コピー案ブロック（blocks配列）
- imagePrompts: 画像生成プロンプト（prompts配列）
- markdown: Markdown形式のテキスト（content文字列）

【重要】
- presentationフィールドのみを出力してください（finalOutputは含めない）
- JSONをそのまま表示せず、必ず構造化してください
- マーケターが読みやすい粒度と順序で配置してください`,
      userPromptTemplate: `以下のfinalOutputから、presentationを生成してください。

【finalOutput】
{{finalOutput}}

【指示】
- finalOutputの内容を分析し、マーケターが読みやすい表示構造に変換してください
- JSONをそのまま表示せず、適切な粒度でカード/箇条書き/タイムラインなどに構造化してください
- 情報の優先度を判断し、重要な情報を先に配置してください`,
      outputSchema: 'lp_structure', // 仮（presentation専用スキーマは後で追加可能）
      outputKind: 'lp_structure',
      outputSchemaRef: undefined,
      qualityChecklist: [
        'presentation.titleが設定されている',
        'presentation.blocksが1つ以上ある',
        'JSONをそのまま表示していない',
        'マーケターが読みやすい粒度になっている',
      ],
      editable: true,
      createdAt: now,
      updatedAt: now,
      outputViewContract: defaultGenericJsonViewContract,
      outputArtifactTitle: 'Presentation（自動生成）',
      outputArtifactDescription: 'finalOutputから自動生成された表示構造です',
    },
  ];
}
