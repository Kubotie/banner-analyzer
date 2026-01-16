'use client';

import { useEffect } from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import WorkflowCanvas from './WorkflowCanvas';

/**
 * WorkflowCanvasのラッパー（接続モード管理）
 */
export default function WorkflowCanvasWrapper() {
  const { connectionMode, connectingFrom, setConnectionMode } = useWorkflowStore();
  
  // Escapeキーで接続モードをキャンセル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && connectionMode) {
        setConnectionMode(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectionMode, setConnectionMode]);
  
  return (
    <WorkflowCanvas
      connectionMode={connectionMode}
      connectingFrom={connectingFrom}
      onConnectionComplete={() => {
        setConnectionMode(false);
      }}
    />
  );
}
