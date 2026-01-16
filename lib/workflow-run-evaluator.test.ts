/**
 * フェーズ3-1: OutputListに出る/出ない条件をユニットテストで固定
 * 簡易テスト関数（Node.js環境でも動作するように実装）
 */

import { NormalizedWorkflowRunPayload } from '@/kb/workflow-run-normalizer';
import { Workflow } from '@/types/workflow';
import { AgentDefinition } from '@/types/workflow';
import { evaluateRunForOutputList, inferOutputKind } from './workflow-run-evaluator';

/**
 * テスト用のモックデータ生成ヘルパー
 */
function createMockRun(overrides: Partial<NormalizedWorkflowRunPayload> = {}): NormalizedWorkflowRunPayload {
  return {
    id: 'test-run-1',
    workflowId: 'test-workflow-1',
    nodeId: 'test-node-1',
    agentId: 'test-agent-1',
    agentDefinitionId: 'test-agent-1',
    status: 'success',
    executedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    outputKind: 'lp_structure',
    finalOutput: {
      type: 'lp_structure',
      targetUser: { situation: 'test', desire: 'test', anxiety: 'test' },
      sections: [],
      questions: [],
    },
    ...overrides,
  };
}

function createMockWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'test-workflow-1',
    name: 'Test Workflow',
    nodes: [
      {
        id: 'test-node-1',
        type: 'agent',
        position: { x: 0, y: 0 },
        data: { agentId: 'test-agent-1' },
      },
    ],
    edges: [],
    ...overrides,
  };
}

function createMockAgentDefinition(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    id: 'test-agent-1',
    name: 'Test Agent',
    description: 'Test',
    category: 'planning',
    systemPrompt: 'Test',
    userPromptTemplate: 'Test',
    outputSchema: 'lp_structure',
    outputKind: 'lp_structure',
    editable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * テストケース定義
 */
interface TestCase {
  name: string;
  run: NormalizedWorkflowRunPayload;
  workflow: Workflow;
  agentDefinition?: AgentDefinition | null;
  showAllStatuses?: boolean;
  expectedInclude: boolean;
  expectedReason?: string;
}

const testCases: TestCase[] = [
  {
    name: '正常系: finalOutputあり、workflowId一致、status=success',
    run: createMockRun({
      workflowId: 'test-workflow-1',
      status: 'success',
      finalOutput: { type: 'lp_structure', sections: [] },
    }),
    workflow: createMockWorkflow(),
    expectedInclude: true,
  },
  {
    name: '除外: workflowId不一致',
    run: createMockRun({
      workflowId: 'other-workflow',
      finalOutput: { type: 'lp_structure', sections: [] },
    }),
    workflow: createMockWorkflow(),
    expectedInclude: false,
    expectedReason: 'WORKFLOW_MISMATCH',
  },
  {
    name: '除外: outputが無い',
    run: createMockRun({
      finalOutput: undefined,
      parsedOutput: undefined,
      output: undefined,
    }),
    workflow: createMockWorkflow(),
    expectedInclude: false,
    expectedReason: 'NO_OUTPUT',
  },
  {
    name: '除外: status=error（showAllStatuses=false）',
    run: createMockRun({
      status: 'error',
      finalOutput: { type: 'lp_structure', sections: [] },
    }),
    workflow: createMockWorkflow(),
    showAllStatuses: false,
    expectedInclude: false,
    expectedReason: 'STATUS_FILTERED',
  },
  {
    name: '含む: status=error（showAllStatuses=true）',
    run: createMockRun({
      status: 'error',
      finalOutput: { type: 'lp_structure', sections: [] },
    }),
    workflow: createMockWorkflow(),
    showAllStatuses: true,
    expectedInclude: true,
  },
  {
    name: '含む: parsedOutputあり（finalOutputなし）',
    run: createMockRun({
      finalOutput: undefined,
      parsedOutput: { type: 'lp_structure', sections: [] },
    }),
    workflow: createMockWorkflow(),
    expectedInclude: true,
  },
  {
    name: '含む: workflowId欠落だがagentNodeIdで推論可能',
    run: createMockRun({
      workflowId: '',
      nodeId: 'test-node-1',
      finalOutput: { type: 'lp_structure', sections: [] },
    }),
    workflow: createMockWorkflow(),
    expectedInclude: true,
    expectedReason: 'MISSING_WORKFLOWID_BUT_INFERRED',
  },
  {
    name: '除外: agentId/agentDefinitionIdが無い',
    run: createMockRun({
      agentId: undefined,
      agentDefinitionId: undefined,
      finalOutput: { type: 'lp_structure', sections: [] },
    }),
    workflow: createMockWorkflow(),
    expectedInclude: false,
    expectedReason: 'MISSING_AGENT',
  },
];

/**
 * テスト実行関数（ブラウザ環境でも動作）
 */
export async function runOutputListEvaluationTests(): Promise<{
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; error?: string }>;
}> {
  const results: Array<{ name: string; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = await evaluateRunForOutputList(testCase.run, testCase.workflow, {
        showAllStatuses: testCase.showAllStatuses,
        agentDefinition: testCase.agentDefinition || undefined,
      });

      const passedTest =
        result.include === testCase.expectedInclude &&
        (!testCase.expectedReason || result.reason === testCase.expectedReason);

      if (passedTest) {
        passed++;
        results.push({ name: testCase.name, passed: true });
      } else {
        failed++;
        results.push({
          name: testCase.name,
          passed: false,
          error: `Expected include=${testCase.expectedInclude}, reason=${testCase.expectedReason}, but got include=${result.include}, reason=${result.reason}`,
        });
      }
    } catch (error) {
      failed++;
      results.push({
        name: testCase.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { passed, failed, results };
}

/**
 * テスト結果をコンソールに出力（開発用）
 */
export function logTestResults(results: {
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; error?: string }>;
}): void {
  console.group('📊 OutputList評価テスト結果');
  console.log(`✅ 成功: ${results.passed}件`);
  console.log(`❌ 失敗: ${results.failed}件`);
  console.log('---');
  results.results.forEach((r) => {
    if (r.passed) {
      console.log(`✅ ${r.name}`);
    } else {
      console.error(`❌ ${r.name}: ${r.error}`);
    }
  });
  console.groupEnd();
}
