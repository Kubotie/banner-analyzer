'use client';

import { useState, useEffect, useCallback } from 'react';
import { AgentNode, WorkflowRun } from '@/types/workflow';
import { KBItem, WorkflowRunPayload } from '@/kb/types';
import { normalizeRunPayload, NormalizedWorkflowRunPayload } from '@/kb/workflow-run-normalizer';
import { CheckCircle, XCircle } from 'lucide-react';
import { useWorkflowStore } from '@/store/useWorkflowStore';

interface WorkflowRunHistoryProps {
  agentNode: AgentNode | null;
}

/**
 * ワークフロー実行履歴表示
 */
export default function WorkflowRunHistory({ agentNode }: WorkflowRunHistoryProps) {
  const { openRunDrawer } = useWorkflowStore();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [runItemsMap, setRunItemsMap] = useState<Map<string, KBItem>>(new Map());
  const [runPayloadsMap, setRunPayloadsMap] = useState<Map<string, NormalizedWorkflowRunPayload>>(new Map());
  
  // loadRunHistoryをuseCallbackでメモ化（無限ループ防止 - フェーズ0）
  // 3. HistoryとOutputListのソースを統一（workflow-run-repo.ts使用）
  const loadRunHistory = useCallback(async (agentNodeId: string) => {
    setLoading(true);
    try {
      const { listWorkflowRuns } = await import('@/lib/workflow-run-repo');
      const runsWithMetadata = await listWorkflowRuns({
        agentNodeId,
        includeAllStatuses: true, // 全ステータスを含める
      });
      
      console.debug('[WorkflowRunHistory] Loaded runs:', {
        totalCount: runsWithMetadata.length,
        agentNodeId,
      });
      
      // 正規化されたデータからWorkflowRun形式に変換
      const agentRuns: WorkflowRun[] = runsWithMetadata
        .map(({ payload: normalized }) => {
          // 出力の優先順位: finalOutput > parsedOutput > output
          const output = normalized.finalOutput || normalized.parsedOutput || normalized.output;
          
          return {
            id: normalized.id,
            workflowId: normalized.workflowId,
            agentNodeId: normalized.nodeId,
            agentId: normalized.agentId,
            inputsSnapshot: normalized.executionContextSummary || {},
            output,
            startedAt: normalized.startedAt,
            finishedAt: normalized.finishedAt || normalized.executedAt,
            status: normalized.status,
            error: normalized.error || null,
          };
        })
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      
      setRuns(agentRuns);
      
      // RunItemとPayloadのマップを保存
      const itemsMap = new Map<string, KBItem>();
      const payloadsMap = new Map<string, NormalizedWorkflowRunPayload>();
      runsWithMetadata.forEach(({ item, payload }) => {
        itemsMap.set(item.kb_id, item);
        payloadsMap.set(payload.id, payload);
      });
      setRunItemsMap(itemsMap);
      setRunPayloadsMap(payloadsMap);
    } catch (error) {
      console.error('Failed to load run history:', error);
    } finally {
      setLoading(false);
    }
  }, []); // 依存配列は空（agentNodeIdは引数で受け取る）
  
  useEffect(() => {
    if (agentNode) {
      loadRunHistory(agentNode.id);
    } else {
      setRuns([]);
    }
  }, [agentNode?.id, loadRunHistory]); // loadRunHistoryを依存配列に追加
  
  if (!agentNode) {
    return (
      <div className="p-4">
        <h4 className="font-semibold mb-3">実行履歴</h4>
        <div className="text-sm text-gray-500">
          エージェントノードを選択すると実行履歴が表示されます
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      <h4 className="font-semibold">実行履歴</h4>
      
      {loading ? (
        <div className="text-sm text-gray-500">読み込み中...</div>
      ) : runs.length === 0 ? (
        <div className="text-sm text-gray-500">
          実行履歴がありません
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => {
            const runItem = runItemsMap.get(run.id);
            const runPayload = runPayloadsMap.get(run.id);
            return (
              <div
                key={run.id}
                className="p-3 border rounded cursor-pointer hover:border-gray-400"
                onClick={() => {
                  if (runItem && runPayload) {
                    openRunDrawer(run.id);
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {run.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {new Date(run.startedAt).toLocaleString('ja-JP')}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  ステータス: {run.status === 'success' ? '成功' : 'エラー'}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
    </div>
  );
}
