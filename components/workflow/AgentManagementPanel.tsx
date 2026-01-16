'use client';

import { useState, useEffect } from 'react';
import { AgentDefinition } from '@/types/workflow';
import { Plus, Edit2, Trash2, Save, X, Sparkles } from 'lucide-react';

interface AgentManagementPanelProps {
  agentDefinitions: AgentDefinition[];
  onRefresh: () => Promise<void>;
  onSave: (definition: AgentDefinition) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  activeWorkflow?: any; // 現在のワークフロー（接続情報を取得するため）
  selectedAgentNodeId?: string | null; // 選択されているAgentノードID
}

/**
 * エージェント管理パネル（右カラムのOutputタブ内）
 */
export default function AgentManagementPanel({
  agentDefinitions,
  onRefresh,
  onSave,
  onDelete,
  activeWorkflow,
  selectedAgentNodeId,
}: AgentManagementPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDefinition, setEditingDefinition] = useState<AgentDefinition | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const handleStartEdit = (agent: AgentDefinition) => {
    if (!agent.editable) {
      alert('このエージェントは編集できません');
      return;
    }
    setEditingId(agent.id);
    setEditingDefinition({ ...agent });
  };
  
  const handleSaveEdit = async () => {
    if (!editingDefinition) return;
    try {
      await onSave(editingDefinition);
      setEditingId(null);
      setEditingDefinition(null);
      await onRefresh();
    } catch (error: any) {
      alert(`保存エラー: ${error.message}`);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingDefinition(null);
  };
  
  const handleDelete = async (id: string) => {
    const agent = agentDefinitions.find((a) => a.id === id);
    if (!agent) return;
    
    if (!confirm(`「${agent.name}」を削除しますか？`)) return;
    
    try {
      await onDelete(id);
      await onRefresh();
    } catch (error: any) {
      alert(`削除エラー: ${error.message}`);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">エージェント管理</h4>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          新規作成
        </button>
      </div>
      
      <div className="space-y-2">
        {agentDefinitions
          .filter((agent, index, self) => 
            // 重複を除去（同じIDのエージェントは最初のもののみ表示）
            self.findIndex(a => a.id === agent.id) === index
          )
          .map((agent) => (
          <div
            key={agent.id}
            className="p-3 border rounded"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="font-medium text-sm">{agent.name}</div>
                <div className="text-xs text-gray-600 mt-1">{agent.description}</div>
                {agent.id === 'lp-agent-default' || agent.id === 'banner-agent-default' ? (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                    デフォルト
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1 ml-2">
                {agent.editable && (
                  <>
                    <button
                      onClick={() => handleStartEdit(agent)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      title="編集"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="削除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {editingId === agent.id && editingDefinition ? (
              <AgentEditForm
                definition={editingDefinition}
                onUpdate={setEditingDefinition}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                activeWorkflow={activeWorkflow}
                selectedAgentNodeId={selectedAgentNodeId}
              />
            ) : null}
          </div>
        ))}
      </div>
      
      {showCreateForm && (
        <AgentCreateForm
          onSave={async (definition) => {
            await onSave(definition);
            setShowCreateForm(false);
            await onRefresh();
          }}
          onCancel={() => setShowCreateForm(false)}
          activeWorkflow={activeWorkflow}
          selectedAgentNodeId={selectedAgentNodeId}
        />
      )}
    </div>
  );
}

/**
 * エージェント編集フォーム
 */
function AgentEditForm({
  definition,
  onUpdate,
  onSave,
  onCancel,
  activeWorkflow,
  selectedAgentNodeId,
}: {
  definition: AgentDefinition;
  onUpdate: (def: AgentDefinition) => void;
  onSave: () => void;
  onCancel: () => void;
  activeWorkflow?: any;
  selectedAgentNodeId?: string | null;
}) {
  return (
    <div className="mt-3 p-3 bg-gray-50 rounded space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">名前</label>
        <input
          type="text"
          value={definition.name}
          onChange={(e) => onUpdate({ ...definition, name: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">説明</label>
        <input
          type="text"
          value={definition.description}
          onChange={(e) => onUpdate({ ...definition, description: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt</label>
        <textarea
          value={definition.systemPrompt}
          onChange={(e) => onUpdate({ ...definition, systemPrompt: e.target.value })}
          rows={10}
          className="w-full px-2 py-1 text-sm border rounded font-mono text-xs"
        />
        <button
          onClick={() => navigator.clipboard.writeText(definition.systemPrompt)}
          className="mt-1 text-xs text-blue-600 hover:underline"
        >
          コピー
        </button>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-700">User Prompt Template</label>
          <button
            onClick={() => {
              // 接続情報を基にテンプレートを生成
              // 選択されているAgentノードがある場合はそれを使用、なければこのエージェント定義を使用しているAgentノードを探す
              const connectedInputs = getConnectedInputNodes(activeWorkflow, selectedAgentNodeId, definition.id);
              const template = generateUserPromptTemplateFromConnections(connectedInputs);
              onUpdate({ ...definition, userPromptTemplate: template });
              
              if (connectedInputs.length > 0) {
                alert(`${connectedInputs.length}件の接続情報を反映したテンプレートを生成しました。`);
              } else if (activeWorkflow) {
                alert('接続情報が見つかりませんでした。汎用テンプレートを生成しました。\nワークフロー編集画面でAgentノードを選択してから「自動生成」をクリックすると、接続情報を反映できます。');
              } else {
                alert('汎用テンプレートを生成しました。\nワークフロー編集画面でAgentノードを選択してから「自動生成」をクリックすると、接続情報を反映できます。');
              }
            }}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            title={activeWorkflow && (selectedAgentNodeId || definition.id) ? "接続されたInputノード情報を基にテンプレートを生成" : "汎用テンプレートを生成（接続情報がない場合は{{context}}を使用）"}
          >
            <Sparkles className="w-3 h-3" />
            自動生成
          </button>
        </div>
        <textarea
          value={definition.userPromptTemplate}
          onChange={(e) => onUpdate({ ...definition, userPromptTemplate: e.target.value })}
          rows={6}
          className="w-full px-2 py-1 text-sm border rounded font-mono text-xs"
        />
        <div className="mt-1 text-xs text-gray-500">
          💡 ヒント: {'{{context}}'} を使用すると、接続されたすべての情報（タイトルと詳細）が自動的に含まれます
          {activeWorkflow && selectedAgentNodeId && (
            <span className="block mt-1 text-blue-600">
              ✓ 現在のワークフローで接続情報を参照してテンプレートを生成できます
            </span>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center justify-center gap-1"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 border text-sm rounded hover:bg-gray-50 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          キャンセル
        </button>
      </div>
    </div>
  );
}

/**
 * エージェント作成フォーム
 */
function AgentCreateForm({
  onSave,
  onCancel,
  activeWorkflow,
  selectedAgentNodeId,
}: {
  onSave: (definition: AgentDefinition) => Promise<void>;
  onCancel: () => void;
  activeWorkflow?: any;
  selectedAgentNodeId?: string | null;
}) {
  const [definition, setDefinition] = useState<Partial<AgentDefinition>>({
    name: '',
    description: '',
    category: 'planning',
    systemPrompt: '',
    userPromptTemplate: '',
    outputSchema: 'lp_structure',
    editable: true,
  });
  
  const handleSave = async () => {
    if (!definition.name || !definition.systemPrompt || !definition.userPromptTemplate) {
      alert('名前、System Prompt、User Prompt Templateは必須です');
      return;
    }
    
    const now = new Date().toISOString();
    const newDefinition: AgentDefinition = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: definition.name,
      description: definition.description || '',
      category: definition.category || 'planning',
      systemPrompt: definition.systemPrompt,
      userPromptTemplate: definition.userPromptTemplate,
      outputSchema: definition.outputSchema || 'lp_structure',
      editable: true,
      createdAt: now,
      updatedAt: now,
    };
    
    await onSave(newDefinition);
  };
  
  return (
    <div className="p-4 bg-white border rounded-lg space-y-3">
      <h5 className="font-semibold text-sm mb-3">新規エージェント作成</h5>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">名前 *</label>
        <input
          type="text"
          value={definition.name}
          onChange={(e) => setDefinition({ ...definition, name: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">説明</label>
        <input
          type="text"
          value={definition.description}
          onChange={(e) => setDefinition({ ...definition, description: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">カテゴリ</label>
        <select
          value={definition.category}
          onChange={(e) => setDefinition({ ...definition, category: e.target.value as any })}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          <option value="planning">planning</option>
          <option value="creative">creative</option>
          <option value="analysis">analysis</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt *</label>
        <textarea
          value={definition.systemPrompt}
          onChange={(e) => setDefinition({ ...definition, systemPrompt: e.target.value })}
          rows={10}
          className="w-full px-2 py-1 text-sm border rounded font-mono text-xs"
          placeholder="エージェントの指示文を入力..."
        />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-700">User Prompt Template *</label>
          <button
            onClick={() => {
              // 接続情報を基にテンプレートを生成
              // 選択されているAgentノードがある場合はそれを使用
              const connectedInputs = getConnectedInputNodes(activeWorkflow, selectedAgentNodeId, null);
              const template = generateUserPromptTemplateFromConnections(connectedInputs);
              setDefinition({ ...definition, userPromptTemplate: template });
              
              if (connectedInputs.length > 0) {
                alert(`${connectedInputs.length}件の接続情報を反映したテンプレートを生成しました。`);
              } else if (activeWorkflow) {
                alert('接続情報が見つかりませんでした。汎用テンプレートを生成しました。\nワークフロー編集画面でAgentノードを選択してから「自動生成」をクリックすると、接続情報を反映できます。');
              } else {
                alert('汎用テンプレートを生成しました。\nワークフロー編集画面でAgentノードを選択してから「自動生成」をクリックすると、接続情報を反映できます。');
              }
            }}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            title={activeWorkflow && selectedAgentNodeId ? "接続されたInputノード情報を基にテンプレートを生成" : "汎用テンプレートを生成（接続情報がない場合は{{context}}を使用）"}
          >
            <Sparkles className="w-3 h-3" />
            自動生成
          </button>
        </div>
        <textarea
          value={definition.userPromptTemplate}
          onChange={(e) => setDefinition({ ...definition, userPromptTemplate: e.target.value })}
          rows={6}
          className="w-full px-2 py-1 text-sm border rounded font-mono text-xs"
          placeholder="{{context}} を使用すると、接続されたすべての情報が自動的に含まれます"
        />
        <div className="mt-1 text-xs text-gray-500">
          💡 ヒント: {'{{context}}'} を使用すると、接続されたすべての情報（タイトルと詳細）が自動的に含まれます
          {activeWorkflow && selectedAgentNodeId && (
            <span className="block mt-1 text-blue-600">
              ✓ 現在のワークフローで接続情報を参照してテンプレートを生成できます
            </span>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Output Schema</label>
        <select
          value={definition.outputSchema}
          onChange={(e) => setDefinition({ ...definition, outputSchema: e.target.value as any })}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          <option value="lp_structure">lp_structure</option>
          <option value="banner_structure">banner_structure</option>
        </select>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          作成
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 border text-sm rounded hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

/**
 * 接続されたInputノード情報を取得（直接接続と間接接続の両方を含む）
 */
function getConnectedInputNodes(activeWorkflow: any, agentNodeId: string | null | undefined, agentDefinitionId: string | null | undefined): Array<{ kind: string; title: string; label: string }> {
  if (!activeWorkflow || !activeWorkflow.nodes) return [];
  
  let agentNode: any = null;
  
  // まずagentNodeIdで探す（選択されているAgentノードがある場合）
  if (agentNodeId) {
    agentNode = activeWorkflow.nodes.find((n: any) => n.id === agentNodeId && n.type === 'agent');
  }
  
  // agentNodeIdで見つからない場合、agentDefinitionIdで探す（エージェント定義を使用しているAgentノード）
  if (!agentNode && agentDefinitionId) {
    agentNode = activeWorkflow.nodes.find((n: any) => 
      n.type === 'agent' && n.agentDefinitionId === agentDefinitionId
    );
  }
  
  if (!agentNode) return [];
  
  // 接続されたInputノードを取得（再帰的に上流のInputノードも含む）
  const getAllUpstreamInputs = (targetNodeId: string, visited: Set<string> = new Set()): any[] => {
    if (visited.has(targetNodeId)) return [];
    visited.add(targetNodeId);
    
    const upstreamNodeIds = activeWorkflow.connections
      ?.filter((conn: any) => conn.toNodeId === targetNodeId)
      .map((conn: any) => conn.fromNodeId) || [];
    
    const upstreamInputs: any[] = [];
    const seenNodeIds = new Set<string>();
    
    for (const upstreamNodeId of upstreamNodeIds) {
      if (seenNodeIds.has(upstreamNodeId)) continue;
      const node = activeWorkflow.nodes.find((n: any) => n.id === upstreamNodeId);
      if (node) {
        if (node.type === 'input') {
          if (!seenNodeIds.has(node.id)) {
            upstreamInputs.push(node);
            seenNodeIds.add(node.id);
          }
        } else if (node.type === 'agent') {
          // Agentノードの場合は、さらに上流を取得
          const furtherUpstream = getAllUpstreamInputs(node.id, new Set(visited));
          for (const upstreamNode of furtherUpstream) {
            if (!seenNodeIds.has(upstreamNode.id)) {
              upstreamInputs.push(upstreamNode);
              seenNodeIds.add(upstreamNode.id);
            }
          }
        }
      }
    }
    
    return upstreamInputs;
  };
  
  const allUpstreamInputs = getAllUpstreamInputs(agentNode.id);
  
  const connectedInputs = allUpstreamInputs.map((n: any) => ({
    kind: n.data?.inputKind || n.kind || 'unknown',
    title: n.data?.title || n.label || 'タイトルなし',
    label: n.label || 'ラベルなし',
  }));
  
  return connectedInputs;
}

/**
 * 接続情報を基にUser Prompt Templateを生成
 * 接続されたInputノードのタイトルと詳細情報を含む構造化されたテンプレートを生成
 */
function generateUserPromptTemplateFromConnections(connectedInputs: Array<{ kind: string; title: string; label: string }>): string {
  // 最小限のテンプレートのみ生成（ユーザーの自由度を確保）
  const sections: string[] = [];
  
  // 接続情報の説明のみ（固定の指示は含めない）
  if (connectedInputs.length > 0) {
    sections.push('{{context}}');
    sections.push('');
    sections.push('※ 上記の{{context}}には、以下の接続情報が自動的に展開されます：');
    connectedInputs.forEach((input) => {
      const kindLabel = 
        input.kind === 'product' ? '📦 製品' :
        input.kind === 'persona' ? '👤 ペルソナ' :
        input.kind === 'kb_item' ? '📚 ナレッジ' :
        input.kind === 'intent' ? '🎯 目的・意図' :
        '📄 その他';
      sections.push(`  - ${kindLabel}: ${input.title || input.label}`);
    });
  } else {
    sections.push('{{context}}');
    sections.push('');
    sections.push('※ {{context}}には、接続されたすべてのInputノード情報が自動的に展開されます。');
  }
  
  // 固定の出力形式指示は削除（ユーザーのSystem PromptやUser Prompt Templateに委ねる）
  
  return sections.join('\n');
}

/**
 * User Prompt Templateを自動生成（後方互換性のため残す）
 * @deprecated 代わりに generateUserPromptTemplateFromConnections を使用してください
 */
function generateUserPromptTemplate(options: {
  useContextPlaceholder?: boolean;
  includeIntent?: boolean;
  includeProduct?: boolean;
  includePersona?: boolean;
  includeKnowledge?: boolean;
}): string {
  return generateUserPromptTemplateFromConnections([]);
}
