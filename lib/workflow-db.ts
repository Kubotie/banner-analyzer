/**
 * ワークフロー永続層（localStorageベース）
 */

import { Workflow } from '@/types/workflow';

const STORAGE_KEY = 'workflows';
const ACTIVE_WORKFLOW_KEY = 'active_workflow_id';

/**
 * ワークフロー一覧を取得
 */
export function getWorkflows(): Workflow[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load workflows:', error);
    return [];
  }
}

/**
 * ワークフローを保存
 */
export function saveWorkflow(workflow: Workflow): Workflow {
  if (typeof window === 'undefined') return workflow;

  try {
    const workflows = getWorkflows();
    const index = workflows.findIndex((w) => w.id === workflow.id);
    
    if (index >= 0) {
      workflows[index] = workflow;
    } else {
      workflows.push(workflow);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    return workflow;
  } catch (error) {
    console.error('Failed to save workflow:', error);
    throw error;
  }
}

/**
 * ワークフローを削除
 */
export function deleteWorkflow(workflowId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const workflows = getWorkflows();
    const filtered = workflows.filter((w) => w.id !== workflowId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // アクティブワークフローが削除された場合はクリア
    const activeId = getActiveWorkflowId();
    if (activeId === workflowId) {
      setActiveWorkflowId(null);
    }
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    throw error;
  }
}

/**
 * ワークフローを取得
 */
export function getWorkflow(workflowId: string): Workflow | null {
  if (typeof window === 'undefined') return null;

  try {
    const workflows = getWorkflows();
    return workflows.find((w) => w.id === workflowId) || null;
  } catch (error) {
    console.error('Failed to get workflow:', error);
    return null;
  }
}

/**
 * アクティブワークフローIDを取得
 */
export function getActiveWorkflowId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(ACTIVE_WORKFLOW_KEY);
  } catch (error) {
    console.error('Failed to get active workflow ID:', error);
    return null;
  }
}

/**
 * アクティブワークフローIDを設定
 */
export function setActiveWorkflowId(workflowId: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    if (workflowId) {
      localStorage.setItem(ACTIVE_WORKFLOW_KEY, workflowId);
    } else {
      localStorage.removeItem(ACTIVE_WORKFLOW_KEY);
    }
  } catch (error) {
    console.error('Failed to set active workflow ID:', error);
    throw error;
  }
}
