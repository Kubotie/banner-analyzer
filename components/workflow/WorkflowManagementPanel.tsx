'use client';

import { useState } from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { Plus, Copy, Trash2, Edit2, Check, X } from 'lucide-react';

/**
 * ワークフロー管理パネル（左カラム）
 */
export default function WorkflowManagementPanel() {
  const {
    workflows,
    activeWorkflow,
    createWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    setActiveWorkflow,
  } = useWorkflowStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const handleCreate = () => {
    const newWorkflow = createWorkflow('新しいワークフロー');
    setActiveWorkflow(newWorkflow.id);
    setEditingId(newWorkflow.id);
    setEditingName(newWorkflow.name);
  };
  
  const handleDuplicate = (workflowId: string) => {
    duplicateWorkflow(workflowId);
  };
  
  const handleDelete = (workflowId: string) => {
    if (!confirm('このワークフローを削除しますか？')) return;
    deleteWorkflow(workflowId);
    if (activeWorkflow?.id === workflowId) {
      setActiveWorkflow(null);
    }
  };
  
  const handleStartEdit = (workflow: { id: string; name: string }) => {
    setEditingId(workflow.id);
    setEditingName(workflow.name);
  };
  
  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    
    const workflow = workflows.find((w) => w.id === editingId);
    if (workflow) {
      const { updateWorkflow } = useWorkflowStore.getState();
      updateWorkflow({ ...workflow, name: editingName.trim() });
    }
    
    setEditingId(null);
    setEditingName('');
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold mb-3">ワークフロー</h2>
        <button
          onClick={handleCreate}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          新規作成
        </button>
      </div>
      
      {/* ワークフロー一覧 */}
      <div className="flex-1 overflow-y-auto p-2">
        {workflows.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            ワークフローがありません
            <br />
            「新規作成」から作成してください
          </div>
        ) : (
          <div className="space-y-1">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  activeWorkflow?.id === workflow.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => setActiveWorkflow(workflow.id)}
              >
                {editingId === workflow.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit();
                      }}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{workflow.name}</div>
                        <div className="text-xs text-gray-500">
                          {workflow.nodes.length}ノード
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(workflow);
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          title="編集"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(workflow.id);
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          title="複製"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(workflow.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="削除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
