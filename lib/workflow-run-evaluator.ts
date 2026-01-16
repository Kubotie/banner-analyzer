/**
 * WorkflowRunのOutputList表示判定（理由付き）
 * フェーズ1.5: 除外理由を明確化
 */

import { NormalizedWorkflowRunPayload } from '@/kb/workflow-run-normalizer';
import { Workflow } from '@/types/workflow';
import { AgentDefinition } from '@/types/workflow';

export type EvalResult = {
  include: boolean;
  reason?: 
    | 'WORKFLOW_MISMATCH' 
    | 'MISSING_WORKFLOWID' 
    | 'MISSING_WORKFLOWID_BUT_INFERRED'
    | 'MISSING_AGENT' 
    | 'NO_OUTPUT' 
    | 'UNKNOWN_OUTPUT_KIND'
    | 'STATUS_FILTERED'
    | 'OUTPUT_KIND_NOT_SUPPORTED';
  inferredOutputKind?: string;
  inferredWorkflowId?: string; // 推論されたworkflowId
};

/**
 * outputKindを推定する（2. fallback扱いに変更：保存値を最優先）
 */
export async function inferOutputKind(
  run: NormalizedWorkflowRunPayload,
  agentDefinition?: AgentDefinition | null
): Promise<string> {
  // 1) run.payload.outputKind（保存値を最優先）
  if (run.outputKind) {
    return run.outputKind;
  }
  
  // 2) run.payload.outputSchemaRef（保存値があれば）
  if (run.outputSchemaRef) {
    if (run.outputSchemaRef === 'LpStructurePayloadSchema') {
      return 'lp_structure';
    }
    if (run.outputSchemaRef === 'BannerStructurePayloadSchema') {
      return 'banner_structure';
    }
  }
  
  // 3) run.payload.finalOutput.outputKind
  const finalOutput = run.finalOutput || run.parsedOutput || run.output;
  if (finalOutput && typeof finalOutput === 'object' && 'outputKind' in finalOutput) {
    return finalOutput.outputKind as string;
  }
  
  // 4) AgentDefinition.outputKind（取れたら：fallback）
  if (agentDefinition?.outputKind) {
    return agentDefinition.outputKind;
  }
  
  // 5) AgentDefinition.outputSchemaRef（取れたら：fallback）
  if (agentDefinition?.outputSchemaRef) {
    if (agentDefinition.outputSchemaRef === 'LpStructurePayloadSchema') {
      return 'lp_structure';
    }
    if (agentDefinition.outputSchemaRef === 'BannerStructurePayloadSchema') {
      return 'banner_structure';
    }
  }
  
  // 6) AgentDefinition.outputSchema（取れたら：fallback）
  if (agentDefinition?.outputSchema) {
    return agentDefinition.outputSchema;
  }
  
  // 7) 最終fallback: finalOutputの構造から推測
  if (finalOutput && typeof finalOutput === 'object') {
    // LP構造の特徴: sections と questionCoverage
    if ('sections' in finalOutput && Array.isArray(finalOutput.sections)) {
      if ('questionCoverage' in finalOutput || 'questions' in finalOutput) {
        return 'lp_structure';
      }
    }
    // Banner構造の特徴: banners または bannerIdeas
    if ('banners' in finalOutput || 'bannerIdeas' in finalOutput) {
      return 'banner_structure';
    }
  }
  
  return 'unknown';
}

/**
 * RunがOutputListに表示されるべきか判定（2. 理由付き判定）
 */
export async function evaluateRunForOutputList(
  run: NormalizedWorkflowRunPayload,
  currentWorkflow: Workflow,
  options: {
    showAllStatuses?: boolean;
    agentDefinition?: AgentDefinition | null;
  } = {}
): Promise<EvalResult> {
  // 1. workflow一致判定（4. workflowId欠落/不一致を救済）
  if (!run.workflowId || run.workflowId === '') {
    // workflowIdが無い場合: agentNodeIdで推論
    if (run.nodeId && currentWorkflow.nodes) {
      const nodeIds = currentWorkflow.nodes
        .filter((n) => n.type === 'agent')
        .map((n) => n.id);
      
      if (nodeIds.includes(run.nodeId)) {
        return {
          include: true,
          reason: 'MISSING_WORKFLOWID_BUT_INFERRED',
          inferredWorkflowId: currentWorkflow.id,
        };
      }
    }
    
    return {
      include: false,
      reason: 'MISSING_WORKFLOWID',
    };
  }
  
  // workflowIdが違う場合でも、agentNodeIdで救済
  if (run.workflowId !== currentWorkflow.id) {
    if (run.nodeId && currentWorkflow.nodes) {
      const nodeIds = currentWorkflow.nodes
        .filter((n) => n.type === 'agent')
        .map((n) => n.id);
      
      if (nodeIds.includes(run.nodeId)) {
        return {
          include: true,
          reason: 'WORKFLOW_MISMATCH',
          inferredWorkflowId: currentWorkflow.id,
        };
      }
    }
    
    return {
      include: false,
      reason: 'WORKFLOW_MISMATCH',
    };
  }
  
  // 2. agent情報存在判定
  if (!run.agentId && !run.agentDefinitionId) {
    return {
      include: false,
      reason: 'MISSING_AGENT',
    };
  }
  
  // 3. output存在判定
  const hasOutput = !!(run.finalOutput || run.parsedOutput || run.output);
  if (!hasOutput) {
    return {
      include: false,
      reason: 'NO_OUTPUT',
    };
  }
  
  // 4. outputKind推定
  const inferredOutputKind = await inferOutputKind(run, options.agentDefinition);
  
  // 5. statusフィルタ
  if (!options.showAllStatuses && run.status !== 'success') {
    return {
      include: false,
      reason: 'STATUS_FILTERED',
      inferredOutputKind,
    };
  }
  
  // 6. outputKindがサポートされているか（lp_structure または banner_structure）
  if (inferredOutputKind !== 'lp_structure' && inferredOutputKind !== 'banner_structure') {
    // unknownでも表示対象から完全除外しない（デバッグ目的）
    return {
      include: true, // unknownでも表示する
      reason: 'UNKNOWN_OUTPUT_KIND',
      inferredOutputKind,
    };
  }
  
  return {
    include: true,
    inferredOutputKind,
  };
}

/**
 * フェーズ2-2: 成果物の価値判定を単一関数に集約（UIブレ防止）
 * 実行状態・Zod検証・入力品質を総合的に評価して、企画判断向けのラベルを返す
 */
export interface PlanningEvaluationResult {
  statusLabel: string; // 「生成済」「未生成」「検証失敗」「エラー」など
  trustLabel: string; // 「企画検討に利用可能」「再生成推奨」「入力不足の可能性」など
  reasons: string[]; // 判定理由の配列
  badgeTone: 'green' | 'orange' | 'red' | 'gray'; // バッジの色調
  available: boolean; // 企画検討に利用可能か
}

/**
 * 入力品質スコアを計算（0〜100）
 */
function calculateInputQualityScore(inputSummary: any): number {
  if (!inputSummary) return 0;
  
  let score = 0;
  const maxScore = 100;
  
  // 必須要素のスコア（各20点）
  if (inputSummary.productSummary?.name) score += 20;
  if (inputSummary.personaSummary?.id) score += 20;
  if (inputSummary.usedKbItemIds && inputSummary.usedKbItemIds.length > 0) score += 20;
  
  // ナレッジの充実度（40点）
  const knowledgeCount = 
    (inputSummary.bannerInsightsCount || 0) +
    (inputSummary.marketInsightsCount || 0) +
    (inputSummary.strategyOptionsCount || 0) +
    (inputSummary.planningHooksCount || 0);
  if (knowledgeCount >= 10) score += 40;
  else if (knowledgeCount >= 5) score += 30;
  else if (knowledgeCount >= 2) score += 20;
  else if (knowledgeCount >= 1) score += 10;
  
  return Math.min(score, maxScore);
}

/**
 * 成果物の価値判定（企画判断向け）
 * Step6: presentationがある限りOutputとして表示する（Zod失敗でも「検証失敗」バッジで残す）
 * ルール違反は「UIの表示制限」ではなく「品質警告」として扱う
 */
export function evaluateRunForPlanning(
  run: NormalizedWorkflowRunPayload,
  agentDef?: AgentDefinition | null
): PlanningEvaluationResult {
  const reasons: string[] = [];
  let statusLabel = '未生成';
  let trustLabel = '未生成';
  let badgeTone: 'green' | 'orange' | 'red' | 'gray' = 'gray';
  let available = false;
  
  // Step6: presentationの存在確認（最優先）
  const hasPresentation = !!(run as any).presentation;
  
  // 1. エラー状態の判定
  if (run.status === 'error') {
    statusLabel = 'エラー';
    trustLabel = '実行エラー（再実行が必要）';
    badgeTone = 'red';
    reasons.push('実行ステータスがエラー');
    // Step6: presentationがあれば表示する（エラーでも）
    if (hasPresentation) {
      available = true;
      reasons.push('Presentationあり（表示可能）');
    }
    return { statusLabel, trustLabel, reasons, badgeTone, available };
  }
  
  // 2. 出力の存在確認
  const hasFinalOutput = !!run.finalOutput;
  const hasParsedOutput = !!run.parsedOutput;
  const hasLlmOutput = !!run.llmRawOutput;
  const hasAnyOutput = hasFinalOutput || hasParsedOutput || hasLlmOutput || hasPresentation;
  
  if (!hasAnyOutput) {
    statusLabel = '未生成';
    trustLabel = '未生成（実行結果なし）';
    badgeTone = 'gray';
    reasons.push('出力データが存在しない');
    return { statusLabel, trustLabel, reasons, badgeTone, available };
  }
  
  // 3. Zod検証結果の確認（品質警告として扱う）
  const zodSuccess = run.zodValidationResult?.success === true;
  const zodFailed = run.zodValidationResult?.success === false;
  
  // 4. 入力品質スコアの確認
  const inputQualityScore = calculateInputQualityScore(run.inputSummary);
  const isLowInputQuality = inputQualityScore < 60;
  
  // Step6: presentationがある限りOutputとして表示する（Zod失敗でも表示可能）
  if (hasPresentation) {
    statusLabel = '生成済';
    available = true; // presentationがあれば常に表示可能
    
    if (zodSuccess) {
      trustLabel = '✔ 企画検討に利用可能';
      badgeTone = 'green';
      reasons.push('Presentationあり（表示構造化済み）');
      reasons.push('構造検証済（形式OK）');
    } else if (zodFailed) {
      // Step6: Zod失敗でも「検証失敗」バッジで表示する
      trustLabel = '企画検討に利用可能（検証失敗）';
      badgeTone = 'orange';
      reasons.push('Presentationあり（表示構造化済み）');
      reasons.push('⚠️ 構造検証に失敗（品質警告）');
      if (run.zodValidationResult?.error) {
        reasons.push('検証エラー: ' + (run.zodValidationResult.error.message || '不明'));
      }
    } else {
      trustLabel = '✔ 企画検討に利用可能';
      badgeTone = 'green';
      reasons.push('Presentationあり（表示構造化済み）');
      reasons.push('構造検証未実施');
    }
    
    // 入力品質が低い場合は警告として追加
    if (isLowInputQuality) {
      reasons.push('⚠️ 入力品質スコアが低い（' + inputQualityScore + '/100）- 品質警告');
    }
    
    return { statusLabel, trustLabel, reasons, badgeTone, available };
  }
  
  // Step6: presentationがない場合の既存ロジック（後方互換性のため維持）
  // 5. 総合判定
  if (hasFinalOutput && zodSuccess) {
    // 最良: finalOutputあり + Zod成功
    statusLabel = '生成済';
    trustLabel = '✔ 企画検討に利用可能';
    badgeTone = 'green';
    available = true;
    reasons.push('成果物が保存済み');
    reasons.push('構造検証済（形式OK）');
    if (isLowInputQuality) {
      trustLabel = '企画検討に利用可能（入力品質に注意）';
      reasons.push('⚠️ 入力品質スコアが低い（' + inputQualityScore + '/100）- 品質警告');
    }
  } else if (hasParsedOutput && zodFailed) {
    // 検証失敗: parsedOutputあり + Zod失敗（品質警告として扱う）
    statusLabel = '検証失敗';
    trustLabel = '再生成推奨（検証失敗）';
    badgeTone = 'orange';
    available = true; // Step6: Zod失敗でも表示する
    reasons.push('構造検証に失敗（品質警告）');
    if (run.zodValidationResult?.error) {
      reasons.push('検証エラー: ' + (run.zodValidationResult.error.message || '不明'));
    }
  } else if (hasFinalOutput && !zodSuccess) {
    // finalOutputはあるが検証結果が不明
    statusLabel = '生成済';
    trustLabel = '企画検討に利用可能（検証未実施）';
    badgeTone = 'green';
    available = true;
    reasons.push('成果物が保存済み');
    reasons.push('構造検証未実施');
  } else if (hasParsedOutput && !zodFailed && !hasFinalOutput) {
    // parsedOutputはあるがfinalOutputがない（保存失敗の可能性）
    statusLabel = '生成したが保存失敗';
    trustLabel = '入力不足の可能性（再実行前にInput確認）';
    badgeTone = 'orange';
    reasons.push('パース済みだが保存されていない');
    if (isLowInputQuality) {
      reasons.push('⚠️ 入力品質スコアが低い（' + inputQualityScore + '/100）- 品質警告');
    }
  } else if (hasLlmOutput && !hasParsedOutput) {
    // LLM出力はあるがパース失敗
    statusLabel = '未生成（パース失敗）';
    trustLabel = '再生成推奨（パース失敗）';
    badgeTone = 'orange';
    reasons.push('AI応答はあるがパースに失敗');
  } else if (run.status === 'success' && !hasFinalOutput) {
    // 成功ステータスだが出力がない
    statusLabel = '未生成';
    trustLabel = '入力不足の可能性（再実行前にInput確認）';
    badgeTone = 'orange';
    reasons.push('実行は成功したが成果物が保存されていない');
    if (isLowInputQuality) {
      reasons.push('⚠️ 入力品質スコアが低い（' + inputQualityScore + '/100）- 品質警告');
    }
  } else {
    // その他のケース
    statusLabel = '要確認';
    trustLabel = '要確認';
    badgeTone = 'gray';
    reasons.push('状態が不明確');
  }
  
  return { statusLabel, trustLabel, reasons, badgeTone, available };
}
