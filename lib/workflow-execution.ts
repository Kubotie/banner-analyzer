/**
 * ワークフロー実行関連のユーティリティ（クライアントサイド対応）
 * 注意: buildExecutionContextFromDAGはサーバーサイド専用のため、lib/workflow-execution-server.tsに移動しました
 */

import { InputNode, AgentNode, ExecutionContext, ContextPacket, IntentPayload } from '@/types/workflow';
import { Workflow } from '@/types/workflow';

/**
 * トークン数を推定（簡易版：日本語は約2文字=1トークン、英語は約4文字=1トークン）
 * エクスポートしてクライアントサイドでも使用可能にする
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // 日本語文字（ひらがな、カタカナ、漢字）の数をカウント
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  // その他の文字（英語、数字、記号など）
  const otherChars = text.length - japaneseChars;
  // 日本語: 2文字=1トークン、その他: 4文字=1トークン
  return Math.ceil(japaneseChars / 2) + Math.ceil(otherChars / 4);
}

/**
 * 【廃止】Step 3: 入力の薄め処理を全面禁止したため、この関数は使用禁止
 * 入力は原文/構造をそのまま保持する（truncate/stringify禁止）
 * 
 * @deprecated 使用禁止。入力の薄め処理は全面禁止。
 */
function truncateContent(content: string, maxTokens: number): { content: string; wasTruncated: boolean } {
  // Step 3: 使用禁止（入力の薄め処理を全面禁止）
  console.warn('[workflow-execution] truncateContentは使用禁止です。入力は原文/構造をそのまま保持してください。');
  return { content, wasTruncated: false };
}

/**
 * 【廃止】Step 3: 入力の薄め処理を全面禁止したため、この関数は使用禁止
 * 
 * @deprecated 使用禁止。入力の薄め処理は全面禁止。
 */
function summarizeOrTruncateJSON(obj: any, maxTokens: number): { content: string; wasTruncated: boolean } {
  // Step 3: 使用禁止（入力の薄め処理を全面禁止）
  console.warn('[workflow-execution] summarizeOrTruncateJSONは使用禁止です。入力は原文/構造をそのまま保持してください。');
  const jsonString = JSON.stringify(obj, null, 2);
  return { content: jsonString, wasTruncated: false };
}

/**
 * ExecutionContextを構築（接続されたInputNodeから）
 * 注意: この関数はクライアントサイドでも使用可能（簡易版）
 * Step 3: この関数は後方互換性のため残すが、サーバーサイドではbuildExecutionContextFromDAGを使用
 */
export function buildExecutionContext(
  workflow: Workflow,
  agentNode: AgentNode,
  inputNodes: InputNode[]
): ExecutionContext {
  const context: ExecutionContext = {
    knowledge: [],
  };
  
  // 接続されたInputNodeを取得
  const connectedInputIds = workflow.connections
    .filter((conn) => conn.toNodeId === agentNode.id)
    .map((conn) => conn.fromNodeId);
  
  const connectedInputs = inputNodes.filter((node) => connectedInputIds.includes(node.id));
  
  for (const inputNode of connectedInputs) {
    const data = inputNode.data;
    if (!data) continue;
    
    if (inputNode.kind === 'intent' && data.intentPayload) {
      // Intentノード
      context.intent = data.intentPayload;
    } else if (data.inputKind === 'product' && data.refId) {
      // 製品情報（簡易版、クライアントサイドではIDとタイトルのみ）
      context.product = {
        id: data.refId,
        name: data.title,
      };
    } else if (data.inputKind === 'persona' && data.refId) {
      // ペルソナ（簡易版）
      context.persona = {
        id: data.refId,
      };
    } else if (data.inputKind === 'kb_item' && data.refId) {
      // ナレッジ（簡易版）
      context.knowledge.push({
        kind: data.refKind || 'unknown',
        id: data.refId,
        title: data.title,
        payload: {}, // クライアントサイドでは空（サーバーサイドで取得）
      });
    }
  }
  
  return context;
}

/**
 * userPromptTemplateにExecutionContextを差し込み
 * 【重要】Step 3: 入力の薄め処理を全面禁止。原文/構造をそのまま保持する
 */
export function buildUserPrompt(
  template: string,
  context: ExecutionContext,
  options?: { maxContextTokens?: number; maxKnowledgeItemTokens?: number }
): string {
  let prompt = template;
  
  // Step 3: packetsベースの文脈組み立て（薄め処理禁止）
  if (context.packets && context.packets.length > 0) {
    const sections: string[] = [];
    let totalEstimatedTokens = estimateTokenCount(template);
    
    // 目的・意図
    const intentPackets = context.packets.filter((p) => p.kind === 'intent');
    if (intentPackets.length > 0) {
      sections.push('【目的・意図】');
      for (const packet of intentPackets) {
        const intentPayload = packet.content as IntentPayload;
        const intentText = [
          `目的: ${intentPayload.goal || '未入力'}`,
          intentPayload.successCriteria ? `成功条件: ${intentPayload.successCriteria}` : null,
          intentPayload.background ? `背景: ${intentPayload.background}` : null,
          intentPayload.targetSituation ? `想定状況: ${intentPayload.targetSituation}` : null,
          intentPayload.constraints ? `制約/NG: ${intentPayload.constraints}` : null,
          intentPayload.tone ? `トーン: ${intentPayload.tone}` : null,
        ].filter(Boolean).join('\n');
        sections.push(intentText);
        totalEstimatedTokens += estimateTokenCount(intentText);
        sections.push('');
      }
    }
    
    // 製品情報（Step 3: truncate禁止、原文/構造をそのまま保持）
    const productPackets = context.packets.filter((p) => p.kind === 'product');
    if (productPackets.length > 0) {
      sections.push('【製品情報】');
      for (const packet of productPackets) {
        // Step 3: JSON.stringifyは許可（構造化データのため）、truncateは禁止
        const jsonString = JSON.stringify(packet.content, null, 2);
        sections.push(jsonString);
        totalEstimatedTokens += estimateTokenCount(jsonString);
        sections.push('');
      }
    }
    
    // ペルソナ（Step 3: truncate禁止、原文/構造をそのまま保持）
    const personaPackets = context.packets.filter((p) => p.kind === 'persona');
    if (personaPackets.length > 0) {
      sections.push('【ペルソナ情報】');
      for (const packet of personaPackets) {
        sections.push(`【${packet.title}】`);
        // Step 3: JSON.stringifyは許可（構造化データのため）、truncateは禁止
        const jsonString = JSON.stringify(packet.content, null, 2);
        sections.push(jsonString);
        totalEstimatedTokens += estimateTokenCount(jsonString);
        sections.push('');
      }
    }
    
    // ナレッジ（根拠）- Step 3: truncate禁止、原文/構造をそのまま保持
    const knowledgePackets = context.packets.filter((p) => p.kind === 'kb_item');
    if (knowledgePackets.length > 0) {
      sections.push('【接続ナレッジ】');
      knowledgePackets.forEach((packet, idx) => {
        sections.push(`【${packet.title}】`);
        // Step 3: payloadが空でない場合のみJSONを出力（truncate禁止）
        if (packet.content && typeof packet.content === 'object' && Object.keys(packet.content).length > 0) {
          // Step 3: JSON.stringifyは許可（構造化データのため）、truncateは禁止
          const jsonString = JSON.stringify(packet.content, null, 2);
          sections.push(jsonString);
          totalEstimatedTokens += estimateTokenCount(jsonString);
        } else {
          console.warn(`[buildUserPrompt] Knowledge packet content is empty:`, packet.title);
          sections.push('{}'); // 空の場合は空オブジェクトを表示
        }
        sections.push('');
        sections.push('---');
        sections.push('');
      });
    }
    
    // 前段出力（agent -> agent の場合）- Step 3: truncate禁止
    const agentOutputPackets = context.packets.filter((p) => p.kind === 'agent_output');
    if (agentOutputPackets.length > 0) {
      sections.push('【前段出力】');
      for (const packet of agentOutputPackets) {
        sections.push(`【${packet.title}】`);
        // Step 3: JSON.stringifyは許可（構造化データのため）、truncateは禁止
        const jsonString = JSON.stringify(packet.content, null, 2);
        sections.push(jsonString);
        totalEstimatedTokens += estimateTokenCount(jsonString);
        sections.push('');
      }
    }
    
    // workflow_run_ref - Step 3: truncate禁止
    const workflowRunPackets = context.packets.filter((p) => p.kind === 'workflow_run_ref');
    if (workflowRunPackets.length > 0) {
      sections.push('【参照ワークフロー実行結果】');
      for (const packet of workflowRunPackets) {
        sections.push(`【${packet.title}】`);
        // Step 3: JSON.stringifyは許可（構造化データのため）、truncateは禁止
        const jsonString = JSON.stringify(packet.content, null, 2);
        sections.push(jsonString);
        totalEstimatedTokens += estimateTokenCount(jsonString);
        sections.push('');
      }
    }
    
    // Step 3: 全体のコンテキスト長をチェック（警告のみ、切り詰めはしない）
    let structuredContext = sections.join('\n');
    const finalEstimatedTokens = estimateTokenCount(structuredContext) + estimateTokenCount(template);
    
    // Step 3: 警告は出すが、切り詰めはしない（原文/構造を保持）
    if (finalEstimatedTokens > 200000) {
      console.warn('[buildUserPrompt] ⚠️ コンテキストが非常に長い可能性があります（推定トークン数:', finalEstimatedTokens, '）。API制限に注意してください。');
    }
    
    console.log(`[buildUserPrompt] 推定トークン数: ${finalEstimatedTokens}（原文/構造を保持、切り詰めなし）`);
    
    // テンプレートに差し込み（既存のプレースホルダーも対応）
    prompt = prompt.replace('{{context}}', structuredContext);
    prompt = prompt.replace('{{structured_context}}', structuredContext);
  }
  
  // 従来のプレースホルダー（後方互換性）
  // 製品情報
  prompt = prompt.replace(
    '{{product}}',
    context.product ? JSON.stringify(context.product, null, 2) : 'なし'
  );
  
  // ペルソナ
  prompt = prompt.replace(
    '{{persona}}',
    context.persona ? JSON.stringify(context.persona, null, 2) : 'なし'
  );
  
  // ナレッジ
  const knowledgeText = context.knowledge.length > 0
    ? context.knowledge.map((k) => `【${k.title}】\n${JSON.stringify(k.payload, null, 2)}`).join('\n\n---\n\n')
    : 'なし';
  prompt = prompt.replace('{{knowledge}}', knowledgeText);
  
  // メモ
  prompt = prompt.replace('{{notes}}', context.notes || 'なし');
  
  // LP構造（バナーエージェント/Orchestratorエージェント用）
  const lpStructureText = context.lp_structure
    ? JSON.stringify(context.lp_structure.payload, null, 2)
    : 'なし';
  prompt = prompt.replace('{{lp_structure}}', lpStructureText);
  
  // Intent（目的・意図）
  if (context.intent) {
    const intentText = `目的: ${context.intent.goal || '未入力'}\n成功条件: ${context.intent.successCriteria || '未入力'}`;
    prompt = prompt.replace('{{intent}}', intentText);
  } else {
    prompt = prompt.replace('{{intent}}', 'なし');
  }
  
  return prompt;
}
