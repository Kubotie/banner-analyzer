/**
 * WorkflowRunPayload正規化ユーティリティ
 * フェーズ0: 整合性固定 - 単一正規フォーマットへの統一
 */

import { KBItem, WorkflowRunPayload, ExecutionContextSummary } from './types';

/**
 * 正規化されたWorkflowRunPayload（canonical format）
 */
export interface NormalizedWorkflowRunPayload extends WorkflowRunPayload {
  // 必須フィールド（常に存在することを保証）
  id: string; // runId
  workflowId: string;
  nodeId: string; // agentNodeId
  agentId: string; // agentDefinitionId
  status: 'success' | 'error' | 'running';
  startedAt: string; // ISO 8601
  finishedAt: string | null; // ISO 8601 or null
  executedAt: string; // ISO 8601 (finishedAt ?? startedAt)
  
  // 出力（優先順位: finalOutput > parsedOutput > output）
  finalOutput: any | null;
  parsedOutput: any | null;
  output: any | null; // 後方互換用
  
  // LLM生出力
  llmRawOutput: string | null;
  
  // 検証結果
  zodValidationResult: {
    success: boolean;
    issues: Array<{ path: string; message: string }>;
  };
  
  // 実行コンテキストサマリー
  executionContextSummary: ExecutionContextSummary | null;
  inputSummary: ExecutionContextSummary | null;
  
  // エージェント定義情報
  agentDefinitionId: string;
  agentDefinitionUpdatedAt: string | null;
  agentDefinitionVersionHash: string | null;
  
  // 1. 表示に必要な最小セット
  outputKind?: 'lp_structure' | 'banner_structure'; // 必須
  outputSchemaRef?: 'LpStructurePayloadSchema' | 'BannerStructurePayloadSchema'; // 任意だが入れると強い
  
  // 実行情報
  durationMs: number | null;
  model: string | null;
  
  // エラー情報
  error: string | null;
}

/**
 * WorkflowRunPayloadを正規化する
 * 旧形式のデータも新形式に変換する
 */
export function normalizeRunPayload(
  runItem: KBItem | { kb_id: string; payload: any; created_at?: string; updated_at?: string }
): NormalizedWorkflowRunPayload | null {
  if (!runItem.payload || typeof runItem.payload !== 'object') {
    console.warn('[normalizeRunPayload] payload is missing or invalid:', {
      kb_id: runItem.kb_id,
      hasPayload: !!runItem.payload,
      payloadType: typeof runItem.payload,
    });
    return null;
  }
  
  const payload = runItem.payload as any;
  
  // typeチェック
  if (payload.type !== 'workflow_run') {
    console.warn('[normalizeRunPayload] payload type is not workflow_run:', {
      kb_id: runItem.kb_id,
      type: payload.type,
    });
    return null;
  }
  
  // 必須フィールドの抽出とデフォルト値設定
  const id = runItem.kb_id;
  const workflowId = payload.workflowId || '';
  const nodeId = payload.agentNodeId || payload.nodeId || '';
  const agentId = payload.agentId || payload.agentDefinitionId || '';
  
  // ステータス
  const status: 'success' | 'error' | 'running' = payload.status || 'error';
  
  // タイムスタンプ
  const startedAt = payload.startedAt || payload.executedAt || runItem.created_at || new Date().toISOString();
  const finishedAt = payload.finishedAt || (status === 'success' ? payload.executedAt : null);
  const executedAt = finishedAt || startedAt;
  
  // 出力の優先順位: finalOutput > parsedOutput > output
  const finalOutput = payload.finalOutput || null;
  const parsedOutput = payload.parsedOutput || null;
  const output = finalOutput || parsedOutput || payload.output || null;
  
  // LLM生出力
  const llmRawOutput = payload.llmRawOutput || null;
  
  // 検証結果
  const zodValidationResult = payload.zodValidationResult || {
    success: false,
    issues: [],
  };
  
  // 実行コンテキストサマリー
  const executionContextSummary = payload.executionContextSummary || payload.inputSummary || null;
  const inputSummary = payload.inputSummary || executionContextSummary || null;
  
  // エージェント定義情報
  const agentDefinitionId = payload.agentDefinitionId || agentId || '';
  const agentDefinitionUpdatedAt = payload.agentDefinitionUpdatedAt || null;
  const agentDefinitionVersionHash = payload.agentDefinitionVersionHash || null;
  
  // 実行情報
  const durationMs = payload.durationMs || null;
  const model = payload.model || null;
  
  // エラー情報
  const error = payload.error || (status === 'error' ? payload.lastError : null) || null;
  
  return {
    type: 'workflow_run',
    id,
    workflowId,
    nodeId,
    agentId,
    status,
    startedAt,
    finishedAt,
    executedAt,
    finalOutput,
    parsedOutput,
    output,
    llmRawOutput,
    zodValidationResult,
    executionContextSummary,
    inputSummary,
    agentDefinitionId,
    agentDefinitionUpdatedAt,
    agentDefinitionVersionHash,
    outputKind: payload.outputKind, // 1. outputKindを保持
    outputSchemaRef: payload.outputSchemaRef, // 1. outputSchemaRefを保持
    durationMs,
    model,
    error,
    
    // 後方互換のため、元のpayloadの他のフィールドも保持
    ...payload,
  };
}

/**
 * 実行時に保存する前に正規化する（API側で使用）
 */
export function normalizeRunPayloadForSave(
  payload: Partial<WorkflowRunPayload>
): WorkflowRunPayload {
  const now = new Date().toISOString();
  
  // ステータスに応じてfinishedAtを決定
  const status = payload.status || 'error';
  const startedAt = payload.startedAt || payload.executedAt || now;
  const finishedAt = payload.finishedAt || (status === 'success' ? payload.executedAt || now : null);
  const executedAt = finishedAt || startedAt;
  
  // 出力の優先順位: finalOutput > parsedOutput > output
  const finalOutput = payload.finalOutput || payload.parsedOutput || payload.output || null;
  
  // 4. workflowId/agentNodeIdの必須チェック（空文字列は許可しない）
  const workflowId = payload.workflowId;
  const agentNodeId = payload.agentNodeId || payload.nodeId;
  const agentId = payload.agentId || payload.agentDefinitionId;
  
  if (!workflowId || workflowId === '') {
    console.error('[normalizeRunPayloadForSave] workflowId is missing:', payload);
  }
  if (!agentNodeId || agentNodeId === '') {
    console.error('[normalizeRunPayloadForSave] agentNodeId is missing:', payload);
  }
  
  return {
    type: 'workflow_run',
    workflowId: workflowId || '',
    agentNodeId: agentNodeId || '',
    agentId: agentId || '',
    
    // 実行情報
    executedAt,
    startedAt,
    finishedAt: finishedAt || undefined,
    durationMs: payload.durationMs,
    model: payload.model,
    
    // エージェント定義の完全特定
    agentDefinitionId: payload.agentDefinitionId || payload.agentId || '',
    agentDefinitionUpdatedAt: payload.agentDefinitionUpdatedAt,
    agentDefinitionVersionHash: payload.agentDefinitionVersionHash,
    
    // 1. 表示に必要な最小セット
    outputKind: payload.outputKind,
    outputSchemaRef: payload.outputSchemaRef,
    
    // 入力（完全なスナップショット + サマリー）
    inputsSnapshot: payload.inputsSnapshot || null,
    inputSummary: payload.inputSummary || {
      bannerInsightsCount: 0,
      marketInsightsCount: 0,
      strategyOptionsCount: 0,
      planningHooksCount: 0,
      bboxCount: 0,
      bboxTypes: [],
      ocrTextLength: 0,
      usedKbItemIds: [],
    },
    
    // 出力（全段階）
    llmRawOutput: payload.llmRawOutput,
    parsedOutput: payload.parsedOutput || null,
    zodValidationResult: payload.zodValidationResult || { success: false, issues: [] },
    semanticValidationResult: payload.semanticValidationResult,
    finalOutput,
    
    // Step2: Presentation（ViewModel）を保存
    presentation: payload.presentation,
    
    // 従来のフィールド（後方互換）
    output: finalOutput,
    status: status as 'success' | 'error',
    error: payload.error,
  } as WorkflowRunPayload;
}
