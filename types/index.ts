// 発言データ（テキスト前処理用）
export interface Statement {
  id: string; // 発言ID（例: "stmt-001"）
  text: string; // 発言テキスト
  source: string; // 入力ソース（例: "interview_001.txt"）
  timestamp: string; // 入力日時
  metadata?: {
    interviewName?: string; // インタビュー名
    interviewDate?: string; // 実施日（YYYY-MM-DD）
    segment?: string; // 対象セグメント
    owner?: string; // 担当者
    lineNumber?: number; // 行番号（ファイル取り込み時）
    line_range?: { start: number; end: number }; // 行範囲（start行からend行まで）
    respondent_id?: string; // 回答者ID（識別できた場合）
  };
}

// Quote（原文引用）
export interface Quote {
  id: string; // Quote ID（例: "quote-001"）
  text: string; // 原文抜粋（quoteText）
  source_file: string; // 出典ファイル（Statement.sourceに対応）
  line_number?: number; // 行番号（可能な場合、Statement.metadata?.lineNumber）
  line_range?: { start: number; end: number }; // 行範囲（start行からend行まで）
  category: string; // 引用のカテゴリ（フィールド名: "trigger", "barrier", "role"等）
  statement_id: string; // 元のStatement ID
  linked_fields?: string[]; // このquoteが紐付いているフィールド名の配列（例: ["role", "trigger"]）
}

// ExtractionRecord（Extraction JSON + メタデータ）
export interface ExtractionRecord {
  respondent_id: string; // 匿名ID
  role: string | null; // 柔軟に生成可能（例: "代理購入者", "本人購入者", "不明", "恋人", "同棲パートナー"など）
  relationship: string | null; // 柔軟に生成可能（例: "配偶者", "親", "子", "その他", "恋人", "同棲パートナー"など）
  household: {
    composition?: string;
    age_range?: string;
    occupation?: string;
  } | null;
  purchase_context: {
    timing?: string;
    channel?: string;
    type?: '定期' | 'まとめ買い' | '単発' | null;
  } | null;
  trigger: string[];
  job_to_be_done: {
    functional?: string[];
    emotional?: string[];
    social?: string[];
  } | null;
  barriers: string[];
  decision_criteria: {
    price?: number;
    trust?: number;
    effort?: number;
    effectiveness?: number;
  } | null;
  information_sources: string[];
  behavior_patterns: {
    who?: string;
    when?: string;
    what?: string;
  } | null;
  quotes: Quote[];
  
  // 各フィールドに対応するquotes（UI表示用）
  field_quotes: {
    role?: Quote[];
    relationship?: Quote[];
    household?: Quote[];
    purchase_context?: Quote[];
    trigger?: Quote[];
    job_to_be_done?: {
      functional?: Quote[];
      emotional?: Quote[];
      social?: Quote[];
    };
    barriers?: Quote[];
    decision_criteria?: {
      price?: Quote[];
      trust?: Quote[];
      effort?: Quote[];
      effectiveness?: Quote[];
    };
    information_sources?: Quote[];
    behavior_patterns?: Quote[];
  };
  
  confidence: number; // 0〜1：抽出根拠の明確さ（自動算出、ユーザー調整可能）
  confidence_breakdown: {
    quote_count_score: number; // 根拠件数ベース（0-0.4）
    field_completeness_score: number; // フィールド充足率ベース（0-0.3）
    quote_clarity_score: number; // 引用の明確性ベース（0-0.3）
  };
  
  // メタデータ
  created_at: string;
  updated_at: string;
  created_by: 'system' | 'user';
  updated_by: 'system' | 'user';
  
  // ゲート化用
  finalized: boolean; // 確定済みかどうか（確定後は編集不可、Aggregation生成の入力として使用可能）
  finalized_at?: string; // 確定日時
}

// 根拠データ（Evidence）- 後方互換のため残す
export interface Evidence {
  statementId: string;
  source: string;
  quoteText: string;
  span?: { start: number; end: number };
}

// 要約項目
export interface SummaryItem {
  text: string; // 要約テキスト（発言から抽出、推測なし）
  evidenceIds: string[]; // 根拠となった発言IDのリスト（互換のため残す）
  evidences?: Evidence[]; // 根拠の抜粋（UIでの参照・ハイライト用）
  tags: string[]; // 関連タグ
}

// ペルソナ要約データ
export interface PersonaSummary {
  personaId: string; // ペルソナID（例: "A"）
  summary: {
    challenges: SummaryItem[]; // 課題
    emotions: SummaryItem[]; // 感情
    decisionTriggers: SummaryItem[]; // 意思決定トリガー
    ngExpressions: SummaryItem[]; // NG表現
    other?: SummaryItem[]; // その他の観点
  };
  statementCount: number; // 該当発言数
}

// B. Aggregation（集計・パターン化）
export interface Aggregation {
  clusters: Array<{
    id: string; // クラスタID
    name: string; // クラスタ名（例: "代理購入者_価格重視型"）
    respondent_ids: string[]; // 該当するrespondent_idのリスト
    prevalence: number; // 出現率（0-1）
    patterns: {
      triggers: string[]; // 代表的トリガー
      decision_criteria: {
        [key: string]: number; // 判断基準と重み
      };
      barriers: string[]; // 代表的障壁
    };
    representative_quotes: Array<{
      quote: string; // 代表引用（quotesからのみ）
      respondent_id: string; // 出典
      category: string; // カテゴリ
      quote_id: string; // Quote ID
    }>; // 3〜7件
  }>; // 2〜5クラスタ
  total_respondents: number; // 総回答者数
  metadata: {
    generated_at: string; // 生成日時
    extraction_count: number; // 入力Extraction数
  };
}

// C. Persona（UI表示用アウトプット）
export interface Persona {
  id: string; // ペルソナID（クラスタIDと対応）
  cluster_id: string; // 対応するAggregationクラスタID
  one_line_summary: string; // 1行要約（この人は何者か）
  background_story: string; // 背景ストーリー（短文）
  proxy_purchase_structure: {
    whose_problem: string; // 誰の課題か
    who_solves: string; // 誰が解決するか
    how: string; // どう解決しているか
  };
  job_to_be_done: {
    functional: string[]; // 機能面のJTBD
    emotional: string[]; // 感情面のJTBD
    social: string[]; // 社会面のJTBD
  };
  decision_criteria_top5: Array<{
    criterion: string; // 判断基準名
    weight: number; // 重み（0-1、Bから算出）
  }>; // TOP5
  typical_journey: {
    trigger: string; // きっかけ
    consideration: string; // 検討
    purchase: string; // 購入
    retention: string; // 継続
  };
  common_misconceptions: string[]; // 誤解しやすいポイント（社内向け注意）
  effective_strategies: {
    messages?: string[]; // メッセージ案
    touchpoints?: string[]; // 導線案
    offers?: string[]; // オファー案
  };
  evidence: {
    quotes: Array<{
      text: string; // 引用テキスト
      respondent_id: string; // 出典
      category: string; // カテゴリ
    }>;
    count: number; // このペルソナを支える引用件数
  };
}

// ペルソナ軸（Persona生成の方向性を定義）
export interface PersonaAxis {
  id: string; // 軸ID
  name: string; // 軸名（例: "自身購入で悩みが深い人"）
  description?: string; // 軸の説明（任意）
  order: number; // 表示順序
}

// ペルソナ比較データ（新しいPersona型に対応）
export interface PersonaComparison {
  personas: string[]; // 比較対象のペルソナIDリスト
  comparison: {
    one_line_summary: {
      [personaId: string]: string;
    };
    background_story: {
      [personaId: string]: string;
    };
    proxy_purchase_structure: {
      [personaId: string]: {
        whose_problem: string;
        who_solves: string;
        how: string;
      };
    };
    job_to_be_done: {
      [personaId: string]: {
        functional: string[];
        emotional: string[];
        social: string[];
      };
    };
    decision_criteria_top5: {
      [personaId: string]: Array<{
        criterion: string;
        weight: number;
      }>;
    };
    typical_journey: {
      [personaId: string]: {
        trigger: string;
        consideration: string;
        purchase: string;
        retention: string;
      };
    };
    common_misconceptions: {
      [personaId: string]: string[];
    };
    effective_strategies: {
      [personaId: string]: {
        messages?: string[];
        touchpoints?: string[];
        offers?: string[];
      };
    };
  };
  commonPoints: string[]; // 共通点（事実のみ）
  differences: string[]; // 相違点（事実のみ）
  detailedAnalysis?: {
    // 各フィールドごとの詳細な比較分析
    one_line_summary?: {
      commonPoints: string[];
      differences: string[];
    };
    background_story?: {
      commonPoints: string[];
      differences: string[];
    };
    proxy_purchase_structure?: {
      commonPoints: string[];
      differences: string[];
    };
    job_to_be_done?: {
      commonPoints: string[];
      differences: string[];
    };
    decision_criteria_top5?: {
      commonPoints: string[];
      differences: string[];
    };
    typical_journey?: {
      commonPoints: string[];
      differences: string[];
    };
    common_misconceptions?: {
      commonPoints: string[];
      differences: string[];
    };
    effective_strategies?: {
      commonPoints: string[];
      differences: string[];
    };
  };
}

// 入力ソース
export interface InputSource {
  id: string;
  type: 'interview' | 'comment' | 'persona'; // インタビュー記録 / 定性コメント / 既存ペルソナ
  text: string;
  metadata?: {
    interviewName?: string;
    interviewDate?: string;
    segment?: string;
    owner?: string;
  };
  createdAt: string;
}

// タグデータ
export interface Tag {
  id: string;
  name: string;
  category: string; // タグカテゴリ（例: "要約項目"）
  isCustom: boolean; // カスタムタグかどうか
  color?: string; // 表示色（UI用）
}

// 保存済みペルソナ（ナレッジベース用、他アプリ連携のためスキーマ固定）
export interface SavedPersona {
  persona_id: string; // UUID
  title: string; // 表示名（例: "KB-Persona-001_価格重視型代理購入者"）
  hypothesis_label: string; // 固定文言: "仮説ペルソナ"
  summary: string; // 1行要約
  story: string; // 背景ストーリー短文
  proxy_structure: {
    whose_problem: string; // 誰の課題
    who_solves: string; // 誰が解決
    how: string; // どう解決
  };
  jtbd: {
    functional: string[];
    emotional: string[];
    social: string[];
  };
  decision_criteria_top5: Array<{
    criterion: string;
    weight: number;
  }>;
  journey: {
    trigger: string;
    consider: string;
    purchase: string;
    continue: string;
  };
  pitfalls: string[]; // 誤解しやすいポイント
  tactics: {
    message?: string[];
    route?: string[];
    offer?: string[];
  };
  evidence: {
    quotes: Array<{
      text: string;
      respondent_id: string;
      category: string;
    }>;
    count: number;
  };
  evidence_quotes: Array<{
    text: string;
    source_file: string;
    line_number?: number;
    line_range?: { start: number; end: number };
    statement_id?: string;
    category: string;
  }>;
  created_at: string;
  updated_at: string;
  source_project_id?: string; // どの分析プロジェクトから生成されたか
  owner?: string; // オーナー（ユーザー名）
  shared?: boolean; // 共有状態
}

// 保存済み比較（ナレッジベース用）
export interface SavedComparison {
  comparison_id: string; // UUID
  title: string; // 表示名（例: "KB-Comparison-001_価格重視型vs効果重視型"）
  hypothesis_label: string; // 固定文言: "仮説比較"
  personas: string[]; // 比較対象のペルソナIDリスト
  comparison_data: PersonaComparison; // 完全な比較データ
  created_at: string;
  updated_at: string;
  source_project_id?: string;
  owner?: string;
  shared?: boolean;
}

// ナレッジベースアイテム（一覧表示用）
export interface KnowledgeBaseItem {
  id: string; // SavedPersona.persona_id または SavedComparison.comparison_id
  title: string;
  owner: string;
  shared: boolean;
  updated_at: string;
  folder: string; // フォルダパス（例: "My Files/ペルソナ" または "My Files/比較"）
  type: 'persona' | 'comparison'; // アイテムの種類
  persona?: SavedPersona; // ペルソナデータ（type='persona'の場合）
  comparison?: SavedComparison; // 比較データ（type='comparison'の場合）
}

// プロジェクトデータ（全体）
export interface Project {
  id: string; // プロジェクトID
  name: string; // プロジェクト名
  statements: Statement[]; // 発言リスト（テキスト前処理済み）
  extraction_records: ExtractionRecord[]; // ExtractionRecordの配列（Step2.5で確認・修正済み）
  tags: Tag[]; // タグリスト（後方互換のため残す）
  personaSummaries: PersonaSummary[]; // ペルソナ要約リスト（後方互換のため残す）
  comparison: PersonaComparison | null; // 比較データ
  createdAt: string; // 作成日時
  updatedAt: string; // 更新日時
}
