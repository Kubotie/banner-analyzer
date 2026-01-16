/**
 * ワークフロー機能の型定義
 */

import { OutputViewContract } from './output-view-contract';

/**
 * エージェント定義（KBに保存）
 */
export interface AgentDefinition {
  id: string; // UUID
  name: string;
  description: string;
  category: 'planning' | 'creative' | 'analysis';
  systemPrompt: string; // 完全固定プロンプト
  userPromptTemplate: string; // 入力差し込み用テンプレート
  outputSchema: 'lp_structure' | 'banner_structure';
  // フェーズ3: 追加フィールド
  outputKind?: 'lp_structure' | 'banner_structure'; // outputSchemaのエイリアス（後方互換）
  outputSchemaRef?: 'LpStructurePayloadSchema' | 'BannerStructurePayloadSchema'; // Zodスキーマ参照名
  qualityChecklist?: string[]; // 品質チェックリスト（UI表示用）
  editable: boolean; // true（デフォルトエージェントも編集可能）
  createdAt: string;
  updatedAt: string;
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
 * ノードタイプ
 */
export type NodeType = 'input' | 'agent';

/**
 * InputNodeの種類
 */
export type InputNodeKind = 'product' | 'persona' | 'knowledge' | 'intent';

/**
 * InputNodeDataのinputKind（拡張）
 */
export type InputNodeDataInputKind = 'product' | 'persona' | 'kb_item' | 'workflow_run_ref' | 'intent';

/**
 * ノードの位置情報
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * IntentPayload（目的・意図ノードのデータ）
 * workflow内ノードデータに直接保存（KBには保存しない）
 */
export interface IntentPayload {
  goal: string; // 目的（必須）
  background?: string; // 背景
  targetSituation?: string; // 想定状況
  successCriteria: string; // 成功条件（必須）
  constraints?: string; // 制約/NG
  tone?: string; // トーン
}

/**
 * InputNodeData（参照先データ）
 */
export interface InputNodeData {
  inputKind: 'product' | 'persona' | 'kb_item' | 'workflow_run_ref' | 'intent';
  refId?: string; // productId / personaId / kbItemId / runId（intentの場合は不要）
  refKind?: string; // kb_itemの場合: market_insightなど / workflow_run_refの場合: 'workflow_run'
  title?: string; // 表示用
  // intentの場合のみ使用
  intentPayload?: IntentPayload;
}

/**
 * InputNode（入力ノード）
 */
export interface InputNode {
  id: string; // UUID
  type: 'input';
  kind: InputNodeKind;
  label: string; // 表示名
  position: NodePosition;
  // 参照先データ（統一形式）
  data?: InputNodeData;
  // 後方互換のため残す（dataがあればdataを優先）
  referenceId?: string; // productId, personaId, kbIdなど
  // メモ（任意）
  notes?: string;
}

/**
 * AgentNodeData（エージェントノードデータ）
 */
export interface AgentNodeData {
  agentId: string; // agent_definition id
  name?: string;
  lastRunId?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  lastError?: string;
  // フェーズ3: Orchestratorエージェント用
  selectedLpRunId?: string; // 参照するLP runのID
  // 可視化対応: 実行中の進捗ステップ
  executionStep?: string; // 例: "LLM処理中...", "検証中..."
  // 実行ログ（リアルタイムログ表示用）
  executionLogs?: Array<{
    timestamp: string;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: any;
  }>;
}

/**
 * AgentNode（エージェントノード）
 */
export interface AgentNode {
  id: string; // UUID
  type: 'agent';
  agentDefinitionId: string; // AgentDefinition.id（後方互換）
  label: string; // 表示名（AgentDefinition.nameから取得）
  position: NodePosition;
  // エージェントノードデータ（統一形式）
  data?: AgentNodeData;
  // 実行結果（実行後、後方互換）
  executionResult?: {
    output: any; // outputSchemaに応じた構造
    executedAt: string;
    error?: string;
  };
}

/**
 * ノード（Union型）
 */
export type WorkflowNode = InputNode | AgentNode;

/**
 * 接続（エッジ）
 */
export interface WorkflowConnection {
  id: string; // UUID
  fromNodeId: string; // 接続元ノードID
  toNodeId: string; // 接続先ノードID
}

/**
 * ワークフロー
 */
export interface Workflow {
  id: string; // UUID
  name: string; // ワークフロー名
  description?: string;
  nodes: WorkflowNode[]; // ノード一覧
  connections: WorkflowConnection[]; // 接続一覧
  createdAt: string;
  updatedAt: string;
  isActive?: boolean; // アクティブワークフローかどうか
}

/**
 * LP構成案の出力スキーマ
 */
export interface LPStructure {
  sections: Array<{
    section_name: string;
    order: number;
    role: string; // 役割
    answers_question: string; // 答える質問
    key_points: string[]; // 伝える要点
    information_volume: 'small' | 'medium' | 'large'; // 情報量
    expression_type: string[]; // 表現タイプ
    next_psychology: string; // 次の心理
  }>;
}

/**
 * バナー構成案の出力スキーマ
 */
export interface BannerStructure {
  banners: Array<{
    banner_name: string;
    order: number;
    target_user_state: string; // 狙うユーザー状態
    promised_value: string; // 約束する価値
    main_copy_direction: string; // メインコピー方向性
    sub_elements: string[]; // サブ要素
    lp_answer: string; // 遷移後LPで答えること
  }>;
}

/**
 * ContextPacket（Step 3: DAGベースの文脈パケット）
 */
export interface ContextPacket {
  id: string; // パケットID
  nodeId: string; // ノードID
  nodeType: 'input' | 'agent';
  kind: string; // 'intent' | 'product' | 'persona' | 'kb_item' | 'workflow_run_ref' | 'agent_output'
  title: string; // 表示用タイトル
  content: any; // ノードの内容（IntentPayload、Product、Persona、KBItem、AgentOutputなど）
  evidenceRefs?: string[]; // 根拠参照（KB item IDsなど）
  createdAt: string; // 作成日時
}

/**
 * ExecutionContext（エージェント実行時の入力データ）
 * Step 3: DAGベースの文脈組み立てに対応
 * 【重要】Step 3: 入力の薄め処理を禁止。原文/構造を保持する
 */
export interface ExecutionContext {
  // Step 3: DAGベースの文脈パケット（LLMに渡す本体 - 絶対に薄めない）
  packets?: ContextPacket[];
  // Step 3: inputsFull（packetsのエイリアス、LLMに渡す本体 - 原文/構造をそのまま保持）
  inputsFull?: Array<{
    kind: string; // 'intent' | 'product' | 'persona' | 'kb_item' | 'workflow_run_ref' | 'agent_output'
    refId?: string;
    payloadRaw: any; // 原文/構造をそのまま保持（truncate/stringify禁止）
    payloadStructured?: any; // 構造化された形式（あれば）
    sourceTitle?: string;
    sourceUrl?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  // Step 3: inputsPreview（UI表示用 - ここだけ短くしてOK）
  inputsPreview?: {
    counts: {
      kbItems: number;
      personas: number;
      products: number;
      intent: number;
      agentOutputs: number;
    };
    highlights: Array<{
      kind: string;
      title: string;
      preview: string; // 1行要約（単純ルールでOK）
    }>;
    charCounts: {
      total: number;
      byKind: Record<string, number>;
    };
  };
  trace?: {
    orderedNodeIds: string[]; // トポロジカル順のノードID
    edgesUsed: Array<{ from: string; to: string }>; // 使用したエッジ
    mergedAt: string; // マージ日時
  };
  
  // 従来のフィールド（後方互換性のため残す）
  product?: {
    id: string;
    name?: string;
    [key: string]: any;
  };
  persona?: {
    id: string;
    summary?: string;
    [key: string]: any;
  };
  knowledge: Array<{
    kind: string;
    id: string;
    title?: string;
    payload: any;
  }>;
  notes?: string;
  banner?: {
    imageId?: string;
    extraction?: any;
    ocrTexts?: string[];
    bboxes?: any[];
  };
  // フェーズ2-4: workflow_run_refの出力をinputsに追加
  inputs?: {
    [key: string]: {
      kind: 'workflow_run_output';
      runId: string;
      output: any;
    };
  };
  // フェーズ2-4: 参照runId一覧（監査用）
  referencedRunIds?: string[];
  // フェーズ3: LP構成案の参照（Orchestratorエージェント用）
  lp_structure?: {
    runId?: string; // workflow_runのID
    payload: any; // LpStructurePayload
  };
  // フェーズ3: 参照したKB item id一覧（監査用）
  referencedKbItemIds?: string[];
  // Step 3: Intentノードのデータ
  intent?: IntentPayload;
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
 * WorkflowRun（実行履歴・拡張版）
 */
export interface WorkflowRun {
  id: string;
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
  
  // 入力（完全なスナップショット + サマリー）
  inputsSnapshot: ExecutionContext;
  inputSummary: ExecutionContextSummary;
  
  // 出力（全段階）
  llmRawOutput?: string; // LLMの生出力（truncate可）
  parsedOutput?: any; // JSON（Zod前）
  zodValidationResult?: ValidationResult['zod'];
  semanticValidationResult?: ValidationResult['semantic'];
  finalOutput: any; // UIに表示する成果物（schema別）
  
  // 従来のフィールド（後方互換）
  output: any; // finalOutputのエイリアス
  startedAt: string; // executedAtのエイリアス
  finishedAt: string;
  status: 'success' | 'error';
  error?: string;
}
