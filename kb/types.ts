/**
 * 統合ナレッジベース（KB）型定義
 * ペルソナアプリ/バナー分析アプリ共通
 */

import { Extraction, Aggregation, MarketInsight, StrategyOption, LPRough, Persona, BBox } from '@/types/schema';

/**
 * KB種別
 */
export type KBType = 'persona' | 'banner' | 'insight' | 'report' | 'option' | 'plan' | 'banner_layout' | 'agent_definition' | 'workflow' | 'workflow_run' | 'lp_structure' | 'banner_structure';

/**
 * BBox座標系（normalized/pixelを必須にして混在を防ぐ）
 */
export interface BBoxCoord {
  x: number;
  y: number;
  w: number;
  h: number;
  coord_type: 'normalized' | 'pixel'; // 座標系を明示
}

/**
 * KB基本メタデータ（一覧表示用）
 */
export interface KBBaseMeta {
  kb_id: string; // UUID
  type: KBType;
  title: string; // 表示名（例: "KB-Banner-001_価格訴求バナー"）
  folder_path: string; // フォルダ階層（例: "My Files/Banners"）
  tags: string[]; // タグ（検索対象）
  owner_id: string; // オーナーID（デフォルト: 'user'）
  visibility: 'private' | 'shared'; // 共有状態
  source_app?: string; // 元アプリ（例: "banner-analyzer", "persona-app"）
  source_project_id?: string; // 元のプロジェクトID
  source_refs?: string[]; // 参照元（例: ["banner-001", "insight-002"]）
  created_at: string; // ISO 8601形式
  updated_at: string; // ISO 8601形式
  deleted_at?: string; // 論理削除用（ISO 8601形式）
}

/**
 * KBアイテム（メタ + ペイロード）
 */
export interface KBItem extends KBBaseMeta {
  payload: KBPayload;
}

/**
 * KBペイロード（種別別）
 */
export type KBPayload =
  | PersonaPayload
  | BannerExtractionPayload
  | MarketInsightPayload
  | AggregationReportPayload
  | StrategyOptionPayload
  | PlanPayload
  | BannerLayoutPayload
  | AgentDefinitionPayload
  | WorkflowPayload
  | WorkflowRunPayload
  | LpStructurePayload
  | BannerStructurePayload;

/**
 * Personaペイロード
 */
export interface PersonaPayload {
  type: 'persona';
  persona_id: string;
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
    weight: number; // 0-1
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
}

/**
 * Banner Extractionペイロード
 */
export interface BannerExtractionPayload {
  type: 'banner';
  banner_id: string;
  extraction: Extraction;
  image_url?: string; // base64またはURL
}

/**
 * Market Insightペイロード
 */
export interface MarketInsightPayload {
  type: 'insight';
  insight_id: string;
  // 人の前提
  persona_premise: {
    assumption: string; // 仮説表現
    evidence: string; // 観測事実（断定OK）
  };
  // 観測事実（出現率など数値、断定OK）
  observed_facts: {
    choice: string; // 観測された競合の選択（事実）
    evidence: string; // 根拠（出現率など数値、断定OK）
    bbox_references?: Array<{ banner_id: string; bbox: BBoxCoord }>; // 対象BBox参照
  };
  // 合理性仮説（仮説表現のみ）
  rationale_hypothesis: string;
  // 市場制約（外すとリスクになりそうな前提、仮説表現）
  market_constraints: string;
  // Planning Hooks（問いのみ）
  planning_hooks: Array<{
    question: string;
    context: string;
    related_persona_ids?: string[];
  }>;
  // 根拠リンク（必須）
  evidence_links: {
    target_banner_ids: string[]; // 対象バナーID（必須、空配列は警告）
    target_bboxes?: Array<{ banner_id: string; bbox: BBoxCoord }>; // 対象BBox参照
  };
  // メタデータ
  category: 'high_frequency' | 'low_frequency' | 'combination' | 'brand_difference';
  persona_relevance?: Array<{
    persona_id: string;
    relevance_level: 'high' | 'medium' | 'low' | 'unknown';
    reasoning: string;
  }>;
}

/**
 * Aggregation Reportペイロード
 */
export interface AggregationReportPayload {
  type: 'report';
  report_id: string;
  aggregation: Aggregation | null; // 比較データの場合はnull
  total_banners: number;
  comparison_data?: any; // 比較データ（オプション）
}

/**
 * Strategy Optionペイロード
 */
export interface StrategyOptionPayload {
  type: 'option';
  option_id: string;
  option_type: 'A' | 'B' | 'C'; // 同調/部分的にずらす/あえて外す
  title: string;
  description: string;
  benefits: string[];
  risks: string[];
  rationality_assessment: {
    level: 'high' | 'medium' | 'low' | 'unknown';
    reasoning: string;
  };
  risk_assessment: {
    level: 'high' | 'medium' | 'low' | 'unknown';
    reasoning: string;
  };
  persona_risk_assessment: Array<{
    persona_id: string;
    risk_level: 'low' | 'medium' | 'high';
    reasoning: string;
    persona_overlay: 'high' | 'medium' | 'low' | 'unknown';
  }>;
  related_insight_ids: string[];
}

/**
 * Plan (LP Rough)ペイロード
 */
export interface PlanPayload {
  type: 'plan';
  plan_id: string;
  strategy_option: 'A' | 'B' | 'C';
  sections: Array<{
    section_name: string;
    order: number;
    purpose: string;
    include: string[];
    evidence_links: {
      related_insights?: string[];
      related_persona_ids?: string[];
      related_quotes?: string[];
    };
  }>;
  cautions: Array<{
    point: string;
    condition: string;
    evidence_links: {
      related_insights?: string[];
      related_persona_ids?: string[];
    };
  }>;
  planning_hooks: Array<{
    question: string;
    context: string;
    related_section_order?: number;
  }>;
}

/**
 * Banner Layoutペイロード（手動で確定したBBoxのみ）
 */
export interface BannerLayoutPayload {
  type: 'banner_layout';
  schemaVersion: 1;
  imageId: string; // ImageAsset.imageId
  productId?: string; // 任意
  title?: string; // 任意（例：ELIXIR 2025-01）
  updatedAt: string; // ISO
  components: Array<{
    key: 'product_image' | 'logo' | 'price' | 'cta' | 'limited' | 'other';
    label: string;
    bbox: { x: number; y: number; w: number; h: number; coord: 'normalized' };
    source: 'manual';
  }>;
  notes?: string;
}

/**
 * AgentDefinitionペイロード
 */
import { OutputViewContract } from '@/types/output-view-contract';

export interface AgentDefinitionPayload {
  type: 'agent_definition';
  agent_definition_id: string;
  name: string;
  description: string;
  category: 'planning' | 'creative' | 'analysis';
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema: 'lp_structure' | 'banner_structure';
  // フェーズ3: 追加フィールド
  outputKind?: 'lp_structure' | 'banner_structure';
  outputSchemaRef?: 'LpStructurePayloadSchema' | 'BannerStructurePayloadSchema';
  qualityChecklist?: string[];
  editable: boolean;
  // フェーズ1: 成果物の見せ方の契約
  outputViewContract?: OutputViewContract;
  outputArtifactTitle?: string; // 成果物表示用タイトル
  outputArtifactDescription?: string; // 説明
  // フェーズ3-3: AgentDefinition upgradeの反映状況
  contractVersion?: string; // outputViewContractのversion
  contractHash?: string; // outputViewContractのhash（内容変更検知用）
  contractSource?: 'seed' | 'kb' | 'manual'; // 契約の出所（seed=自動アップグレード、kb=既存、manual=手動編集）
}

/**
 * Workflowペイロード
 */
export interface WorkflowPayload {
  type: 'workflow';
  workflowId: string;
  name: string;
  description?: string;
  nodes: any[]; // WorkflowNode[]
  connections: any[]; // WorkflowConnection[]
}

/**
 * ExecutionContextサマリー（実行履歴用）
 */
export interface ExecutionContextSummary {
  productSummary?: {
    name?: string;
    category?: string;
  };
  personaSummary?: {
    id: string;
    title?: string;
  };
  bannerInsightsCount: number;
  marketInsightsCount: number;
  strategyOptionsCount: number;
  planningHooksCount: number;
  bboxCount: number;
  bboxTypes: string[];
  ocrTextLength: number;
  usedKbItemIds: string[];
  // フェーズ2-4: 参照runId一覧（監査用）
  referencedRunIds?: string[];
}

/**
 * Validation結果
 */
export interface ValidationResult {
  zod: {
    success: boolean;
    issues?: Array<{
      path: string;
      message: string;
    }>;
  };
  semantic?: {
    pass: boolean;
    reasons: string[];
  };
}

/**
 * Presentation Block（ViewModel - AIが生成する表示構造）
 */
export interface PresentationHeroBlock {
  type: 'hero';
  id: string;
  label: string;
  content: string | Record<string, any>; // 文字列またはオブジェクト
}

export interface PresentationBulletsBlock {
  type: 'bullets';
  id: string;
  label: string;
  items: string[] | Array<{ label?: string; content: string }>;
}

export interface PresentationCardsBlock {
  type: 'cards';
  id: string;
  label: string;
  cards: Array<{
    title: string;
    content?: string | Record<string, any>;
    [key: string]: any; // 追加フィールドは自由
  }>;
}

export interface PresentationTableBlock {
  type: 'table';
  id: string;
  label: string;
  headers: string[];
  rows: string[][];
}

export interface PresentationTimelineBlock {
  type: 'timeline';
  id: string;
  label: string;
  events: Array<{
    title: string;
    description?: string;
    timestamp?: string;
    [key: string]: any;
  }>;
}

export interface PresentationCopyBlocksBlock {
  type: 'copyBlocks';
  id: string;
  label: string;
  blocks: Array<{
    title?: string;
    content: string;
    [key: string]: any;
  }>;
}

export interface PresentationImagePromptsBlock {
  type: 'imagePrompts';
  id: string;
  label: string;
  prompts: Array<{
    purpose?: string;
    composition?: string;
    style?: string;
    prompt: string;
    [key: string]: any;
  }>;
}

export interface PresentationMarkdownBlock {
  type: 'markdown';
  id: string;
  label: string;
  content: string; // Markdown形式の文字列
}

export type PresentationBlock =
  | PresentationHeroBlock
  | PresentationBulletsBlock
  | PresentationCardsBlock
  | PresentationTableBlock
  | PresentationTimelineBlock
  | PresentationCopyBlocksBlock
  | PresentationImagePromptsBlock
  | PresentationMarkdownBlock;

/**
 * Presentation Model（ViewModel - AIが生成する表示構造）
 */
export interface PresentationModel {
  title: string; // 必須
  blocks: PresentationBlock[]; // 必須
}

/**
 * WorkflowRunペイロード（拡張版・可視化対応）
 */
export interface WorkflowRunPayload {
  type: 'workflow_run';
  workflowId: string;
  agentNodeId: string;
  agentId: string;
  
  // 実行情報
  executedAt: string;
  durationMs?: number;
  model?: string;
  
  // エージェント定義の完全特定
  agentDefinitionId: string;
  agentDefinitionUpdatedAt?: string;
  agentDefinitionVersionHash?: string; // systemPrompt + schemaRef + outputKind のhash
  
  // 1. 保存フォーマットを単一正規にする（表示に必要な最小セット）
  outputKind?: 'lp_structure' | 'banner_structure'; // 成果物の種類（必須）
  outputSchemaRef?: 'LpStructurePayloadSchema' | 'BannerStructurePayloadSchema'; // 任意だが入れると強い
  
  // 入力（完全なスナップショット + サマリー）
  inputsSnapshot: any; // ExecutionContext
  inputSummary: ExecutionContextSummary;
  
  // Step 4: Context Trace（文脈紡ぎの記録）
  contextTrace?: {
    referencedNodeIds: string[]; // 参照したノードID一覧
    referencedRunIds?: string[]; // 参照した実行結果ID一覧（既存）
    contextBuildLog: Array<{ // どのノードから何を拾ったか
      nodeId: string;
      nodeType: 'input' | 'agent';
      kind: string; // 'intent' | 'product' | 'persona' | 'kb_item' | 'agent_output' | 'workflow_run_ref'
      title: string;
      extractedAt: string;
    }>;
    contextSections: { // 役割順で整理された文脈セクション
      goal?: Array<{ nodeId: string; content: any }>;
      product?: Array<{ nodeId: string; content: any }>;
      persona?: Array<{ nodeId: string; content: any }>;
      knowledge?: Array<{ nodeId: string; content: any }>;
      upstreamOutputs?: Array<{ nodeId: string; content: any }>;
    };
  };
  
  // 出力（全段階）
  llmRawOutput?: string; // LLMの生出力（truncate可）
  parsedOutput?: any; // JSON（Zod前）
  zodValidationResult?: ValidationResult['zod'];
  semanticValidationResult?: ValidationResult['semantic'];
  finalOutput: any; // UIに表示する成果物（schema別）
  
  // 方針転換: Presentation（ViewModel - AIが生成する表示構造）
  presentation?: PresentationModel;
  
  // フェーズ3: Step 4-3 - 品質チェック結果（文脈の欠落検知）
  contextQuality?: {
    errors: string[];
    warnings: string[];
    missingInputs: string[];
    status: 'usable' | 'regenerate_recommended' | 'insufficient_evidence'; // 企画に利用可能 / 再生成推奨 / 根拠不足
  };
  
  // 従来のフィールド（後方互換）
  output: any; // finalOutputのエイリアス
  startedAt: string; // executedAtのエイリアス
  finishedAt: string;
  status: 'success' | 'error';
  error?: string;
}

/**
 * LP構成案ペイロード（フェーズ3）
 */
export interface LpStructurePayload {
  type: 'lp_structure';
  targetUser: {
    situation: string;
    desire: string;
    anxiety: string;
  };
  questions: Array<{
    category: string;
    question: string;
  }>;
  sections: Array<{
    order: number;
    name: string;
    role: string;
    answersQuestions: string[];
    keyPoints: string[];
    infoVolume: 'small' | 'medium' | 'large';
    expressionTypes: string[];
    nextMindset: string;
  }>;
  cvPolicy: {
    cvPlacement: 'final_only';
    note: string;
  };
}

/**
 * バナー構成案ペイロード（フェーズ3）
 */
export interface BannerStructurePayload {
  type: 'banner_structure';
  derivedFrom?: {
    lpRunId?: string;
  };
  bannerIdeas: Array<{
    id: string;
    pattern: '共感訴求型' | 'ベネフィット訴求型' | '安心訴求型' | '比較型' | '数字表現型' | '権威型' | '利用シーン提案型';
    targetState: string;
    singleValuePromise: string;
    mainCopyDirection: string;
    subElements: string[];
    avoid: string[];
    lpShouldAnswer: string[];
  }>;
}

/**
 * ActiveContext（他アプリ連携用）
 */
export interface ActiveContext {
  persona_ids?: string[];
  insight_ids?: string[];
  banner_ids?: string[];
  report_id?: string;
  option_id?: string;
  plan_id?: string;
  updated_at: string;
}
