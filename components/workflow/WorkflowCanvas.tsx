'use client';

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { WorkflowNode, InputNode, AgentNode } from '@/types/workflow';
import { Package, Users, BookOpen, Bot, Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * ワークフローキャンバス（中央カラム）
 * ノード配置と接続の視覚化
 */
interface WorkflowCanvasProps {
  connectionMode?: boolean;
  connectingFrom?: string | null;
  onConnectionComplete?: () => void;
}

export default function WorkflowCanvas({
  connectionMode = false,
  connectingFrom = null,
  onConnectionComplete,
}: WorkflowCanvasProps) {
  const {
    activeWorkflow,
    updateNode,
    setSelectedNode,
    selectedNode,
    addConnection,
    deleteConnection,
    canConnect,
  } = useWorkflowStore();
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // storeからノードの位置情報を取得（フェーズ0: nodeRects方式）
  const nodeRects = useWorkflowStore((state) => state.nodeRects);
  const measureNodeRect = useWorkflowStore((state) => state.measureNodeRect);
  
  // 接続ドラッグ関連の状態
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [draggingConnection, setDraggingConnection] = useState<{
    fromNodeId: string;
    fromPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
    fromSide?: 'top' | 'right' | 'bottom' | 'left';
  } | null>(null);
  
  // アクティブワークフローのノードと接続を取得
  const workflowNodes = activeWorkflow?.nodes || [];
  const workflowConnections = activeWorkflow?.connections || [];
  
  // ノードの位置情報を計測（useLayoutEffectで描画後に計測 - フェーズ0）
  // 依存配列を最適化（配列を直接入れない）
  const nodePositionsKey = useMemo(
    () => workflowNodes.map((n) => `${n.id}-${n.position.x}-${n.position.y}`).join(','),
    [workflowNodes]
  );
  const connectionsKey = useMemo(
    () => workflowConnections.map((c) => `${c.fromNodeId}-${c.toNodeId}`).join(','),
    [workflowConnections]
  );
  
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    workflowNodes.forEach((node) => {
      const nodeElement = nodeRefs.current.get(node.id);
      if (nodeElement) {
        const rect = nodeElement.getBoundingClientRect();
        measureNodeRect(node.id, {
          x: rect.left - canvasRect.left,
          y: rect.top - canvasRect.top,
          w: rect.width,
          h: rect.height,
        });
      }
    });
  }, [nodePositionsKey, connectionsKey, measureNodeRect]);
  
  // ノードのドラッグ開始
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = workflowNodes.find((n) => n.id === nodeId);
    if (!node) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - node.position.x,
      y: e.clientY - rect.top - node.position.y,
    });
  }, [workflowNodes]);
  
  // ノードのドラッグ中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedNode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    
    updateNode(draggedNode, {
      position: { x: Math.max(0, newX), y: Math.max(0, newY) },
    });
  }, [draggedNode, dragOffset, updateNode]);
  
  // ノードのドラッグ終了
  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    // ドラッグ終了時に位置情報を再計測
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      workflowNodes.forEach((node) => {
        const nodeElement = nodeRefs.current.get(node.id);
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect();
          measureNodeRect(node.id, {
            x: rect.left - canvasRect.left,
            y: rect.top - canvasRect.top,
            w: rect.width,
            h: rect.height,
          });
        }
      });
    }
  }, [workflowNodes, measureNodeRect]);
  
  // マウスイベントの登録（ノードドラッグ用）
  React.useEffect(() => {
    if (draggedNode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNode, handleMouseMove, handleMouseUp]);
  
  // 接続ハンドルのマウスダウン処理（上下左右対応）
  const handleConnectionHandleMouseDown = useCallback((
    e: React.MouseEvent,
    nodeId: string,
    side: 'top' | 'right' | 'bottom' | 'left'
  ) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const nodeElement = e.currentTarget.closest('[data-node-id]') as HTMLElement;
    if (!nodeElement) return;
    
    const nodeRect = nodeElement.getBoundingClientRect();
    let fromPosition: { x: number; y: number };
    
    switch (side) {
      case 'top':
        fromPosition = {
          x: nodeRect.left + nodeRect.width / 2 - rect.left,
          y: nodeRect.top - rect.top,
        };
        break;
      case 'right':
        fromPosition = {
          x: nodeRect.right - rect.left,
          y: nodeRect.top + nodeRect.height / 2 - rect.top,
        };
        break;
      case 'bottom':
        fromPosition = {
          x: nodeRect.left + nodeRect.width / 2 - rect.left,
          y: nodeRect.bottom - rect.top,
        };
        break;
      case 'left':
        fromPosition = {
          x: nodeRect.left - rect.left,
          y: nodeRect.top + nodeRect.height / 2 - rect.top,
        };
        break;
    }
    
    setDraggingConnection({
      fromNodeId: nodeId,
      fromPosition,
      currentPosition: fromPosition,
      fromSide: side,
    });
  }, []);
  
  // 接続ドラッグのマウスイベント
  const handleConnectionMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingConnection || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    setDraggingConnection({
      ...draggingConnection,
      currentPosition,
    });
  }, [draggingConnection]);
  
  const handleConnectionMouseUp = useCallback((e: MouseEvent) => {
    if (!draggingConnection || !canvasRef.current) return;
    
    // ドロップ先のノードを検出
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const targetNodeElement = elements.find((el) => {
      return el.getAttribute('data-node-id') && !el.closest('.connection-handle');
    });
    
    if (targetNodeElement) {
      const targetNodeId = targetNodeElement.getAttribute('data-node-id');
      if (targetNodeId && targetNodeId !== draggingConnection.fromNodeId) {
        // 接続ルール（canConnect）とサイクルチェックはaddConnection内で実行される
        addConnection(draggingConnection.fromNodeId, targetNodeId);
        onConnectionComplete?.();
      }
    }
    
    setDraggingConnection(null);
    setHoveredNode(null);
  }, [draggingConnection, activeWorkflow, addConnection, onConnectionComplete]);
  
  React.useEffect(() => {
    if (draggingConnection) {
      window.addEventListener('mousemove', handleConnectionMouseMove);
      window.addEventListener('mouseup', handleConnectionMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleConnectionMouseMove);
        window.removeEventListener('mouseup', handleConnectionMouseUp);
      };
    }
  }, [draggingConnection, handleConnectionMouseMove, handleConnectionMouseUp]);
  
  // ノードアイコンの取得
  const getNodeIcon = (node: WorkflowNode) => {
    if (node.type === 'input') {
      const inputNode = node as InputNode;
      switch (inputNode.kind) {
        case 'product':
          return <Package className="w-5 h-5" />;
        case 'persona':
          return <Users className="w-5 h-5" />;
        case 'knowledge':
          return <BookOpen className="w-5 h-5" />;
      }
    } else {
      return <Bot className="w-5 h-5" />;
    }
  };
  
  // ノードの色を取得
  const getNodeColor = (node: WorkflowNode) => {
    if (node.type === 'input') {
      const inputNode = node as InputNode;
      switch (inputNode.kind) {
        case 'product':
          return 'bg-gray-800 text-white';
        case 'persona':
          return 'bg-blue-500 text-white';
        case 'knowledge':
          return 'bg-purple-500 text-white';
      }
    } else {
      return 'bg-orange-500 text-white';
    }
  };
  
  if (!activeWorkflow) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">ワークフローが選択されていません</p>
          <p className="text-sm">左カラムからワークフローを選択または作成してください</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-xl font-bold">{activeWorkflow.name}</h2>
      </div>
      
      {/* キャンバス */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto bg-gray-50"
        style={{ minHeight: '600px' }}
      >
        {/* 接続線 */}
        <svg className="absolute inset-0 z-10 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          {workflowConnections.map((conn, index) => {
            const fromNode = workflowNodes.find((n) => n.id === conn.fromNodeId);
            const toNode = workflowNodes.find((n) => n.id === conn.toNodeId);
            if (!fromNode || !toNode) return null;
            
            // 同じtoNodeに接続する接続の数をカウント
            const connectionsToSameNode = workflowConnections.filter(
              (c) => c.toNodeId === conn.toNodeId
            );
            const connectionIndex = connectionsToSameNode.findIndex((c) => c.id === conn.id);
            const totalConnections = connectionsToSameNode.length;
            
            // storeからノードの位置情報を取得（フェーズ0: nodeRects方式）
            const fromRect = nodeRects.get(conn.fromNodeId);
            const toRect = nodeRects.get(conn.toNodeId);
            
            // 接続点を計算（上下左右対応）
            const getConnectionPoints = (
              fromRect: { x: number; y: number; w: number; h: number } | undefined,
              toRect: { x: number; y: number; w: number; h: number } | undefined,
              fromNode: WorkflowNode,
              toNode: WorkflowNode
            ): { fromX: number; fromY: number; toX: number; toY: number } => {
              const from = fromRect || {
                x: fromNode.position.x,
                y: fromNode.position.y,
                w: 200,
                h: 60,
              };
              const to = toRect || {
                x: toNode.position.x,
                y: toNode.position.y,
                w: 200,
                h: 60,
              };
              
              // ノードの中心座標
              const fromCenterX = from.x + from.w / 2;
              const fromCenterY = from.y + from.h / 2;
              const toCenterX = to.x + to.w / 2;
              const toCenterY = to.y + to.h / 2;
              
              // 方向ベクトル
              const dx = toCenterX - fromCenterX;
              const dy = toCenterY - fromCenterY;
              
              // 最も近い辺を決定（fromNode）
              let fromSide: 'top' | 'right' | 'bottom' | 'left';
              if (Math.abs(dy) > Math.abs(dx)) {
                fromSide = dy > 0 ? 'bottom' : 'top';
              } else {
                fromSide = dx > 0 ? 'right' : 'left';
              }
              
              // 最も近い辺を決定（toNode）
              let toSide: 'top' | 'right' | 'bottom' | 'left';
              if (Math.abs(dy) > Math.abs(dx)) {
                toSide = dy > 0 ? 'top' : 'bottom';
              } else {
                toSide = dx > 0 ? 'left' : 'right';
              }
              
              // 複数の接続がある場合、接続点を分散
              const spacing = totalConnections > 1 ? Math.min(18, (fromSide === 'top' || fromSide === 'bottom' ? from.w : from.h) / (totalConnections + 1)) : 0;
              const offset = totalConnections > 1 
                ? (connectionIndex - (totalConnections - 1) / 2) * spacing
                : 0;
              
              // fromNodeの接続点
              let fromX: number, fromY: number;
              switch (fromSide) {
                case 'top':
                  fromX = fromCenterX + offset;
                  fromY = from.y;
                  break;
                case 'right':
                  fromX = from.x + from.w;
                  fromY = fromCenterY + offset;
                  break;
                case 'bottom':
                  fromX = fromCenterX + offset;
                  fromY = from.y + from.h;
                  break;
                case 'left':
                  fromX = from.x;
                  fromY = fromCenterY + offset;
                  break;
              }
              
              // toNodeの接続点
              let toX: number, toY: number;
              switch (toSide) {
                case 'top':
                  toX = toCenterX + offset;
                  toY = to.y;
                  break;
                case 'right':
                  toX = to.x + to.w;
                  toY = toCenterY + offset;
                  break;
                case 'bottom':
                  toX = toCenterX + offset;
                  toY = to.y + to.h;
                  break;
                case 'left':
                  toX = to.x;
                  toY = toCenterY + offset;
                  break;
              }
              
              return { fromX, fromY, toX, toY };
            };
            
            const { fromX, fromY, toX, toY } = getConnectionPoints(fromRect, toRect, fromNode, toNode);
            const isHovered = hoveredConnection === conn.id;
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            
            return (
              <g key={conn.id}>
                {/* 通常時の見た目用の線 */}
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke={isHovered ? "#ef4444" : "#3b82f6"}
                  strokeWidth={isHovered ? "4" : "2"}
                  markerEnd="url(#arrowhead)"
                  style={{ pointerEvents: 'none' }}
                />
                {/* 接続線のクリック可能な領域（細めに設定してノードのクリックを優先） */}
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke="transparent"
                  strokeWidth="6"
                  className="cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onMouseEnter={() => setHoveredConnection(conn.id)}
                  onMouseLeave={() => setHoveredConnection(null)}
                />
                {/* ホバー時の×アイコン */}
                {isHovered && (
                  <g
                    className="cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('この接続を削除しますか？')) {
                        deleteConnection(conn.id);
                      }
                    }}
                  >
                    <circle
                      cx={midX}
                      cy={midY}
                      r="14"
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth="2"
                    />
                    {/* ×アイコンをSVGで描画 */}
                    <line
                      x1={midX - 6}
                      y1={midY - 6}
                      x2={midX + 6}
                      y2={midY + 6}
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1={midX - 6}
                      y1={midY + 6}
                      x2={midX + 6}
                      y2={midY - 6}
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
            );
          })}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>
        </svg>
        
        {/* 接続ドラッグ中の線を描画 */}
        {draggingConnection && (
          <svg
            className="absolute inset-0 pointer-events-none z-30"
            style={{ width: '100%', height: '100%' }}
          >
            <line
              x1={draggingConnection.fromPosition.x}
              y1={draggingConnection.fromPosition.y}
              x2={draggingConnection.currentPosition.x}
              y2={draggingConnection.currentPosition.y}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              markerEnd="url(#arrowhead-dragging)"
            />
            <defs>
              <marker
                id="arrowhead-dragging"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>
          </svg>
        )}
        
        {/* ノード */}
        {workflowNodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const isInputNode = node.type === 'input';
          
          return (
            <div
              key={node.id}
              ref={(el) => {
                if (el) {
                  nodeRefs.current.set(node.id, el);
                } else {
                  nodeRefs.current.delete(node.id);
                }
              }}
              data-node-id={node.id}
              className={`absolute rounded-lg border-2 cursor-move shadow-md relative z-30 ${
                selectedNode?.id === node.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : draggingConnection?.fromNodeId === node.id
                  ? 'border-green-500 ring-4 ring-green-300'
                  : draggingConnection && node.type === 'agent' && draggingConnection.fromNodeId !== node.id
                  ? 'border-blue-300 ring-2 ring-blue-300'
                  : node.type === 'agent' && (node as AgentNode).data?.status === 'running'
                  ? 'border-blue-400 ring-4 ring-blue-200 animate-pulse'
                  : 'border-gray-300'
              } ${getNodeColor(node)}`}
              style={{
                left: `${node.position.x}px`,
                top: `${node.position.y}px`,
                width: '200px',
              }}
              onMouseEnter={() => {
                if (!draggingConnection) {
                  setHoveredNode(node.id);
                }
              }}
              onMouseLeave={(e) => {
                // 接続ハンドルに移動した場合は離脱しない
                const relatedTarget = e.relatedTarget;
                if (relatedTarget && relatedTarget instanceof HTMLElement && relatedTarget.closest('.connection-handle')) {
                  return;
                }
                if (!draggingConnection) {
                  setHoveredNode(null);
                }
              }}
              onMouseDown={(e) => {
                // 接続ハンドル以外のクリックはノードドラッグ
                if (!(e.target as HTMLElement).closest('.connection-handle')) {
                  handleNodeMouseDown(e, node.id);
                }
              }}
              onClick={(e) => {
                // 接続ハンドルのクリックは処理しない
                if ((e.target as HTMLElement).closest('.connection-handle')) {
                  return;
                }
                e.stopPropagation();
                setSelectedNode(node);
              }}
            >
              {/* 接続ハンドル（全ノード、マウスオーバー時表示、上下左右に配置） */}
              {isHovered && !draggingConnection && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  onMouseEnter={() => {
                    // ハンドルエリアに入ったらhover状態を維持
                    if (!draggingConnection) {
                      setHoveredNode(node.id);
                    }
                  }}
                  onMouseLeave={(e) => {
                    // 接続ハンドル自体に移動した場合は離脱しない
                    const relatedTarget = e.relatedTarget;
                    if (relatedTarget && relatedTarget instanceof HTMLElement && relatedTarget.closest('.connection-handle')) {
                      return;
                    }
                    if (!draggingConnection) {
                      setHoveredNode(null);
                    }
                  }}
                >
                  {/* 上側の接続ハンドル */}
                  <div
                    className="connection-handle absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-crosshair pointer-events-auto flex items-center justify-center hover:bg-blue-600 z-40"
                    onMouseEnter={() => {
                      if (!draggingConnection) {
                        setHoveredNode(node.id);
                      }
                    }}
                    onMouseDown={(e) => handleConnectionHandleMouseDown(e, node.id, 'top')}
                    title="ドラッグして接続"
                    data-handle-side="top"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 2L6 10M6 2L3 5M6 2L9 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  {/* 右側の接続ハンドル */}
                  <div
                    className="connection-handle absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-crosshair pointer-events-auto flex items-center justify-center hover:bg-blue-600 z-40"
                    onMouseEnter={() => {
                      if (!draggingConnection) {
                        setHoveredNode(node.id);
                      }
                    }}
                    onMouseDown={(e) => handleConnectionHandleMouseDown(e, node.id, 'right')}
                    title="ドラッグして接続"
                    data-handle-side="right"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 6L10 6M10 6L7 3M10 6L7 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  {/* 下側の接続ハンドル */}
                  <div
                    className="connection-handle absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-crosshair pointer-events-auto flex items-center justify-center hover:bg-blue-600 z-40"
                    onMouseEnter={() => {
                      if (!draggingConnection) {
                        setHoveredNode(node.id);
                      }
                    }}
                    onMouseDown={(e) => handleConnectionHandleMouseDown(e, node.id, 'bottom')}
                    title="ドラッグして接続"
                    data-handle-side="bottom"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 2L6 10M6 10L3 7M6 10L9 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  {/* 左側の接続ハンドル */}
                  <div
                    className="connection-handle absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-crosshair pointer-events-auto flex items-center justify-center hover:bg-blue-600 z-40"
                    onMouseEnter={() => {
                      if (!draggingConnection) {
                        setHoveredNode(node.id);
                      }
                    }}
                    onMouseDown={(e) => handleConnectionHandleMouseDown(e, node.id, 'left')}
                    title="ドラッグして接続"
                    data-handle-side="left"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 6L10 6M2 6L5 3M2 6L5 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
              
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  {getNodeIcon(node)}
                  <div className="flex-1 font-semibold text-sm truncate">{node.label}</div>
                  {/* 実行状態表示（より目立つように） */}
                  {node.type === 'agent' && (() => {
                    const agentNode = node as AgentNode;
                    const status = agentNode.data?.status;
                    const executionStep = agentNode.data?.executionStep;
                    
                    if (status === 'running') {
                      return (
                        <div className="absolute -top-2 -right-2 flex flex-col items-end gap-1 z-50">
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg shadow-lg text-xs font-bold animate-pulse border-2 border-blue-300">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>実行中</span>
                          </div>
                          {executionStep && (
                            <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs border border-blue-300 whitespace-nowrap">
                              {executionStep}
                            </div>
                          )}
                        </div>
                      );
                    } else if (status === 'success') {
                      return (
                        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg shadow-lg text-xs font-bold border-2 border-green-300">
                          <CheckCircle className="w-4 h-4" />
                          <span>成功</span>
                        </div>
                      );
                    } else if (status === 'error') {
                      const errorMsg = agentNode.data?.lastError || 'エラー';
                      // エラーメッセージの最初の行を取得（ツールチップ用）
                      const errorPreview = errorMsg.split('\n')[0].substring(0, 60);
                      // エラーの種類を判定
                      const isHtmlError = errorMsg.includes('HTMLエラーページ');
                      const isApiKeyError = errorMsg.includes('APIキー');
                      const isTimeoutError = errorMsg.includes('タイムアウト');
                      
                      return (
                        <div className="absolute -top-2 -right-2 flex flex-col items-end gap-1 z-50">
                          <div 
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg shadow-lg text-xs font-bold border-2 border-red-300 cursor-help" 
                            title={`エラー: ${errorMsg}`}
                          >
                            <XCircle className="w-4 h-4" />
                            <span>エラー</span>
                          </div>
                          {errorPreview && (
                            <div 
                              className={`px-3 py-2 rounded text-xs border max-w-xs ${
                                isHtmlError 
                                  ? 'bg-yellow-50 text-yellow-900 border-yellow-300' 
                                  : isApiKeyError
                                  ? 'bg-orange-50 text-orange-900 border-orange-300'
                                  : isTimeoutError
                                  ? 'bg-blue-50 text-blue-900 border-blue-300'
                                  : 'bg-red-100 text-red-800 border-red-300'
                              }`}
                              title={errorMsg}
                            >
                              <div className="font-medium mb-1">
                                {isHtmlError && '⚠️ API接続エラー'}
                                {isApiKeyError && '⚠️ APIキー未設定'}
                                {isTimeoutError && '⏱️ タイムアウト'}
                                {!isHtmlError && !isApiKeyError && !isTimeoutError && 'エラー詳細'}
                              </div>
                              <div className="break-words">{errorPreview}</div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                {node.type === 'agent' && (node as AgentNode).executionResult && (
                  <div className="text-xs mt-1 opacity-75 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>実行済み</span>
                    {(() => {
                      const agentNode = node as AgentNode;
                      const zodResult = (agentNode.executionResult as any)?.zodValidationResult;
                      if (zodResult && !zodResult.success) {
                        return (
                          <span className="text-red-600 ml-1" title="Zod検証失敗">
                            ⚠️
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
