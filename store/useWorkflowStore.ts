/**
 * ワークフロー管理ストア（Zustand）
 */

import { create } from 'zustand';
import { Workflow, WorkflowNode, WorkflowConnection, AgentDefinition } from '@/types/workflow';
import { getWorkflows, saveWorkflow, deleteWorkflow, getWorkflow, getActiveWorkflowId, setActiveWorkflowId } from '@/lib/workflow-db';
import { getAgentDefinitions, initializeDefaultAgents } from '@/lib/agent-definition-api';

interface WorkflowStore {
  // ワークフロー一覧
  workflows: Workflow[];
  
  // アクティブワークフロー
  activeWorkflow: Workflow | null;
  
  // エージェント定義一覧
  agentDefinitions: AgentDefinition[];
  
  // 選択中のノード（編集用）
  selectedNode: WorkflowNode | null;
  
  // 接続モード
  connectionMode: boolean;
  connectingFrom: string | null;
  
  // Actions: ワークフロー
  loadWorkflows: () => void;
  createWorkflow: (name: string) => Workflow;
  updateWorkflow: (workflow: Workflow) => void;
  deleteWorkflow: (workflowId: string) => void;
  duplicateWorkflow: (workflowId: string) => Workflow;
  setActiveWorkflow: (workflowId: string | null) => void;
  
  // Actions: ノード
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNode: (node: WorkflowNode | null) => void;
  
  // Actions: 接続
  canConnect: (fromNodeId: string, toNodeId: string) => { allowed: boolean; reason?: string };
  hasCycle: (fromNodeId: string, toNodeId: string) => boolean;
  addConnection: (fromNodeId: string, toNodeId: string) => void;
  deleteConnection: (connectionId: string) => void;
  setConnectionMode: (enabled: boolean, fromNodeId?: string | null) => void;
  
  // Actions: エージェント定義
  loadAgentDefinitions: () => Promise<void>;
  initializeAgents: () => Promise<void>;
  
  // Actions: 実行完了通知（フェーズ0: store push方式）
  notifyRunCompleted: (runId: string, workflowId: string) => void;
  
  // ノードの位置情報（Canvas計測用）
  nodeRects: Map<string, { x: number; y: number; w: number; h: number }>;
  measureNodeRect: (nodeId: string, rect: { x: number; y: number; w: number; h: number }) => void;
  
  // 成果物詳細Drawer（Step1）
  selectedRunId: string | null;
  isRunDrawerOpen: boolean;
  openRunDrawer: (runId: string) => void;
  closeRunDrawer: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: [],
  activeWorkflow: null,
  agentDefinitions: [],
  selectedNode: null,
  connectionMode: false,
  connectingFrom: null,
  nodeRects: new Map(),
  selectedRunId: null,
  isRunDrawerOpen: false,
  
  // ワークフロー一覧を読み込む
  loadWorkflows: () => {
    const workflows = getWorkflows();
    const activeId = getActiveWorkflowId();
    const activeWorkflow = activeId ? workflows.find((w) => w.id === activeId) || null : null;
    
    set({ workflows, activeWorkflow });
  },
  
  // ワークフローを作成
  createWorkflow: (name: string) => {
    const now = new Date().toISOString();
    
    // 空のワークフローを作成（デフォルトテンプレートなし）
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: '',
      nodes: [],
      connections: [],
      createdAt: now,
      updatedAt: now,
      isActive: false,
    };
    
    const saved = saveWorkflow(newWorkflow);
    const workflows = getWorkflows();
    set({ workflows, activeWorkflow: saved });
    return saved;
  },
  
  // ワークフローを更新
  updateWorkflow: (workflow: Workflow) => {
    const updated = {
      ...workflow,
      updatedAt: new Date().toISOString(),
    };
    saveWorkflow(updated);
    
    const workflows = getWorkflows();
    const activeWorkflow = get().activeWorkflow?.id === updated.id ? updated : get().activeWorkflow;
    set({ workflows, activeWorkflow });
  },
  
  // ワークフローを削除
  deleteWorkflow: (workflowId: string) => {
    deleteWorkflow(workflowId);
    const workflows = getWorkflows();
    const activeWorkflow = get().activeWorkflow?.id === workflowId ? null : get().activeWorkflow;
    set({ workflows, activeWorkflow });
  },
  
  // ワークフローを複製
  duplicateWorkflow: (workflowId: string) => {
    const original = getWorkflow(workflowId);
    if (!original) throw new Error('Workflow not found');
    
    const now = new Date().toISOString();
    const duplicated: Workflow = {
      ...original,
      id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${original.name} (コピー)`,
      nodes: original.nodes.map((node) => ({
        ...node,
        id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      connections: [], // 接続は一旦クリア（必要に応じて再設定）
      createdAt: now,
      updatedAt: now,
      isActive: false,
    };
    
    const saved = saveWorkflow(duplicated);
    const workflows = getWorkflows();
    set({ workflows });
    return saved;
  },
  
  // アクティブワークフローを設定
  setActiveWorkflow: (workflowId: string | null) => {
    setActiveWorkflowId(workflowId);
    const workflows = getWorkflows();
    const activeWorkflow = workflowId ? workflows.find((w) => w.id === workflowId) || null : null;
    // ワークフローを切り替えた時は選択中のノードをクリア
    set({ activeWorkflow, selectedNode: null });
  },
  
  // ノードを追加
  addNode: (node: WorkflowNode) => {
    const { activeWorkflow } = get();
    if (!activeWorkflow) return;
    
    const updated = {
      ...activeWorkflow,
      nodes: [...activeWorkflow.nodes, node],
      updatedAt: new Date().toISOString(),
    };
    
    get().updateWorkflow(updated);
  },
  
  // ノードを更新
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => {
    const { activeWorkflow } = get();
    if (!activeWorkflow) return;
    
    const updated = {
      ...activeWorkflow,
      nodes: activeWorkflow.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
      updatedAt: new Date().toISOString(),
    };
    
    get().updateWorkflow(updated);
  },
  
  // ノードを削除
  deleteNode: (nodeId: string) => {
    const { activeWorkflow } = get();
    if (!activeWorkflow) return;
    
    const updated = {
      ...activeWorkflow,
      nodes: activeWorkflow.nodes.filter((node) => node.id !== nodeId),
      connections: activeWorkflow.connections.filter(
        (conn) => conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId
      ),
      updatedAt: new Date().toISOString(),
    };
    
    get().updateWorkflow(updated);
  },
  
  // 選択中のノードを設定
  setSelectedNode: (node: WorkflowNode | null) => {
    set({ selectedNode: node });
  },
  
  // Step 1: 接続可能かどうかを判定（Input同士の接続を許可、循環参照のみ禁止）
  canConnect: (fromNodeId: string, toNodeId: string): { allowed: boolean; reason?: string } => {
    const { activeWorkflow } = get();
    if (!activeWorkflow) return { allowed: false, reason: 'ワークフローが選択されていません' };
    
    const fromNode = activeWorkflow.nodes.find((n) => n.id === fromNodeId);
    const toNode = activeWorkflow.nodes.find((n) => n.id === toNodeId);
    
    if (!fromNode || !toNode) {
      return { allowed: false, reason: 'ノードが見つかりません' };
    }
    
    // 同じノードへの接続は禁止
    if (fromNodeId === toNodeId) {
      return { allowed: false, reason: '同じノードへの接続はできません' };
    }
    
    const fromType = fromNode.type;
    const toType = toNode.type;
    
    // agent -> input は禁止（循環の温床）
    if (fromType === 'agent' && toType === 'input') {
      return { allowed: false, reason: 'エージェントから入力ノードへの接続は禁止されています（循環参照の原因となるため）' };
    }
    
    // Step 1: Input同士の接続はすべて許可（実行時に役割順で整理されるため）
    // InputNode → InputNode: すべて許可
    if (fromType === 'input' && toType === 'input') {
      return { allowed: true };
    }
    
    // InputNode → AgentNode: 許可
    if (fromType === 'input' && toType === 'agent') {
      return { allowed: true };
    }
    
    // AgentNode → AgentNode: 許可
    if (fromType === 'agent' && toType === 'agent') {
      return { allowed: true };
    }
    
    // その他のパターンは禁止
    return { allowed: false, reason: 'この接続パターンは許可されていません' };
  },
  
  // Step 2-2: サイクル（循環）検出（DAGチェック）
  hasCycle: (fromNodeId: string, toNodeId: string): boolean => {
    const { activeWorkflow } = get();
    if (!activeWorkflow) return false;
    
    // 新しい接続を追加した場合にサイクルができるかチェック
    const testConnections = [...activeWorkflow.connections, { fromNodeId, toNodeId } as WorkflowConnection];
    
    // DFSでサイクル検出
    const visited = new Set<string>();
    const recStack = new Set<string>();
    
    const dfs = (nodeId: string): boolean => {
      if (recStack.has(nodeId)) {
        return true; // サイクル検出
      }
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recStack.add(nodeId);
      
      // このノードから出る接続を取得
      const outgoing = testConnections.filter((conn) => conn.fromNodeId === nodeId);
      for (const conn of outgoing) {
        if (dfs(conn.toNodeId)) {
          return true;
        }
      }
      
      recStack.delete(nodeId);
      return false;
    };
    
    // すべてのノードからDFSを実行
    for (const node of activeWorkflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }
    
    return false;
  },
  
  // 接続を追加
  addConnection: (fromNodeId: string, toNodeId: string) => {
    const { activeWorkflow } = get();
    if (!activeWorkflow) {
      alert('ワークフローが選択されていません');
      return;
    }
    
    // Step 1: 接続ルールチェック
    const canConnectResult = get().canConnect(fromNodeId, toNodeId);
    if (!canConnectResult.allowed) {
      // Step 5: UI改善 - 接続不可理由を日本語で表示
      alert(`接続できません\n\n理由: ${canConnectResult.reason || '不明な理由'}`);
      return;
    }
    
    // Step 1: サイクルチェック（循環参照のみ禁止）
    if (get().hasCycle(fromNodeId, toNodeId)) {
      // Step 5: UI改善 - 循環参照の理由を明確に表示
      alert('接続できません\n\n理由: この接続を追加すると循環参照（サイクル）が発生します。\nワークフローは有向非巡回グラフ（DAG）である必要があります。');
      return;
    }
    
    // 既存の接続をチェック
    const exists = activeWorkflow.connections.some(
      (conn) => conn.fromNodeId === fromNodeId && conn.toNodeId === toNodeId
    );
    if (exists) {
      alert('この接続は既に存在します');
      return;
    }
    
    const newConnection: WorkflowConnection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromNodeId,
      toNodeId,
    };
    
    const updated = {
      ...activeWorkflow,
      connections: [...activeWorkflow.connections, newConnection],
      updatedAt: new Date().toISOString(),
    };
    
    get().updateWorkflow(updated);
  },
  
  // 接続を削除
  deleteConnection: (connectionId: string) => {
    const { activeWorkflow } = get();
    if (!activeWorkflow) return;
    
    const updated = {
      ...activeWorkflow,
      connections: activeWorkflow.connections.filter((conn) => conn.id !== connectionId),
      updatedAt: new Date().toISOString(),
    };
    
    get().updateWorkflow(updated);
  },
  
  // 接続モードを設定
  setConnectionMode: (enabled: boolean, fromNodeId?: string | null) => {
    set({
      connectionMode: enabled,
      connectingFrom: enabled ? (fromNodeId || null) : null,
    });
  },
  
  // エージェント定義を読み込む
  loadAgentDefinitions: async () => {
    // フェーズ3: ログ出力を抑制（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('[WorkflowStore] Loading agent definitions...');
    }
    const definitions = await getAgentDefinitions();
    if (process.env.NODE_ENV === 'development') {
      console.log('[WorkflowStore] Loaded', definitions.length, 'agent definitions');
    }
    set({ agentDefinitions: definitions });
  },
  
  // デフォルトエージェントを初期化
  initializeAgents: async () => {
    // フェーズ3: ログ出力を抑制（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('[WorkflowStore] Initializing agents...');
    }
    await initializeDefaultAgents();
    if (process.env.NODE_ENV === 'development') {
      console.log('[WorkflowStore] Agents initialized, reloading definitions...');
    }
    await get().loadAgentDefinitions();
    if (process.env.NODE_ENV === 'development') {
      console.log('[WorkflowStore] Agent definitions reloaded');
    }
  },
  
  // 実行完了通知（フェーズ0: store push方式）
  notifyRunCompleted: (runId: string, workflowId: string) => {
    console.debug('[WorkflowStore] Run completed:', { runId, workflowId });
    // 現時点ではログのみ。将来的にOutput/Historyコンポーネントがsubscribeする
    // 現時点では、コンポーネント側でOutputタブを開いた時に再読み込みする
  },
  
  // ノードの位置情報を計測・保存（Canvas用）
  measureNodeRect: (nodeId: string, rect: { x: number; y: number; w: number; h: number }) => {
    const currentRects = new Map(get().nodeRects);
    currentRects.set(nodeId, rect);
    set({ nodeRects: currentRects });
  },
  
  // 成果物詳細Drawerを開く（Step1）
  openRunDrawer: (runId: string) => {
    set({ selectedRunId: runId, isRunDrawerOpen: true });
  },
  
  // 成果物詳細Drawerを閉じる（Step1）
  closeRunDrawer: () => {
    set({ isRunDrawerOpen: false, selectedRunId: null });
  },
}));
