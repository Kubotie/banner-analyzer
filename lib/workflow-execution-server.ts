/**
 * ワークフロー実行関連のユーティリティ（サーバーサイド専用）
 * 注意: このファイルはサーバーサイド（API Routes）でのみ使用してください
 * クライアントサイドからインポートしないでください（fsモジュールを使用するため）
 */

import { InputNode, AgentNode, ExecutionContext, WorkflowNode, ContextPacket, IntentPayload } from '@/types/workflow';
import { Workflow } from '@/types/workflow';

/**
 * Step 3: DAGベースで上流ノードを再帰的に取得（トポロジカル順）
 */
function getUpstreamNodes(
  workflow: Workflow,
  targetNodeId: string,
  visited: Set<string> = new Set()
): WorkflowNode[] {
  if (visited.has(targetNodeId)) {
    return []; // サイクル防止
  }
  visited.add(targetNodeId);
  
  const upstreamNodeIds = workflow.connections
    .filter((conn) => conn.toNodeId === targetNodeId)
    .map((conn) => conn.fromNodeId);
  
  const upstreamNodes: WorkflowNode[] = [];
  const seenNodeIds = new Set<string>(); // 重複除去用
  
  for (const upstreamNodeId of upstreamNodeIds) {
    if (seenNodeIds.has(upstreamNodeId)) continue; // 既に追加済み
    const node = workflow.nodes.find((n) => n.id === upstreamNodeId);
    if (node) {
      // 再帰的に上流を取得
      const furtherUpstream = getUpstreamNodes(workflow, upstreamNodeId, new Set(visited));
      for (const upstreamNode of furtherUpstream) {
        if (!seenNodeIds.has(upstreamNode.id)) {
          upstreamNodes.push(upstreamNode);
          seenNodeIds.add(upstreamNode.id);
        }
      }
      if (!seenNodeIds.has(node.id)) {
        upstreamNodes.push(node);
        seenNodeIds.add(node.id);
      }
    }
  }
  
  return upstreamNodes;
}

/**
 * Step 3: トポロジカルソート（上流→下流の順）
 */
function topologicalSort(nodes: WorkflowNode[], connections: Array<{ from: string; to: string }>): string[] {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();
  
  // 初期化
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    graph.set(node.id, []);
  }
  
  // グラフ構築
  for (const conn of connections) {
    if (!graph.has(conn.from)) {
      graph.set(conn.from, []);
    }
    graph.get(conn.from)!.push(conn.to);
    inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
  }
  
  // トポロジカルソート
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }
  
  const result: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);
    
    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  return result;
}

/**
 * Step 3: DAGベースでExecutionContextを構築（サーバーサイド用）
 */
export async function buildExecutionContextFromDAG(
  workflow: Workflow,
  agentNodeId: string
): Promise<ExecutionContext> {
  const agentNode = workflow.nodes.find((n) => n.id === agentNodeId && n.type === 'agent') as AgentNode | undefined;
  if (!agentNode) {
    throw new Error(`Agent node not found: ${agentNodeId}`);
  }
  
  // Step 3-1: 上流ノードを再帰的に取得
  const upstreamNodes = getUpstreamNodes(workflow, agentNodeId);
  
  // Step 3-2: トポロジカル順に並べる
  const allRelevantNodes = [...upstreamNodes, agentNode];
  const relevantConnections = workflow.connections.filter((conn) => {
    const fromInRelevant = allRelevantNodes.some((n) => n.id === conn.fromNodeId);
    const toInRelevant = allRelevantNodes.some((n) => n.id === conn.toNodeId);
    return fromInRelevant && toInRelevant;
  });
  
  const edgesUsed = relevantConnections.map((conn) => ({ from: conn.fromNodeId, to: conn.toNodeId }));
  const orderedNodeIds = topologicalSort(
    allRelevantNodes,
    edgesUsed
  );
  
  // Step 3-3: 各ノードの内容をContextPacketとして積む
  const packets: ContextPacket[] = [];
  const context: ExecutionContext = {
    knowledge: [],
    referencedKbItemIds: [],
    packets: [],
    trace: {
      orderedNodeIds,
      edgesUsed,
      mergedAt: new Date().toISOString(),
    },
  };
  
  // Step 2: 役割順で固定（接続順に依存しない）
  // 1. 目的・意図（goal）
  // 2. 製品情報（product）
  // 3. ペルソナ（persona）
  // 4. ナレッジ（knowledge[]）
  // 5. 直前までのAgent出力（upstream agent outputs）
  const kindOrder: Record<string, number> = {
    'intent': 1,        // 目的・意図（最優先）
    'product': 2,       // 製品情報
    'persona': 3,       // ペルソナ
    'kb_item': 4,       // ナレッジ
    'workflow_run_ref': 5, // 参照ワークフロー実行結果
    'agent_output': 6,  // 前段出力（最後）
  };
  
  for (const nodeId of orderedNodeIds) {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) continue;
    
    if (node.type === 'input') {
      const inputNode = node as InputNode;
      const data = inputNode.data;
      
      if (inputNode.kind === 'intent' && data?.intentPayload) {
        // Intentノード
        const packet: ContextPacket = {
          id: `packet-${nodeId}`,
          nodeId: node.id,
          nodeType: 'input',
          kind: 'intent',
          title: inputNode.label || '目的・意図',
          content: data.intentPayload,
          createdAt: new Date().toISOString(),
        };
        packets.push(packet);
        context.intent = data.intentPayload;
      } else if (inputNode.kind === 'product' && data?.refId) {
        // Productノード（サーバーサイドで詳細を取得）
        const { getProduct } = await import('@/lib/product-db-server');
        const product = await getProduct(data.refId);
        if (product) {
          const packet: ContextPacket = {
            id: `packet-${nodeId}`,
            nodeId: node.id,
            nodeType: 'input',
            kind: 'product',
            title: product.name || inputNode.label,
            content: product,
            createdAt: new Date().toISOString(),
          };
          packets.push(packet);
          context.product = {
            id: product.productId,
            name: product.name,
            category: product.category,
            description: product.description,
          };
        }
      } else if (inputNode.kind === 'persona' && data?.refId) {
        // Personaノード（サーバーサイドで詳細を取得）
        const { getKBItem } = await import('@/kb/db-server');
        const personaItem = await getKBItem(data.refId);
        if (personaItem && personaItem.payload.type === 'persona') {
          const packet: ContextPacket = {
            id: `packet-${nodeId}`,
            nodeId: node.id,
            nodeType: 'input',
            kind: 'persona',
            title: personaItem.title || inputNode.label,
            content: personaItem.payload,
            evidenceRefs: [personaItem.kb_id],
            createdAt: personaItem.created_at,
          };
          packets.push(packet);
          context.persona = {
            id: personaItem.kb_id,
            ...personaItem.payload,
          };
          context.referencedKbItemIds?.push(personaItem.kb_id);
        }
      } else if (inputNode.kind === 'knowledge' && data?.refId) {
        // Knowledgeノード（サーバーサイドで詳細を取得）
        const { getKBItem } = await import('@/kb/db-server');
        const knowledgeItem = await getKBItem(data.refId);
        if (knowledgeItem) {
          // Step 3: デバッグログ（薄め処理禁止、原文/構造を保持）
          // デバッグログは残すが、substring等の薄め処理は削除
          
          const packet: ContextPacket = {
            id: `packet-${nodeId}`,
            nodeId: node.id,
            nodeType: 'input',
            kind: 'kb_item',
            title: knowledgeItem.title || inputNode.label,
            content: knowledgeItem.payload,
            evidenceRefs: [knowledgeItem.kb_id],
            createdAt: knowledgeItem.created_at,
          };
          packets.push(packet);
          context.knowledge.push({
            kind: data.refKind || knowledgeItem.type,
            id: knowledgeItem.kb_id,
            title: knowledgeItem.title,
            payload: knowledgeItem.payload,
          });
          context.referencedKbItemIds?.push(knowledgeItem.kb_id);
        } else {
          console.warn(`[buildExecutionContextFromDAG] Knowledge item not found:`, data.refId);
        }
      } else if (data?.inputKind === 'workflow_run_ref' && data?.refId) {
        // Workflow run refノード
        const { getKBItem } = await import('@/kb/db-server');
        const { WorkflowRunPayload } = await import('@/kb/types');
        const runItem = await getKBItem(data.refId);
        if (runItem && runItem.type === 'workflow_run') {
          const runPayload = runItem.payload as WorkflowRunPayload;
          const finalOutput = runPayload.finalOutput || runPayload.output;
          if (finalOutput) {
            const packet: ContextPacket = {
              id: `packet-${nodeId}`,
              nodeId: node.id,
              nodeType: 'input',
              kind: 'workflow_run_ref',
              title: runItem.title || inputNode.label,
              content: finalOutput,
              evidenceRefs: [runItem.kb_id],
              createdAt: runItem.created_at,
            };
            packets.push(packet);
            if (!context.inputs) {
              context.inputs = {};
            }
            context.inputs[`workflow_run_${data.refId}`] = {
              kind: 'workflow_run_output',
              runId: data.refId,
              output: finalOutput,
            };
            if (!context.referencedRunIds) {
              context.referencedRunIds = [];
            }
            context.referencedRunIds.push(data.refId);
            context.referencedKbItemIds?.push(data.refId);
          }
        }
      }
    } else if (node.type === 'agent' && node.id !== agentNodeId) {
      // 中間エージェントノード（agent -> agent の場合）
      const intermediateAgentNode = node as AgentNode;
      if (intermediateAgentNode.executionResult?.output) {
        const packet: ContextPacket = {
          id: `packet-${nodeId}`,
          nodeId: node.id,
          nodeType: 'agent',
          kind: 'agent_output',
          title: intermediateAgentNode.label || '中間出力',
          content: intermediateAgentNode.executionResult.output,
          createdAt: intermediateAgentNode.executionResult.executedAt || new Date().toISOString(),
        };
        packets.push(packet);
      }
    }
  }
  
  // Step 3-4: 同じ種類が複数あれば、順序でソート
  packets.sort((a, b) => {
    const orderA = kindOrder[a.kind] || 999;
    const orderB = kindOrder[b.kind] || 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // 同じ種類の場合はorderedNodeIdsの順序を維持
    const indexA = orderedNodeIds.indexOf(a.nodeId);
    const indexB = orderedNodeIds.indexOf(b.nodeId);
    return indexA - indexB;
  });
  
  context.packets = packets;
  
  // Step 3: inputsFullとinputsPreviewを生成
  context.inputsFull = packets.map((packet) => ({
    kind: packet.kind,
    refId: packet.evidenceRefs?.[0],
    payloadRaw: packet.content, // 原文/構造をそのまま保持（truncate/stringify禁止）
    payloadStructured: packet.content, // 構造化された形式（packetsのcontentをそのまま使用）
    sourceTitle: packet.title,
    createdAt: packet.createdAt,
  }));
  
  // Step 3: inputsPreview（UI表示用 - ここだけ短くしてOK）
  const counts = {
    kbItems: packets.filter((p) => p.kind === 'kb_item').length,
    personas: packets.filter((p) => p.kind === 'persona').length,
    products: packets.filter((p) => p.kind === 'product').length,
    intent: packets.filter((p) => p.kind === 'intent').length,
    agentOutputs: packets.filter((p) => p.kind === 'agent_output').length,
  };
  
  const highlights = packets.map((packet) => {
    let preview = '';
    if (typeof packet.content === 'string') {
      preview = packet.content.length > 100 ? packet.content.substring(0, 100) + '...' : packet.content;
    } else if (typeof packet.content === 'object' && packet.content !== null) {
      const keys = Object.keys(packet.content);
      preview = keys.length > 0 ? `${keys[0]}: ${String(packet.content[keys[0]]).substring(0, 50)}...` : '（オブジェクト）';
    } else {
      preview = String(packet.content || '（空）');
    }
    return {
      kind: packet.kind,
      title: packet.title,
      preview,
    };
  });
  
  const charCounts = {
    total: packets.reduce((sum, p) => {
      const contentStr = typeof p.content === 'string' ? p.content : JSON.stringify(p.content || {});
      return sum + contentStr.length;
    }, 0),
    byKind: packets.reduce((acc, p) => {
      const contentStr = typeof p.content === 'string' ? p.content : JSON.stringify(p.content || {});
      acc[p.kind] = (acc[p.kind] || 0) + contentStr.length;
      return acc;
    }, {} as Record<string, number>),
  };
  
  context.inputsPreview = {
    counts,
    highlights,
    charCounts,
  };
  
  // 【追加】デバッグログ: inputsFullの各inputについて詳細を出力
  if (process.env.NODE_ENV === 'development' && context.inputsFull && context.inputsFull.length > 0) {
    console.table(context.inputsFull.map((input) => ({
      kind: input.kind,
      refId: input.refId || 'N/A',
      payloadType: typeof input.payloadRaw,
      size: typeof input.payloadRaw === 'string' 
        ? input.payloadRaw.length 
        : JSON.stringify(input.payloadRaw || {}).length,
      hasArray: Array.isArray(input.payloadRaw),
      hasObject: typeof input.payloadRaw === 'object' && input.payloadRaw !== null && !Array.isArray(input.payloadRaw),
    })));
  }
  
  // 従来のフィールドも設定（後方互換性）
  // knowledge投入順序を固定
  context.knowledge.sort((a, b) => {
    const order: Record<string, number> = {
      'banner_insight': 1,
      'market_insight': 2,
      'strategy_option': 3,
      'planning_hook': 4,
      'banner_auto_layout': 5,
    };
    return (order[a.kind] || 999) - (order[b.kind] || 999);
  });
  
  return context;
}
