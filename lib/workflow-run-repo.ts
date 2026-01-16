/**
 * WorkflowRunリポジトリ（統一データソース）
 * HistoryとOutputListで同じロジックを使用する
 */

import { KBItem, WorkflowRunPayload } from '@/kb/types';
import { normalizeRunPayload, NormalizedWorkflowRunPayload } from '@/kb/workflow-run-normalizer';

export interface ListWorkflowRunsOptions {
  workflowId?: string;
  agentNodeId?: string;
  status?: 'success' | 'error' | 'running';
  includeAllStatuses?: boolean; // trueの場合、statusフィルタを無視
}

export interface WorkflowRunWithMetadata {
  item: KBItem;
  payload: NormalizedWorkflowRunPayload;
}

/**
 * ワークフロー実行履歴を取得（統一ロジック）
 */
export async function listWorkflowRuns(
  options: ListWorkflowRunsOptions = {}
): Promise<WorkflowRunWithMetadata[]> {
  try {
    // workflow_runタイプのKBアイテムを取得
    const response = await fetch('/api/kb/items?type=workflow_run');
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorMessage = `Failed to fetch workflow runs (HTTP ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        if (errorText.trim().length > 0) {
          errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`;
        }
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const items: KBItem[] = data.items || [];
  
  // payloadなしアイテムを除外
  const validItems = items.filter((item) => {
    if (item.type !== 'workflow_run') return false;
    if (!item.payload || typeof item.payload !== 'object') {
      return false;
    }
    return true;
  });
  
  // 正規化
  const normalizedRuns = validItems
    .map((item) => normalizeRunPayload(item))
    .filter((normalized): normalized is NormalizedWorkflowRunPayload => {
      return !!normalized;
    });
  
  // フィルタ適用
  let filtered = normalizedRuns;
  
  if (options.workflowId) {
    filtered = filtered.filter((n) => n.workflowId === options.workflowId);
  }
  
  if (options.agentNodeId) {
    filtered = filtered.filter((n) => n.nodeId === options.agentNodeId);
  }
  
  if (options.status && !options.includeAllStatuses) {
    filtered = filtered.filter((n) => n.status === options.status);
  }
  
    // KBItemとペアリング
    const result: WorkflowRunWithMetadata[] = filtered
      .map((normalized) => {
        const item = validItems.find((i) => i.kb_id === normalized.id);
        if (!item) return null;
        return { item, payload: normalized };
      })
      .filter((r): r is WorkflowRunWithMetadata => r !== null);
    
    return result;
  } catch (error) {
    // ネットワークエラーやタイムアウトの場合、より詳細なメッセージを提供
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(
        'ワークフロー実行履歴の取得に失敗しました。\n\n' +
        '考えられる原因:\n' +
        '1. サーバーが起動していない可能性があります\n' +
        '2. ネットワーク接続に問題がある可能性があります\n' +
        '3. APIエンドポイントが正しく設定されていない可能性があります\n\n' +
        '開発サーバーを起動しているか確認してください。'
      );
    }
    throw error;
  }
}
