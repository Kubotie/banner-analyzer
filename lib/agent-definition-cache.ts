/**
 * AgentDefinitionキャッシュ（4. パフォーマンス改善）
 * OutputList/RunDetailView/Historyがそれぞれ別にfetchしないようにする
 */

import { AgentDefinition } from '@/types/workflow';
import { getAgentDefinition } from './agent-definition-api';

// Module-level cache
const cache = new Map<string, { definition: AgentDefinition | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

/**
 * AgentDefinitionを取得（キャッシュ付き）
 */
export async function getAgentDefinitionCached(agentDefinitionId: string): Promise<AgentDefinition | null> {
  // キャッシュチェック
  const cached = cache.get(agentDefinitionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.definition;
  }
  
  // キャッシュミスまたは期限切れ：取得
  try {
    const definition = await getAgentDefinition(agentDefinitionId);
    cache.set(agentDefinitionId, {
      definition,
      timestamp: Date.now(),
    });
    return definition;
  } catch (error) {
    console.error('[AgentDefinitionCache] Failed to fetch:', agentDefinitionId, error);
    // エラー時はnullをキャッシュ（短期間）
    cache.set(agentDefinitionId, {
      definition: null,
      timestamp: Date.now(),
    });
    return null;
  }
}

/**
 * キャッシュをクリア
 */
export function clearAgentDefinitionCache(agentDefinitionId?: string): void {
  if (agentDefinitionId) {
    cache.delete(agentDefinitionId);
  } else {
    cache.clear();
  }
}
