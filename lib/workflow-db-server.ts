/**
 * ワークフロー永続層（サーバーサイド用、ファイルシステムベース）
 * API Routesから使用
 * 
 * 注意: クライアントサイドのlocalStorageと同期する必要がある場合は、
 * クライアントからワークフロー全体をPOST bodyで送るか、API経由で取得する必要があります。
 * 現在は、クライアントからワークフロー全体を送る方式を想定しています。
 */

import { Workflow } from '@/types/workflow';
import { promises as fs } from 'fs';
import path from 'path';

// データファイルのパス
const DATA_DIR = path.join(process.cwd(), '.data');
const WORKFLOW_FILE = path.join(DATA_DIR, 'workflows.json');

// データを読み込む
async function loadData(): Promise<Workflow[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(WORKFLOW_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('[workflow-db-server] Failed to load data:', error);
    return [];
  }
}

/**
 * ワークフローを取得（サーバーサイド用）
 * 注意: クライアントサイドのlocalStorageと同期していない可能性があります。
 * より確実な方法は、クライアントからワークフロー全体をPOST bodyで送ることです。
 */
export async function getWorkflow(workflowId: string): Promise<Workflow | null> {
  try {
    const workflows = await loadData();
    return workflows.find((w) => w.id === workflowId) || null;
  } catch (error) {
    console.error('[workflow-db-server] Failed to get workflow:', error);
    return null;
  }
}
