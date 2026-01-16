'use client';

import { useEffect } from 'react';
import UnifiedLayout from '@/components/UnifiedLayout';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import WorkflowManagementPanel from '@/components/workflow/WorkflowManagementPanel';
import WorkflowCanvasWrapper from '@/components/workflow/WorkflowCanvasWrapper';
import WorkflowEditPanelV2 from '@/components/workflow/WorkflowEditPanelV2';
import WorkflowOutputDetailDrawer from '@/components/workflow/WorkflowOutputDetailDrawer';

/**
 * ワークフローページ
 */
export default function WorkflowPage() {
  const { loadWorkflows, loadAgentDefinitions, initializeAgents } = useWorkflowStore();
  
  // 初期化
  useEffect(() => {
    const init = async () => {
      try {
        // デフォルトエージェントを初期化（存在しない場合のみ作成）
        await initializeAgents();
        // エージェント定義を読み込む
        await loadAgentDefinitions();
      } catch (error) {
        console.error('Failed to initialize agents:', error);
      }
    };
    
    init();
    // ワークフロー一覧を読み込む
    loadWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行
  
  return (
    <UnifiedLayout>
      <div className="h-full flex overflow-x-hidden">
        {/* 左カラム：ワークフロー管理 */}
        <div className="border-r bg-white flex-shrink-0" style={{ width: '240px' }}>
          <WorkflowManagementPanel />
        </div>
        
        {/* 中央カラム：ワークフローキャンバス */}
        <div className="flex-1 overflow-hidden bg-gray-50 min-w-0">
          <WorkflowCanvasWrapper />
        </div>
        
        {/* 右カラム：編集・管理パネル */}
        <div className="border-l bg-white flex-shrink-0" style={{ width: '450px' }}>
          <WorkflowEditPanelV2 />
        </div>
      </div>
      
      {/* 成果物詳細Drawer（Step1） */}
      <WorkflowOutputDetailDrawer />
    </UnifiedLayout>
  );
}
