/**
 * エージェント定義のAPI（サーバーサイド専用）
 * このファイルはサーバーサイドでのみ使用可能
 */

import { AgentDefinition } from '@/types/workflow';
import { getKBItemsMeta, getKBItem } from '@/kb/db-server';

/**
 * エージェント定義を取得（サーバーサイド用、KBから直接取得）
 */
export async function getAgentDefinitionFromKB(id: string): Promise<AgentDefinition | null> {
  try {
    const items = await getKBItemsMeta({ type: 'agent_definition' });
    
    for (const item of items) {
      const fullItem = await getKBItem(item.kb_id);
      if (fullItem && (fullItem.payload as any).agent_definition_id === id) {
        const payload = fullItem.payload as any;
        return {
          id: payload.agent_definition_id,
          name: payload.name,
          description: payload.description,
          category: payload.category,
          systemPrompt: payload.systemPrompt,
          userPromptTemplate: payload.userPromptTemplate,
          outputSchema: payload.outputSchema,
          editable: payload.editable,
          createdAt: fullItem.created_at,
          updatedAt: fullItem.updated_at,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get agent definition from KB:', error);
    return null;
  }
}
