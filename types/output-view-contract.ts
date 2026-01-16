/**
 * フェーズ1: 成果物の見せ方 - outputViewContract
 * AgentDefinitionに持たせる「出力の見せ方の契約」（UI向け契約として確定）
 */

/**
 * バッジ定義
 */
export interface OutputViewBadge {
  label: string;
  tone: 'indigo' | 'orange' | 'green' | 'red' | 'blue' | 'gray';
}

/**
 * サマリ定義
 * 【重要】Step3-2: summary.policyでユーザーが制御可能にする
 * - policy: "strict"（短文のみ）| "allowRich"（配列/長文OK、UI側で折り畳みやチップ化）
 * - デフォルトは "allowRich"（ユーザーの意図に合わせる）
 */
export interface OutputViewSummary {
  titlePath?: string; // タイトルを取得するパス（例: "finalOutput.title"）
  subtitleTemplate?: string; // サブタイトルテンプレート（例: "対象: {{finalOutput.targetUser.state}} / セクション数: {{finalOutput.sections.length}}"）
  policy?: 'strict' | 'allowRich'; // Step3-2: summaryの表示ポリシー（デフォルト: 'allowRich'）
  items?: Array<{
    label: string;
    path?: string; // 要約用：title/subtitle/chips程度のみ（policy='strict'の場合は配列/objectはmainContentで表示）
    valuePath?: string; // 後方互換のため残す（pathがあればpathを優先）
  }>;
}

/**
 * テーブル定義
 */
export interface OutputViewTable {
  rowsPath: string; // 行データのパス
  columns: Array<{
    key: string;
    label: string;
    valuePath?: string; // 値のパス（省略時はkeyを使用）
  }>;
}

/**
 * カード定義
 */
export interface OutputViewCards {
  itemsPath: string; // カードアイテムのパス
  titlePath?: string; // タイトルを取得するパス
  subtitlePath?: string; // サブタイトルを取得するパス
  fields?: Array<{
    label: string;
    valuePath: string; // 値のパス
  }>;
}

/**
 * チェックリスト定義
 */
export interface OutputViewChecklist {
  itemsPath?: string; // チェックリストアイテムのパス（省略時はagentDefinition.qualityChecklistを使用）
}

/**
 * Raw定義
 */
export interface OutputViewRaw {
  tabs?: string[]; // タブ名（例: ["finalOutput", "parsedOutput", "llmRawOutput", "validation"]）
}

/**
 * バリデーションルール
 */
export interface OutputViewRule {
  kind: 'minLength' | 'maxLength' | 'rangeLength' | 'required';
  path: string; // 対象データのパス
  min?: number;
  max?: number;
  level: 'warning' | 'error';
  message: string;
}

/**
 * セクション定義（UIで強調して見せたいセクション）
 */
export interface OutputViewSection {
  id: string;
  label: string; // UI表示用ラベル
  type: 'summary' | 'cards' | 'table' | 'checklist' | 'raw' | 'executionProof';
  // sectionが参照するJSON path（例: "finalOutput.sections"）
  path?: string;
  // タイプ別の詳細定義
  summary?: OutputViewSummary;
  table?: OutputViewTable;
  cards?: OutputViewCards;
  checklist?: OutputViewChecklist;
  raw?: OutputViewRaw;
  // バリデーションルール
  rules?: OutputViewRule[];
}

/**
 * MainContentBlock定義（最重要コンテンツ領域のブロック）
 */
export interface MainContentBlock {
  id: string;
  label: string; // UI表示用ラベル
  importance: 'critical' | 'high' | 'medium' | 'low'; // 重要度
  renderer: 'hero' | 'bullets' | 'cards' | 'table' | 'copyBlocks' | 'imagePrompts' | 'analysisHighlights' | 'markdown' | 'mermaid';
  path?: string; // データのパス（例: "$.finalOutput.execSummary"）
  // renderer別の詳細定義
  fields?: Array<{
    label: string;
    path: string; // 値のパス
  }>;
  table?: OutputViewTable; // table renderer用
  cards?: OutputViewCards; // cards renderer用
  template?: {
    type: 'markdown';
    value: string; // テンプレート文字列（{{$.path}}形式で変数展開）
  }; // copyBlocks renderer用
}

/**
 * MainContentContract定義（最重要コンテンツ領域）
 */
export interface MainContentContract {
  title: string; // メインコンテンツのタイトル（例: "LP構成案（企画本体）"）
  blocks: MainContentBlock[]; // ブロックの順序定義
}

/**
 * 成果物の見せ方の契約（OutputViewContract）
 * UI向け契約として確定
 * 
 * 【重要】このcontractが唯一の真実（Single Source of Truth）です。
 * システム側の固定UI指定・固定分岐は一切使用しません。
 */
export interface OutputViewContract {
  version: string; // contractのバージョン（例: '1', 'user-1', 'system-1'）
  meta?: {
    version: string; // 詳細バージョン（例: 'user-1.0.0'）
    managedBy: 'user' | 'system'; // ユーザー管理かシステム管理か
    createdAt?: string; // 作成日時
    updatedAt?: string; // 更新日時
  };
  title: string; // 成果物タイトル（例: "LP構成案"）
  primaryKeyPath?: string; // 主要データのパス（例: "finalOutput"）
  badges?: OutputViewBadge[]; // バッジ表示
  summary?: OutputViewSummary; // サマリ表示
  // 【廃止】Step1-1: renderer分岐は完全に廃止。UIはmainContent.blocksとsectionsの宣言だけで描画する
  // 後方互換のため残すが、値は 'contract' または 'generic_json' のみ（'lp_structure' | 'banner_structure'は削除）
  renderer?: 'contract' | 'generic_json'; // Step1-1: 固定フォーマット廃止、汎用レンダラのみ
  // 主要フィールド（カード化/サマリ化に使う）
  primaryKeys?: string[];
  // 最重要コンテンツ領域（常時表示・アコーディオン禁止）
  mainContent?: MainContentContract;
  // UIで強調して見せたいセクション定義（補助情報として下部に配置）
  sections?: OutputViewSection[];
  // 品質チェックの表示（既存 qualityChecklist をUIで使う）
  showQualityChecklist?: boolean;
  // "価値を上げる"自動生成表示（LLMは呼ばない、既存出力から作る）
  derivedViews?: Array<'executive_summary' | 'actionables' | 'risks' | 'assumptions'>;
}

/**
 * デフォルトoutputViewContract（LP構成案）
 * 【重要】Step C: 最小フォールバックへ弱体化
 * - defaultにはexecutionProofすら入れない
 * - contractが欠損/壊れている時だけdefaultGenericJsonViewContractを使う
 * - このcontractは使用禁止（エージェント定義ごとにoutputViewContractを定義してください）
 */
export const defaultLpStructureViewContract: OutputViewContract = {
  version: '1',
  renderer: 'contract', // renderer分岐廃止: blocks/sectionsだけで描画
  title: 'LP構成案',
  primaryKeys: [],
  // Step3: mainContentを必ず追加（企画本体ビュー）
  // Step E: LP構成案（v2）に合わせてcontractを最適化
  // v2推奨形: core.oneLiner / core.target / logic.hypotheses[] / logic.evidence[] / deliverables.sections[] / deliverables.copyBlocks[] / visual.diagramMermaid / nextActions[]
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
        id: 'target',
        label: 'ターゲット（誰を、どんな状態から、どこへ動かすか）',
        importance: 'high',
        renderer: 'bullets',
        fields: [
          { label: 'コア', path: '$.finalOutput.core.target.core' },
          { label: '状況', path: '$.finalOutput.core.target.situation' },
          { label: '欲求', path: '$.finalOutput.core.target.desire' },
          { label: '不安', path: '$.finalOutput.core.target.anxiety' },
        ],
      },
      {
        id: 'hypotheses',
        label: '仮説（使ったナレッジ・差別化・不安の潰し方）',
        importance: 'high',
        renderer: 'analysisHighlights',
        path: '$.finalOutput.logic.hypothesis',
        fields: [
          { label: '仮説', path: '$.finalOutput.logic.hypothesis' },
          { label: '根拠', path: '$.finalOutput.logic.evidence' },
        ],
      },
      {
        id: 'evidence',
        label: '根拠（input由来を含める）',
        importance: 'high',
        renderer: 'bullets',
        path: '$.finalOutput.logic.evidence',
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
        id: 'copy_blocks',
        label: 'コピペ素材（FV/CTA/見出し候補）',
        importance: 'high',
        renderer: 'copyBlocks',
        template: {
          type: 'markdown',
          value: '## ファーストビュー案\n- キャッチ方向性: {{$.finalOutput.deliverables.lp.sections[0].copyHint || $.finalOutput.deliverables.lp.sections[0].copy.headline || "未設定"}}\n\n## 主要セクションの見出し候補\n{{#each $.finalOutput.deliverables.lp.sections}}\n- **{{name}}**: {{copyHint || copy.headline || "未設定"}}\n{{/each}}\n\n## CTA方針\n- CTA文脈: {{$.finalOutput.core.cv.ctaHint || "未設定"}}\n- CTAの役割: {{$.finalOutput.core.cv.role || "未設定"}}',
        },
      },
      {
        id: 'visual_diagram',
        label: '図解（フロー・構造）',
        importance: 'medium',
        renderer: 'mermaid',
        path: '$.finalOutput.visual.diagramMermaid',
      },
      {
        id: 'visual_hints',
        label: 'レイアウト指示（ファーストビュー構成、視線誘導）',
        importance: 'medium',
        renderer: 'imagePrompts',
        fields: [
          { label: '図解/レイアウト指示', path: '$.finalOutput.deliverables.lp.layoutHints' },
          { label: 'FV構成', path: '$.finalOutput.deliverables.lp.sections[0].layoutHint' },
        ],
      },
      {
        id: 'next_actions',
        label: '次アクション（制作チーム向け）',
        importance: 'medium',
        renderer: 'bullets',
        path: '$.finalOutput.nextActions',
      },
    ],
  },
  // summaryは最小限（短く読む用）
  // フェーズ4: v2正規形に合わせてpathを更新
  summary: {
    titlePath: 'finalOutput.core.oneLiner',
    subtitleTemplate: 'セクション数: {{finalOutput.deliverables.lp.sections.length}}',
    items: [
      { label: 'セクション数', path: 'finalOutput.deliverables.lp.sections.length' },
    ],
  },
  sections: [
    // 【重要】defaultにはexecutionProofすら入れない
    // contractが欠損/壊れている時だけdefaultGenericJsonViewContractを使う
  ],
  showQualityChecklist: false,
  derivedViews: [],
};

/**
 * デフォルトoutputViewContract（バナー構成案）
 * 【廃止】Step1-2: 固定フォーマット廃止のため、このcontractは削除またはdefaultGenericJsonViewContractに統合
 * - ユーザーがoutputViewContractを持っていない場合のみdefaultGenericJsonViewContractを使用
 * - 固定のLP/バナー整形はしない
 * 
 * @deprecated Step1-2: 固定フォーマット廃止により、このcontractは使用禁止。defaultGenericJsonViewContractを使用してください。
 */
export const defaultBannerStructureViewContract: OutputViewContract = {
  version: '1',
  renderer: 'contract', // renderer分岐廃止: blocks/sectionsだけで描画
  title: 'バナー構成案',
  primaryKeys: [],
  // mainContentは未定義（エージェント定義ごとに必須）
  // summaryも最小限（エージェント定義ごとに定義）
  summary: {
    titlePath: 'execSummary',
    items: [],
  },
  sections: [
    // 【重要】defaultにはexecutionProofすら入れない
    // contractが欠損/壊れている時だけdefaultGenericJsonViewContractを使う
  ],
  showQualityChecklist: false,
  derivedViews: [],
};

/**
 * デフォルトoutputViewContract（Generic JSON）
 */
export const defaultGenericJsonViewContract: OutputViewContract = {
  version: '1',
  renderer: 'generic_json',
  primaryKeys: [],
  sections: [
    {
      id: 'raw',
      label: 'デバッグ用JSON', // Step5: JSON Viewer → デバッグ用JSONに変更
      type: 'raw',
      raw: {
        tabs: ['finalOutput'],
      },
    },
    {
      id: 'executionProof',
      label: '実行証明（詳細）',
      type: 'executionProof',
      raw: {
        tabs: ['proof', 'qualityCheck', 'finalOutput', 'parsedOutput', 'llmRawOutput', 'validation'],
      },
    },
  ],
  showQualityChecklist: false,
};
