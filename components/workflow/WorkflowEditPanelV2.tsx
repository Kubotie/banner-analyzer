'use client';

import { useState, useEffect, useRef } from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { useProductStore } from '@/store/useProductStore';
import { WorkflowNode, InputNode, AgentNode, InputNodeKind, InputNodeData, ExecutionContext } from '@/types/workflow';
import { Package, Users, BookOpen, Bot, Plus, Trash2, Play, Edit2, X, Target } from 'lucide-react';
import InputReferenceSelector from './InputReferenceSelector';
import AgentNodeEditView from './AgentNodeEditView';
import AgentManagementPanel from './AgentManagementPanel';
import WorkflowRunList from './WorkflowRunList';

type TabType = 'input' | 'output' | 'runs' | 'node-edit';

/**
 * ワークフロー編集パネル（右カラム、Tabs構造）
 */
export default function WorkflowEditPanelV2() {
  const {
    activeWorkflow,
    agentDefinitions,
    selectedNode,
    addNode,
    updateNode,
    deleteNode,
    setSelectedNode,
    loadAgentDefinitions,
    connectionMode,
    connectingFrom,
    setConnectionMode,
  } = useWorkflowStore();
  
  const { products, loadProducts } = useProductStore();
  const [activeTab, setActiveTab] = useState<TabType>('input');
  const [newInputKind, setNewInputKind] = useState<InputNodeKind>('product');
  const [newAgentId, setNewAgentId] = useState<string>('');
  const [showInputSelector, setShowInputSelector] = useState(false);
  const [selectingInputNode, setSelectingInputNode] = useState<InputNode | null>(null);
  
  // 新規追加用の選択状態
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [availableItems, setAvailableItems] = useState<Array<{ id: string; title: string; type?: string; category?: string }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // 参照先の詳細データ
  const [referenceDetail, setReferenceDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // IME入力中かどうかを追跡（日本語入力時のカーソル位置保持のため）
  const isComposingRef = useRef<boolean>(false);
  
  // Intentノードの入力値をローカル状態で保持（カーソル位置保持のため）
  const [intentFormData, setIntentFormData] = useState<{
    goal: string;
    successCriteria: string;
    background: string;
    targetSituation: string;
    constraints: string;
    tone: string;
  } | null>(null);
  
  // ラベルのローカル状態
  const [labelValue, setLabelValue] = useState<string>('');
  
  // 選択中のノードが変更されたら、ローカル状態を初期化
  useEffect(() => {
    const inputNode = selectedNode?.type === 'input' ? selectedNode as InputNode : null;
    if (inputNode) {
      if (inputNode.kind === 'intent') {
        setIntentFormData({
          goal: inputNode.data?.intentPayload?.goal || '',
          successCriteria: inputNode.data?.intentPayload?.successCriteria || '',
          background: inputNode.data?.intentPayload?.background || '',
          targetSituation: inputNode.data?.intentPayload?.targetSituation || '',
          constraints: inputNode.data?.intentPayload?.constraints || '',
          tone: inputNode.data?.intentPayload?.tone || '',
        });
      } else {
        setIntentFormData(null);
      }
      setLabelValue(inputNode.label || '');
    } else {
      setIntentFormData(null);
      setLabelValue('');
    }
  }, [selectedNode?.id]); // selectedNode.idが変更された時のみ更新
  
  // タイプが変更されたら、選択可能なデータを読み込む
  useEffect(() => {
    const loadAvailableItems = async () => {
      setLoadingItems(true);
      setSelectedItemId(''); // タイプ変更時は選択をクリア
      setLoadError(null); // エラーをクリア
      
      try {
        if (newInputKind === 'product') {
          // 製品は既にproductsに読み込まれている
          const items = products.map((p) => ({
            id: p.productId,
            title: p.name,
            category: p.category,
          }));
          setAvailableItems(items);
          setLoadError(null);
        } else if (newInputKind === 'persona') {
          try {
            const response = await fetch('/api/kb/items?type=persona');
            if (!response.ok) {
              const errorText = await response.text();
              let errorMessage = `APIエラー (${response.status})`;
              try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
              } catch {
                errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}`;
              }
              throw new Error(errorMessage);
            }
            
            const data = await response.json();
            // agent_definitionタイプを除外
            const items = (data.items || [])
              .filter((item: any) => item.type !== 'agent_definition')
              .map((item: any) => ({
                id: item.kb_id,
                title: item.title,
                type: item.type,
              }));
            setAvailableItems(items);
            setLoadError(null);
          } catch (error) {
            console.error('Failed to load personas:', error);
            setAvailableItems([]);
            setLoadError(error instanceof Error ? error.message : 'ペルソナの読み込みに失敗しました');
          }
        } else if (newInputKind === 'knowledge') {
          // ナレッジベースアイテムを読み込む
          const types = ['insight', 'option', 'plan'];
          const allItems: any[] = [];
          const errors: string[] = [];
          
          for (const type of types) {
            try {
              const response = await fetch(`/api/kb/items?type=${type}`);
              if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `APIエラー (${response.status})`;
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson.error || errorJson.message || errorMessage;
                } catch {
                  errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}`;
                }
                errors.push(`${type}: ${errorMessage}`);
                continue; // このタイプはスキップして続行
              }
              
              const data = await response.json();
              // agent_definitionタイプを除外してからフィルタ
              const filtered = (data.items || [])
                .filter((item: any) => item.type !== 'agent_definition') // agent_definitionを除外
                .filter((item: any) => {
                  const payload = item.payload as any;
                  if (type === 'insight') {
                    return payload?.meta?.kb_type === 'market_insight' || 
                           payload?.meta?.kb_type === 'banner_insight' ||
                           payload?.meta?.kb_type === 'banner_auto_layout' ||
                           !payload?.meta;
                  } else if (type === 'option') {
                    return payload?.meta?.kb_type === 'strategy_option' || !payload?.meta;
                  } else if (type === 'plan') {
                    return payload?.meta?.kb_type === 'planning_hook' || !payload?.meta;
                  }
                  return true;
                });
              allItems.push(...filtered);
            } catch (error) {
              console.error(`Failed to load knowledge items (type: ${type}):`, error);
              errors.push(`${type}: ${error instanceof Error ? error.message : '読み込み失敗'}`);
            }
          }
          
          const items = allItems.map((item: any) => ({
            id: item.kb_id,
            title: item.title,
            type: item.type,
          }));
          setAvailableItems(items);
          
          if (errors.length > 0 && items.length === 0) {
            // すべてのタイプでエラーが発生し、アイテムが1つも取得できなかった場合
            setLoadError(`ナレッジの読み込みに失敗しました: ${errors.join(', ')}`);
          } else if (errors.length > 0) {
            // 一部のタイプでエラーが発生したが、アイテムは取得できた場合
            console.warn('一部のナレッジタイプの読み込みに失敗:', errors);
            setLoadError(null);
          } else {
            setLoadError(null);
          }
        }
      } catch (error) {
        console.error('Failed to load items:', error);
        setAvailableItems([]);
        setLoadError(error instanceof Error ? error.message : 'データの読み込みに失敗しました');
      } finally {
        setLoadingItems(false);
      }
    };
    
    loadAvailableItems();
  }, [newInputKind, products]);
  
  useEffect(() => {
    const initialize = async () => {
      console.log('[WorkflowEditPanel] Loading agent definitions...');
      await loadAgentDefinitions();
      loadProducts();
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行
  
  // エージェント定義が読み込まれたらログ出力
  useEffect(() => {
    console.log('[WorkflowEditPanel] Agent definitions updated:', agentDefinitions.length, agentDefinitions.map(a => a.id));
  }, [agentDefinitions]);
  
  // 前回のノードデータを保持（カーソル位置保持のため）
  const prevNodeDataRef = useRef<string>('');
  
  // ワークフローが変更された時、選択中のノードを更新
  useEffect(() => {
    if (activeWorkflow && selectedNode) {
      const updatedNode = activeWorkflow.nodes.find((n) => n.id === selectedNode.id);
      if (!updatedNode) {
        // ノードが削除された場合
        setSelectedNode(null);
        prevNodeDataRef.current = '';
      } else {
        // ノードが更新された場合、データが実際に変更された場合のみ更新
        // これにより、入力中のカーソル位置が保持される
        const currentDataString = JSON.stringify(updatedNode.data);
        if (prevNodeDataRef.current !== currentDataString) {
          // データが変更された場合のみ更新（参照の比較ではなく、データの比較）
          // ただし、ユーザーが入力中（onChange中）の場合は更新しない
          // これは、onChangeハンドラー内でupdateNodeを呼び出した直後は更新しない
          // IME入力中は更新をスキップ（日本語入力時のカーソル位置保持のため）
          if (isComposingRef.current) {
            return;
          }
          const timeoutId = setTimeout(() => {
            // IME入力中でないことを再確認
            if (!isComposingRef.current) {
              setSelectedNode(updatedNode);
              prevNodeDataRef.current = currentDataString;
            }
          }, 0);
          return () => clearTimeout(timeoutId);
        }
      }
    } else if (!activeWorkflow && selectedNode) {
      setSelectedNode(null);
      prevNodeDataRef.current = '';
    }
  }, [activeWorkflow, selectedNode, setSelectedNode]);
  
  // ノード選択時にタブを切り替え
  useEffect(() => {
    if (selectedNode) {
      if (selectedNode.type === 'input') {
        setActiveTab('node-edit');
      } else if (selectedNode.type === 'agent') {
        setActiveTab('node-edit');
      }
    }
  }, [selectedNode]);
  
  // Inputノードが選択された時、参照先の詳細データを読み込む
  useEffect(() => {
    const loadReferenceDetail = async () => {
      if (!activeWorkflow) {
        setReferenceDetail(null);
        return;
      }
      
      const inputNode = selectedNode?.type === 'input' ? selectedNode as InputNode : null;
      if (!inputNode?.data?.refId) {
        setReferenceDetail(null);
        return;
      }
      
      setLoadingDetail(true);
      try {
        if (inputNode.kind === 'product') {
          // 製品の場合はproductsから取得
          const product = products.find((p) => p.productId === inputNode.data?.refId);
          if (product) {
            setReferenceDetail({
              type: 'product',
              data: product,
            });
          } else {
            setReferenceDetail(null);
          }
        } else {
          // ペルソナまたはナレッジベースの場合はAPIから取得
          const response = await fetch(`/api/kb/items/${inputNode.data.refId}`);
          if (response.ok) {
            const data = await response.json();
            setReferenceDetail({
              type: inputNode.kind === 'persona' ? 'persona' : 'knowledge',
              data: data.item,
            });
          } else {
            setReferenceDetail(null);
          }
        }
      } catch (error) {
        console.error('Failed to load reference detail:', error);
        setReferenceDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    };
    
    loadReferenceDetail();
  }, [selectedNode, products, activeWorkflow]);
  
  // InputNodeを追加
  const handleAddInputNode = () => {
    if (!activeWorkflow) {
      alert('ワークフローが選択されていません');
      return;
    }
    
    // Intentノードの場合は参照先選択をスキップ
    if (newInputKind === 'intent') {
      const newNode: InputNode = {
        id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'input',
        kind: 'intent',
        label: '目的・意図',
        position: { x: 0, y: 0 },
        data: {
          inputKind: 'intent',
          intentPayload: {
            goal: '',
            successCriteria: '',
          },
        },
      };
      addNode(newNode);
      setSelectedNode(newNode);
      setActiveTab('node-edit');
      return;
    }
    
    if (!selectedItemId) {
      alert('参照先を選択してください');
      return;
    }
    
    let refKind: string | undefined;
    let title: string | undefined;
    
    if (newInputKind === 'product') {
      const product = products.find((p) => p.productId === selectedItemId);
      title = product?.name;
    } else {
      const item = availableItems.find((item) => item.id === selectedItemId);
      if (item) {
        title = item.title;
        if (newInputKind === 'knowledge') {
          refKind = item.type;
        }
      }
    }
    
    if (!title) {
      alert('参照先が見つかりません');
      return;
    }
    
    const newNode: InputNode = {
      id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'input',
      kind: newInputKind,
      label: title,
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50,
      },
      data: {
        inputKind: newInputKind === 'product' ? 'product' : newInputKind === 'persona' ? 'persona' : 'kb_item',
        refId: selectedItemId,
        refKind,
        title,
      },
    };
    
    addNode(newNode);
    setSelectedItemId(''); // 追加後は選択をクリア
  };
  
  // Input参照先を選択
  const handleInputReferenceSelect = (data: InputNodeData) => {
    alert('handleInputReferenceSelect: 実装中');
  };
  
  // AgentNodeを追加
  const handleAddAgentNode = () => {
    if (!newAgentId) {
      alert('エージェントを選択してください');
      return;
    }
    
    if (!activeWorkflow) {
      alert('ワークフローが選択されていません');
      return;
    }
    
    const selectedAgent = agentDefinitions.find((a) => a.id === newAgentId);
    if (!selectedAgent) {
      alert('選択したエージェントが見つかりません');
      return;
    }
    
    const newNode: AgentNode = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'agent',
      agentDefinitionId: selectedAgent.id,
      label: selectedAgent.name,
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50,
      },
      data: {
        agentId: selectedAgent.id,
        name: selectedAgent.name,
        status: 'idle',
      },
    };
    
    addNode(newNode);
    setNewAgentId(''); // 追加後は選択をクリア
  };
  
  // ノードを削除
  const handleDeleteNode = () => {
    if (!selectedNode) {
      return;
    }
    
    // 確認ダイアログ
    const nodeLabel = selectedNode.label || selectedNode.id;
    if (!confirm(`「${nodeLabel}」を削除しますか？`)) {
      return;
    }
    
    // ノードを削除
    deleteNode(selectedNode.id);
    
    // 選択をクリア
    setSelectedNode(null);
  };
  
  // エージェントを実行
  const handleExecuteAgent = async (node: AgentNode) => {
    if (!activeWorkflow) {
      alert('ワークフローが選択されていません');
      return;
    }
    
    // 接続されたInputNodeを取得
    const connectedInputIds = activeWorkflow.connections
      .filter((conn) => conn.toNodeId === node.id)
      .map((conn) => conn.fromNodeId);
    
    const connectedInputNodes = activeWorkflow.nodes
      .filter((n) => connectedInputIds.includes(n.id) && n.type === 'input')
      .map((n) => n as InputNode);
    
    if (connectedInputNodes.length === 0) {
      alert('接続されたInputノードがありません');
      return;
    }
    
    // ノードの状態を「実行中」に更新
    updateNode(node.id, {
      data: {
        ...node.data,
        agentId: node.data?.agentId || node.agentDefinitionId,
        status: 'running',
        executionStep: '初期化中...',
        lastError: undefined,
      },
    });
    
    try {
      // inputNodesのデータを準備
      const inputNodes = connectedInputNodes.map((inputNode) => ({
        inputKind: inputNode.data?.inputKind || 'product',
        refId: inputNode.data?.refId || '',
        refKind: inputNode.data?.refKind,
      }));
      
      // Step 3: ワークフロー全体を送信（DAGベース構築のため）
      // APIリクエスト
      let response: Response;
      try {
        response = await fetch('/api/workflow/execute-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflowId: activeWorkflow.id,
            agentNodeId: node.id,
            agentDefinitionId: node.agentDefinitionId,
            workflow: activeWorkflow, // Step 3: ワークフロー全体を送信
            inputNodes, // 後方互換性のため残す
            selectedLpRunId: node.data?.selectedLpRunId,
          }),
        });
      } catch (fetchError: any) {
        // ネットワークエラーやタイムアウトの場合
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          throw new Error(
            'エージェント実行のリクエストに失敗しました。\n\n' +
            '考えられる原因:\n' +
            '1. サーバーが起動していない可能性があります\n' +
            '2. ネットワーク接続に問題がある可能性があります\n' +
            '3. APIエンドポイントが正しく設定されていない可能性があります\n\n' +
            '開発サーバーを起動しているか確認してください。'
          );
        }
        throw fetchError;
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMessage = `APIエラー (${response.status})`;
        let errorDetails = '';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorJson.details?.error || errorMessage;
          errorDetails = errorJson.details || errorJson.stack || errorJson.errorName || '';
          // 詳細情報をコンソールに出力
          console.error('[WorkflowEditPanelV2] APIエラー詳細:', {
            status: response.status,
            error: errorMessage,
            errorName: errorJson.errorName,
            details: errorDetails,
            debug: errorJson.debug,
            fullError: errorJson,
          });
          // エラーメッセージに詳細を追加
          if (errorJson.errorName) {
            errorMessage = `[${errorJson.errorName}] ${errorMessage}`;
          }
          if (errorJson.details) {
            errorMessage += `\n\n詳細:\n${errorJson.details}`;
          }
          // フェーズ3: Step 4-3 - qualityCheckが存在する場合のみ処理
          if (errorJson && errorJson.qualityCheck) {
            const qualityErrors = errorJson.qualityCheck.errors || [];
            const qualityWarnings = errorJson.qualityCheck.warnings || [];
            if (qualityErrors.length > 0) {
              errorMessage += '\n\n品質チェックエラー:\n' + qualityErrors.join('\n');
            }
            if (qualityWarnings.length > 0) {
              errorMessage += '\n\n品質チェック警告:\n' + qualityWarnings.join('\n');
            }
          }
        } catch (parseError) {
          // JSONパースエラーの場合
          if (errorText.trim().length > 0 && !errorText.trim().startsWith('<!DOCTYPE')) {
            errorMessage = `${errorMessage}: ${errorText.substring(0, 500)}`;
          }
        }
        
        // エラー詳細をコンソールに出力（デバッグ用）
        console.error('[WorkflowEditPanelV2] APIエラー:', {
          status: response.status,
          errorMessage,
          errorText: errorText.substring(0, 1000), // 最初の1000文字
        });
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // 実行結果をノードに保存
      updateNode(node.id, {
        data: {
          ...node.data,
          agentId: node.data?.agentId || node.agentDefinitionId,
          status: 'success',
          executionStep: undefined,
          lastError: undefined,
        },
        executionResult: {
          output: result.output,
          executedAt: new Date().toISOString(),
        },
      });
      
      // 実行完了通知（ストアに通知）
      if (result.runId) {
        useWorkflowStore.getState().notifyRunCompleted(result.runId, activeWorkflow.id);
      }
    } catch (error: any) {
      console.error('エージェント実行エラー:', error);
      
      const errorMessage = error.message || 'エージェント実行に失敗しました';
      
      // エラー状態をノードに保存（実行ログにも記録）
      const currentLogs = node.data?.executionLogs || [];
      updateNode(node.id, {
        data: {
          ...node.data,
          agentId: node.data?.agentId || node.agentDefinitionId,
          status: 'error',
          executionStep: undefined,
          lastError: errorMessage,
          executionLogs: [
            ...currentLogs,
            {
              timestamp: new Date().toISOString(),
              level: 'error',
              message: `エラー: ${errorMessage}`,
              details: error.stack || error.toString(),
            },
          ],
        },
      });
      
      // エラーメッセージを表示（詳細は実行ログで確認可能）
      alert(`エージェント実行エラー\n\n${errorMessage}\n\n詳細は実行ログを確認してください。`);
    }
  };
  
  if (!activeWorkflow) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm p-4">
        ワークフローが選択されていません
      </div>
    );
  }
  
  const inputNodes = activeWorkflow.nodes.filter((n) => n.type === 'input') as InputNode[];
  const agentNodes = activeWorkflow.nodes.filter((n) => n.type === 'agent') as AgentNode[];
  const selectedInputNode = selectedNode?.type === 'input' ? selectedNode as InputNode : null;
  const selectedAgentNode = selectedNode?.type === 'agent' ? selectedNode as AgentNode : null;
  
  // 元のreturn JSXを復元（コメントアウト部分から）
  return (
    <div className="h-full flex flex-col overflow-hidden w-full">
      {/* ヘッダー */}
      <div className="p-4 border-b bg-white flex-shrink-0">
        <h3 className="text-lg font-bold">編集・管理</h3>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b bg-white flex-shrink-0">
        <button
          onClick={() => setActiveTab('input')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'input'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          入力
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'output'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          出力
        </button>
        <button
          onClick={() => setActiveTab('runs')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'runs'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          履歴・成果物
        </button>
        <button
          onClick={() => setActiveTab('node-edit')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'node-edit'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          編集
        </button>
      </div>
      
      {/* タブコンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'input' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Input（入力データ）</h4>
            </div>
            
            {/* タイプ選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">タイプを選択</label>
              <select
                value={newInputKind}
                onChange={(e) => setNewInputKind(e.target.value as InputNodeKind)}
                className="w-full px-2 py-1 text-sm border rounded"
              >
                <option value="intent">目的・意図</option>
                <option value="product">登録製品</option>
                <option value="persona">ペルソナ</option>
                <option value="knowledge">ナレッジベース</option>
              </select>
            </div>
            
            {/* エラーメッセージ */}
            {loadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                <div className="font-medium mb-1">エラー</div>
                <div>{loadError}</div>
              </div>
            )}
            
            {/* Intentノードの場合は参照先選択をスキップ */}
            {newInputKind === 'intent' ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <p className="font-medium mb-1">目的・意図ノード</p>
                <p className="text-xs">追加後、編集タブで目的・成功条件などを入力してください。</p>
              </div>
            ) : (
              <>
                {/* 選択可能なデータリスト */}
                {loadingItems ? (
                  <div className="text-center text-gray-500 py-8 text-sm">読み込み中...</div>
                ) : availableItems.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">参照先を選択</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
                      {availableItems.map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-2 p-3 border rounded cursor-pointer transition-colors ${
                            selectedItemId === item.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="inputItem"
                            value={item.id}
                            checked={selectedItemId === item.id}
                            onChange={(e) => setSelectedItemId(e.target.value)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.title}</div>
                            {item.category && (
                              <div className="text-xs text-gray-500">{item.category}</div>
                            )}
                            {item.type && (
                              <div className="text-xs text-gray-500">種別: {item.type}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : !loadError ? (
                  <div className="text-center text-gray-500 py-8 text-sm">
                    {newInputKind === 'product' && '製品が登録されていません'}
                    {newInputKind === 'persona' && 'ペルソナが登録されていません'}
                    {newInputKind === 'knowledge' && 'ナレッジが登録されていません'}
                  </div>
                ) : null}
              </>
            )}
            
            {/* 追加ボタン */}
            <button
              onClick={handleAddInputNode}
              disabled={(newInputKind !== 'intent' && !selectedItemId) || loadingItems}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
            
            {/* 既存のInputノード一覧 */}
            {inputNodes.length > 0 && (
              <div className="space-y-2 mt-6 pt-4 border-t">
                <label className="text-sm font-medium text-gray-700">追加済みのInputノード</label>
                <div className="space-y-2">
                  {inputNodes.map((node) => (
                    <div
                      key={node.id}
                      className={`p-3 border rounded cursor-pointer ${
                        selectedNode?.id === node.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedNode(node)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {node.kind === 'intent' && <Target className="w-4 h-4" />}
                        {node.kind === 'product' && <Package className="w-4 h-4" />}
                        {node.kind === 'persona' && <Users className="w-4 h-4" />}
                        {node.kind === 'knowledge' && <BookOpen className="w-4 h-4" />}
                        <span className="font-medium text-sm">{node.label}</span>
                      </div>
                      {node.kind === 'intent' ? (
                        <div className="text-xs text-gray-600 mt-1">
                          {node.data?.intentPayload?.goal ? (
                            <div className="line-clamp-2">{node.data.intentPayload.goal}</div>
                          ) : (
                            <div className="text-yellow-600">⚠️ 目的・成功条件が未入力です</div>
                          )}
                        </div>
                      ) : (
                        <>
                          {node.data?.title && (
                            <div className="text-xs text-gray-600 mt-1">
                              参照先: {node.data.title}
                            </div>
                          )}
                          {!node.data?.refId && (
                            <div className="text-xs text-yellow-600 mt-1">
                              ⚠️ 参照先が未選択です
                            </div>
                          )}
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectingInputNode(node);
                          setShowInputSelector(true);
                        }}
                        className="mt-2 text-xs text-blue-600 hover:underline"
                      >
                        {node.data?.refId ? '参照先を変更' : '参照先を選択'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'output' && (
          <div className="flex-1 overflow-auto">
            {/* エージェントノード管理 */}
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">エージェントノード</h4>
              <button
                onClick={handleAddAgentNode}
                disabled={!newAgentId}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                ノード追加
              </button>
            </div>
            
            <div className="space-y-2">
              {agentDefinitions.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <p className="font-medium mb-1">エージェント定義を読み込み中...</p>
                  <p className="mb-2">デフォルトエージェントが初期化されるまでお待ちください。</p>
                  <button
                    onClick={async () => {
                      console.log('[WorkflowEditPanel] Manual reload triggered');
                      await loadAgentDefinitions();
                    }}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    再読み込み
                  </button>
                </div>
              ) : (
                <>
                  {/* 重複警告（表示のみ、エージェント選択は可能） */}
                  {agentDefinitions.length > 3 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 mb-2">
                      <p className="font-medium mb-1">⚠️ 重複したエージェント定義が検出されました</p>
                      <p className="mb-2">エージェント数: {agentDefinitions.length}（期待値: 3）</p>
                      <button
                        onClick={async () => {
                          if (confirm('重複したエージェント定義をクリーンアップしますか？')) {
                            const { initializeDefaultAgents } = await import('@/lib/agent-definition-api');
                            await initializeDefaultAgents();
                            await loadAgentDefinitions();
                          }
                        }}
                        className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        重複をクリーンアップ
                      </button>
                    </div>
                  )}
                  
                  <select
                    value={newAgentId}
                    onChange={(e) => setNewAgentId(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                  >
                    <option value="">エージェントを選択</option>
                    {/* 重複を除去してから表示 */}
                    {(() => {
                      // 重複を除去（同じIDのエージェントは最初のもののみ）
                      const uniqueAgents = agentDefinitions.filter((agent, index, self) => 
                        self.findIndex(a => a.id === agent.id) === index
                      );
                      
                      // デフォルトエージェントを先に表示
                      const defaultAgents = uniqueAgents.filter(
                        (a) => a.id === 'lp-agent-default' || a.id === 'banner-agent-default'
                      );
                      const otherAgents = uniqueAgents.filter(
                        (a) => a.id !== 'lp-agent-default' && a.id !== 'banner-agent-default'
                      );
                      
                      return (
                        <>
                          {defaultAgents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              ⭐ {agent.name}
                            </option>
                          ))}
                          {otherAgents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}
                            </option>
                          ))}
                        </>
                      );
                    })()}
                  </select>
                  {newAgentId && (
                    <div className="text-xs text-gray-600 mt-1">
                      {(() => {
                        const selected = agentDefinitions.find((a) => a.id === newAgentId);
                        return selected ? (
                          <>
                            <div className="font-medium">{selected.description}</div>
                            {(selected.id === 'lp-agent-default' || selected.id === 'banner-agent-default') && (
                              <div className="text-blue-600 mt-1">✓ デフォルトエージェント</div>
                            )}
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="space-y-2">
              {agentNodes.map((node) => (
                <div
                  key={node.id}
                  className={`p-3 border rounded cursor-pointer ${
                    selectedNode?.id === node.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4" />
                    <span className="font-medium text-sm">{node.label}</span>
                    {node.data?.status === 'success' && (
                      <span className="ml-auto text-xs text-green-600">✓</span>
                    )}
                  </div>
                  {node.data?.status && (
                    <div className="text-xs text-gray-600 mt-1">
                      状態: {node.data.status}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* エージェント管理 */}
            <div className="mt-6 pt-4 border-t">
              <AgentManagementPanel
                agentDefinitions={agentDefinitions}
                onRefresh={loadAgentDefinitions}
                onSave={async (definition) => {
                  const { saveAgentDefinition } = await import('@/lib/agent-definition-api');
                  await saveAgentDefinition(definition);
                }}
                onDelete={async (id) => {
                  // TODO: エージェント削除APIを実装
                  alert('エージェント削除機能は実装中です');
                }}
                activeWorkflow={activeWorkflow}
                selectedAgentNodeId={selectedNode?.type === 'agent' ? selectedNode.id : null}
              />
            </div>
          </div>
          </div>
        )}
        
        {activeTab === 'runs' && (
          <div className="flex-1 overflow-auto">
            {/* Step4改: 統合Runs一覧（履歴・成果物） */}
            <WorkflowRunList 
              activeWorkflow={activeWorkflow} 
              agentNodeId={selectedAgentNode?.id || null}
            />
          </div>
        )}
        
        {activeTab === 'node-edit' && (
          <div className="p-4 space-y-4">
            {!selectedNode ? (
              <div className="text-center text-gray-500 py-8 space-y-3">
                <p className="font-medium">ノードを選択してください</p>
                <div className="text-xs text-left space-y-2 bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-700">使い方:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600">
                    <li>InputタブでInputノードを追加</li>
                    <li>Inputノードを選択して参照先を設定</li>
                    <li>OutputタブでAgentノードを追加</li>
                    <li>Inputノードを選択して「接続を開始」</li>
                    <li>Agentノードをクリックして接続</li>
                    <li>Agentノードを選択して「エージェントを実行」</li>
                  </ol>
                </div>
              </div>
            ) : selectedInputNode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Inputノード編集</h4>
                  <button
                    onClick={handleDeleteNode}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ラベル
                  </label>
                  <input
                    type="text"
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    onBlur={() => {
                      if (selectedInputNode && labelValue !== selectedInputNode.label) {
                        updateNode(selectedInputNode.id, { label: labelValue });
                      }
                    }}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                
                {/* Intentノードの編集UI */}
                {selectedInputNode.kind === 'intent' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        目的（必須）<span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={intentFormData?.goal || ''}
                        onChange={(e) => {
                          if (intentFormData) {
                            setIntentFormData({ ...intentFormData, goal: e.target.value });
                          }
                        }}
                        onBlur={() => {
                          if (selectedInputNode && intentFormData) {
                            const currentData = selectedInputNode.data || { inputKind: 'intent' };
                            const currentIntentPayload = currentData.intentPayload || {
                              goal: '',
                              successCriteria: '',
                            };
                            updateNode(selectedInputNode.id, {
                              data: {
                                ...currentData,
                                inputKind: 'intent',
                                intentPayload: {
                                  ...currentIntentPayload,
                                  goal: intentFormData.goal,
                                },
                              },
                            });
                          }
                        }}
                        placeholder="このワークフローで何を成立させるか（1〜3行）"
                        className="w-full px-2 py-1 text-sm border rounded min-h-[80px]"
                      />
                      {!intentFormData?.goal && (
                        <div className="text-xs text-yellow-600 mt-1">⚠️ 目的は必須です</div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        成功条件（必須）<span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={intentFormData?.successCriteria || ''}
                        onChange={(e) => {
                          if (intentFormData) {
                            setIntentFormData({ ...intentFormData, successCriteria: e.target.value });
                          }
                        }}
                        onBlur={() => {
                          if (selectedInputNode && intentFormData) {
                            const currentData = selectedInputNode.data || { inputKind: 'intent' };
                            const currentIntentPayload = currentData.intentPayload || {
                              goal: '',
                              successCriteria: '',
                            };
                            updateNode(selectedInputNode.id, {
                              data: {
                                ...currentData,
                                inputKind: 'intent',
                                intentPayload: {
                                  ...currentIntentPayload,
                                  successCriteria: intentFormData.successCriteria,
                                },
                              },
                            });
                          }
                        }}
                        placeholder="成功の条件を記述してください"
                        className="w-full px-2 py-1 text-sm border rounded min-h-[60px]"
                      />
                      {!intentFormData?.successCriteria && (
                        <div className="text-xs text-yellow-600 mt-1">⚠️ 成功条件は必須です</div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        背景（任意）
                      </label>
                      <textarea
                        value={intentFormData?.background || ''}
                        onChange={(e) => {
                          if (intentFormData) {
                            setIntentFormData({ ...intentFormData, background: e.target.value });
                          }
                        }}
                        onBlur={() => {
                          if (selectedInputNode && intentFormData) {
                            const currentData = selectedInputNode.data || { inputKind: 'intent' };
                            const currentIntentPayload = currentData.intentPayload || {
                              goal: '',
                              successCriteria: '',
                            };
                            updateNode(selectedInputNode.id, {
                              data: {
                                ...currentData,
                                inputKind: 'intent',
                                intentPayload: {
                                  ...currentIntentPayload,
                                  background: intentFormData.background,
                                },
                              },
                            });
                          }
                        }}
                        placeholder="背景情報（任意）"
                        className="w-full px-2 py-1 text-sm border rounded min-h-[60px]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        想定状況（任意）
                      </label>
                      <textarea
                        value={intentFormData?.targetSituation || ''}
                        onChange={(e) => {
                          if (intentFormData) {
                            setIntentFormData({ ...intentFormData, targetSituation: e.target.value });
                          }
                        }}
                        onBlur={() => {
                          if (selectedInputNode && intentFormData) {
                            const currentData = selectedInputNode.data || { inputKind: 'intent' };
                            const currentIntentPayload = currentData.intentPayload || {
                              goal: '',
                              successCriteria: '',
                            };
                            updateNode(selectedInputNode.id, {
                              data: {
                                ...currentData,
                                inputKind: 'intent',
                                intentPayload: {
                                  ...currentIntentPayload,
                                  targetSituation: intentFormData.targetSituation,
                                },
                              },
                            });
                          }
                        }}
                        placeholder="想定する状況（任意）"
                        className="w-full px-2 py-1 text-sm border rounded min-h-[60px]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        制約/NG（任意）
                      </label>
                      <textarea
                        value={intentFormData?.constraints || ''}
                        onChange={(e) => {
                          if (intentFormData) {
                            setIntentFormData({ ...intentFormData, constraints: e.target.value });
                          }
                        }}
                        onBlur={() => {
                          if (selectedInputNode && intentFormData) {
                            const currentData = selectedInputNode.data || { inputKind: 'intent' };
                            const currentIntentPayload = currentData.intentPayload || {
                              goal: '',
                              successCriteria: '',
                            };
                            updateNode(selectedInputNode.id, {
                              data: {
                                ...currentData,
                                inputKind: 'intent',
                                intentPayload: {
                                  ...currentIntentPayload,
                                  constraints: intentFormData.constraints,
                                },
                              },
                            });
                          }
                        }}
                        placeholder="避けるべきこと、制約事項（任意）"
                        className="w-full px-2 py-1 text-sm border rounded min-h-[60px]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        トーン（任意）
                      </label>
                      <input
                        type="text"
                        value={intentFormData?.tone || ''}
                        onChange={(e) => {
                          if (intentFormData) {
                            setIntentFormData({ ...intentFormData, tone: e.target.value });
                          }
                        }}
                        onBlur={() => {
                          if (selectedInputNode && intentFormData) {
                            const currentData = selectedInputNode.data || { inputKind: 'intent' };
                            const currentIntentPayload = currentData.intentPayload || {
                              goal: '',
                              successCriteria: '',
                            };
                            updateNode(selectedInputNode.id, {
                              data: {
                                ...currentData,
                                inputKind: 'intent',
                                intentPayload: {
                                  ...currentIntentPayload,
                                  tone: intentFormData.tone,
                                },
                              },
                            });
                          }
                        }}
                        placeholder="例: 親しみやすい、専門的、など"
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      参照先
                    </label>
                    {selectedInputNode.data?.refId ? (
                    <div className="space-y-3">
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{selectedInputNode.data.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          ID: {selectedInputNode.data.refId}
                        </div>
                        <button
                          onClick={() => {
                            setSelectingInputNode(selectedInputNode);
                            setShowInputSelector(true);
                          }}
                          className="mt-2 text-xs text-blue-600 hover:underline"
                        >
                          変更
                        </button>
                      </div>
                      
                      {/* 参照先の詳細情報 */}
                      {loadingDetail ? (
                        <div className="p-3 bg-gray-50 rounded text-xs text-gray-500 text-center">
                          読み込み中...
                        </div>
                      ) : referenceDetail ? (
                        <div className="p-3 bg-white border rounded space-y-3">
                          {referenceDetail.type === 'persona' && referenceDetail.data?.payload?.type === 'persona' && (
                            <>
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">1行要約</div>
                                <div className="text-sm text-gray-900">
                                  {referenceDetail.data.payload.summary || '-'}
                                </div>
                              </div>
                              {referenceDetail.data.payload.story && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">背景ストーリー</div>
                                  <div className="text-sm text-gray-900">
                                    {referenceDetail.data.payload.story}
                                  </div>
                                </div>
                              )}
                              {referenceDetail.data.payload.proxy_structure && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">代理購入構造</div>
                                  <div className="text-xs text-gray-700 space-y-1">
                                    <div>誰の課題: {referenceDetail.data.payload.proxy_structure.whose_problem || '-'}</div>
                                    <div>誰が解決: {referenceDetail.data.payload.proxy_structure.who_solves || '-'}</div>
                                    <div>どう解決: {referenceDetail.data.payload.proxy_structure.how || '-'}</div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          {referenceDetail.type === 'knowledge' && referenceDetail.data && (
                            <div className="space-y-3">
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">種別</div>
                                <div className="text-sm text-gray-900">
                                  {referenceDetail.data.type || '-'}
                                </div>
                              </div>
                              
                              {/* ナレッジベースの詳細情報 */}
                              {referenceDetail.data.payload && (
                                <>
                                  {/* MarketInsight/StrategyOption/PlanningHookタイプ */}
                                  {typeof referenceDetail.data.payload === 'object' && 
                                   'meta' in referenceDetail.data.payload && 
                                   'payload' in referenceDetail.data.payload && (
                                    <>
                                      {(() => {
                                        const payload = referenceDetail.data.payload as any;
                                        const meta = payload.meta;
                                        const payloadData = payload.payload;
                                        const kind = payload._kind || 
                                          (referenceDetail.data.type === 'insight' ? 'market_insight' : 
                                           referenceDetail.data.type === 'option' ? 'strategy_option' : 
                                           'planning_hook');
                                        
                                        const typeLabel = kind === 'market_insight' ? '市場インサイト' : 
                                                         kind === 'strategy_option' ? '戦略オプション' : 
                                                         '企画フック';
                                        
                                        return (
                                          <>
                                            <div>
                                              <div className="text-xs font-medium text-gray-600 mb-1">KBタイプ</div>
                                              <div className="text-sm text-gray-900">{typeLabel}</div>
                                            </div>
                                            
                                            {payloadData?.summary && (
                                              <div>
                                                <div className="text-xs font-medium text-gray-600 mb-1">サマリー</div>
                                                <div className="text-sm text-gray-900">{payloadData.summary}</div>
                                              </div>
                                            )}
                                            
                                            {payloadData?.insights && Array.isArray(payloadData.insights) && payloadData.insights.length > 0 && (
                                              <div>
                                                <div className="text-xs font-medium text-gray-600 mb-1">インサイト数</div>
                                                <div className="text-sm text-gray-900">{payloadData.insights.length}件</div>
                                              </div>
                                            )}
                                            
                                            {kind === 'planning_hook' && payloadData?.hooks && Array.isArray(payloadData.hooks) && payloadData.hooks.length > 0 && (
                                              <div>
                                                <div className="text-xs font-medium text-gray-600 mb-1">企画フック数</div>
                                                <div className="text-sm text-gray-900">{payloadData.hooks.length}件</div>
                                              </div>
                                            )}
                                            
                                            {meta?.confidence !== undefined && (
                                              <div>
                                                <div className="text-xs font-medium text-gray-600 mb-1">信頼度</div>
                                                <div className="text-sm text-gray-900">{(meta.confidence * 100).toFixed(0)}%</div>
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </>
                                  )}
                                </>
                              )}
                              
                              {referenceDetail.data.updated_at && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">更新日時</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(referenceDetail.data.updated_at).toLocaleString('ja-JP')}
                                  </div>
                                </div>
                              )}
                              
                              {referenceDetail.data.created_at && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">作成日時</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(referenceDetail.data.created_at).toLocaleString('ja-JP')}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {referenceDetail.type === 'product' && referenceDetail.data && (
                            <div className="space-y-3">
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">製品名</div>
                                <div className="text-sm text-gray-900 font-medium">
                                  {referenceDetail.data.name}
                                </div>
                              </div>
                              
                              {referenceDetail.data.category && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">カテゴリ</div>
                                  <div className="text-sm text-gray-900">
                                    {referenceDetail.data.category}
                                  </div>
                                </div>
                              )}
                              
                              {referenceDetail.data.description && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">説明</div>
                                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                                    {referenceDetail.data.description}
                                  </div>
                                </div>
                              )}
                              
                              {referenceDetail.data.competitors && referenceDetail.data.competitors.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">競合</div>
                                  <div className="space-y-1">
                                    {referenceDetail.data.competitors.map((competitor: any, idx: number) => (
                                      <div key={idx} className="text-sm text-gray-900">
                                        • {competitor.name}
                                        {competitor.url && (
                                          <span className="text-xs text-gray-500 ml-2">({competitor.url})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {referenceDetail.data.updatedAt && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">更新日時</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(referenceDetail.data.updatedAt).toLocaleString('ja-JP')}
                                  </div>
                                </div>
                              )}
                              
                              {referenceDetail.data.createdAt && (
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">作成日時</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(referenceDetail.data.createdAt).toLocaleString('ja-JP')}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectingInputNode(selectedInputNode);
                        setShowInputSelector(true);
                      }}
                      className="w-full px-3 py-2 border border-dashed rounded text-sm text-gray-600 hover:bg-gray-50"
                    >
                      参照先を選択
                    </button>
                  )}
                </div>
                )}
              </div>
            ) : selectedAgentNode ? (
              <AgentNodeEditView
                agentNode={selectedAgentNode}
                activeWorkflow={activeWorkflow}
                agentDefinitions={agentDefinitions}
                updateNode={updateNode}
                deleteNode={handleDeleteNode}
                connectionMode={connectionMode}
                setConnectionMode={setConnectionMode}
                onExecute={handleExecuteAgent}
              />
            ) : null}
          </div>
        )}
      </div>
      
      {/* Input参照先選択モーダル */}
      {showInputSelector && selectingInputNode && selectingInputNode.kind !== 'intent' && (
        <InputReferenceSelector
          inputKind={selectingInputNode.kind === 'knowledge' ? 'kb_item' : selectingInputNode.kind === 'product' ? 'product' : 'persona'}
          currentData={selectingInputNode.data}
          onSelect={handleInputReferenceSelect}
          onCancel={() => {
            setShowInputSelector(false);
            setSelectingInputNode(null);
          }}
        />
      )}
    </div>
  );
}
