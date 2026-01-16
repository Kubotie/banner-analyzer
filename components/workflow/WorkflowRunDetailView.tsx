'use client';

import { useState, useEffect, useRef } from 'react';
import { WorkflowRunPayload, ExecutionContextSummary, ValidationResult, PresentationModel, PresentationBlock } from '@/kb/types';
import { KBItem } from '@/kb/types';
import { Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Copy, Hash, Repeat, GitCompare, Download, RefreshCw, FileDown, Pin, Clipboard } from 'lucide-react';
import { AgentDefinition } from '@/types/workflow';
import { getAgentDefinition } from '@/lib/agent-definition-api';
import { OutputViewContract, MainContentContract, MainContentBlock } from '@/types/output-view-contract';
// フェーズ3: Step 5 - インフォグラフィック化OSS
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import JsonView from '@uiw/react-json-view';
// Step1-2: 固定フォーマット廃止 - defaultLpStructureViewContract / defaultBannerStructureViewContractは削除
import { 
  defaultGenericJsonViewContract 
} from '@/types/output-view-contract';
import { useWorkflowStore } from '@/store/useWorkflowStore';
import { evaluateRunForPlanning } from '@/lib/workflow-run-evaluator';
import { normalizeFinalOutputToV2 } from '@/lib/output-normalizer';

/**
 * フェーズ3: Step 5 - Mermaid図解コンポーネント
 */
function MermaidContent({ content, id }: { content: string; id: string }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && content) {
      const element = document.getElementById(id);
      if (element && element.textContent) {
        mermaid.run({
          nodes: [element],
        }).catch((err) => {
          console.warn('[Mermaid] レンダリングエラー:', err);
        });
      }
    }
  }, [content, id]);
  
  return (
    <div id={id} className="mermaid">
      {content}
    </div>
  );
}

/**
 * 出力構造を自動分析して視覚化するコンポーネント（汎用的なアーティファクト表示）
 * outputViewContractが定義されていない場合でも、出力構造から自動的に視覚的な表示を生成
 */
function AutoVisualizedArtifact({ 
  output, 
  agentDefinition 
}: { 
  output: any; 
  agentDefinition: AgentDefinition | null;
}) {
  if (!output || typeof output !== 'object') {
    return (
      <div className="text-center text-gray-500 py-12">
        <p className="text-sm">成果物データがありません</p>
      </div>
    );
  }

  // 出力構造を分析
  const outputKeys = Object.keys(output);
  const blocks: Array<{ id: string; label: string; data: any; type: 'hero' | 'bullets' | 'cards' }> = [];

  // 1. サマリ/要約系のフィールドを検出
  const summaryFields = ['execSummary', 'summary', 'conclusion', 'overview', 'description'];
  const summaryField = summaryFields.find(key => output[key] && typeof output[key] === 'string');
  if (summaryField) {
    blocks.push({
      id: 'summary',
      label: 'サマリ',
      data: output[summaryField],
      type: 'hero',
    });
  }

  // 2. 配列フィールドをカードとして検出
  const arrayFields = outputKeys.filter(key => Array.isArray(output[key]) && output[key].length > 0);
  arrayFields.forEach((key, idx) => {
    const items = output[key];
    if (items.length > 0 && typeof items[0] === 'object') {
      blocks.push({
        id: `array-${key}`,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        data: items,
        type: 'cards',
      });
    }
  });

  // 3. オブジェクトフィールドを箇条書きとして検出
  const objectFields = outputKeys.filter(key => 
    typeof output[key] === 'object' && 
    !Array.isArray(output[key]) && 
    output[key] !== null &&
    !summaryFields.includes(key)
  );
  objectFields.forEach((key) => {
    const obj = output[key];
    if (Object.keys(obj).length > 0) {
      blocks.push({
        id: `object-${key}`,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        data: obj,
        type: 'bullets',
      });
    }
  });

  if (blocks.length === 0) {
    // フォールバック: JSON表示
    return (
      <div className="space-y-6">
        <div className="border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
            成果物
          </h3>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <pre className="text-xs font-mono text-gray-700 overflow-auto max-h-96">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {agentDefinition?.outputArtifactTitle || agentDefinition?.name || '成果物'}
        </h2>
        {agentDefinition?.outputArtifactDescription && (
          <p className="text-sm text-gray-600 mt-2">{agentDefinition.outputArtifactDescription}</p>
        )}
      </div>
      
      {blocks.map((block, idx) => (
        <div 
          key={block.id} 
          className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
          style={{ animationDelay: `${idx * 150}ms` }}
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
            {block.label}
          </h3>
          
          {block.type === 'hero' && (
            <div className="border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg">
              <div className="text-xl font-bold text-gray-900 leading-relaxed whitespace-pre-wrap">
                {block.data}
              </div>
            </div>
          )}
          
          {block.type === 'bullets' && (
            <div className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 shadow-md">
              <ul className="space-y-3">
                {Object.entries(block.data).map(([key, value], fieldIdx) => (
                  <li key={fieldIdx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 font-bold text-xs">{fieldIdx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 mb-1">{key}</div>
                      <div className="text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                        {value !== null && value !== undefined ? (
                          Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1">
                              {value.map((v, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">{String(v)}</span>
                              ))}
                            </div>
                          ) : typeof value === 'object' ? (
                            <div className="text-xs font-mono bg-gray-50 p-2 rounded border">
                              {JSON.stringify(value, null, 2)}
                            </div>
                          ) : (
                            <span className="font-medium">{String(value)}</span>
                          )
                        ) : (
                          <span className="text-gray-400 italic">未入力</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {block.type === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {block.data.map((item: any, itemIdx: number) => (
                <div 
                  key={itemIdx}
                  className="border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {itemIdx + 1}
                    </div>
                    <div className="flex-1">
                      {item.name && (
                        <div className="font-bold text-lg text-gray-900 mb-1">{item.name}</div>
                      )}
                      {item.title && (
                        <div className="font-bold text-lg text-gray-900 mb-1">{item.title}</div>
                      )}
                      {(item.role || item.subtitle) && (
                        <div className="text-sm text-gray-600 bg-white/60 px-2 py-1 rounded border border-gray-200">
                          {item.role || item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                    {Object.entries(item).filter(([key]) => !['name', 'title', 'role', 'subtitle'].includes(key)).map(([key, value]) => (
                      <div key={key} className="bg-white/80 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          {key}
                        </div>
                        <div className="text-sm text-gray-900">
                          {value !== null && value !== undefined ? (
                            Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-1.5">
                                {value.map((v, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium">
                                    {String(v)}
                                  </span>
                                ))}
                              </div>
                            ) : typeof value === 'object' ? (
                              <div className="text-xs font-mono bg-gray-50 p-2 rounded border">
                                {JSON.stringify(value, null, 2)}
                              </div>
                            ) : (
                              <span className="font-medium">{String(value)}</span>
                            )
                          ) : (
                            <span className="text-gray-400 italic">未入力</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface WorkflowRunDetailViewProps {
  runItem: KBItem;
  runPayload: WorkflowRunPayload;
  onReuse?: (runId: string) => void; // Reuse機能のコールバック
  onCompare?: (runId: string) => void; // Compare機能のコールバック（フェーズ3-6）
  onExport?: (runId: string) => void; // Export機能のコールバック（フェーズ3-6）
  onRegenerate?: (runId: string) => void; // Regenerate機能のコールバック（フェーズ3-6）
}

// 配列をチップ表示（max 8件で折りたたみ）
function ArrayChips({ arr, maxVisible = 8 }: { arr: any[]; maxVisible?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? arr : arr.slice(0, maxVisible);
  const remaining = arr.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleItems.map((item, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200"
        >
          {typeof item === 'object' ? JSON.stringify(item) : String(item)}
        </span>
      ))}
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-300 hover:bg-gray-200"
        >
          +{remaining}件
        </button>
      )}
      {expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-300 hover:bg-gray-200"
        >
          折りたたむ
        </button>
      )}
    </div>
  );
}

// bannerIdeasをカードUIで表示
function BannerIdeasCards({ bannerIdeas }: { bannerIdeas: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? bannerIdeas : bannerIdeas.slice(0, 3);
  const remaining = bannerIdeas.length - 3;

  return (
    <div className="space-y-3">
      {visibleItems.map((banner, idx) => (
        <div key={idx} className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="space-y-2 text-sm">
            {banner.pattern && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">パターン</div>
                <div className="text-gray-700">{banner.pattern}</div>
              </div>
            )}
            {banner.singleValuePromise && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">約束する価値</div>
                <div className="text-gray-700">{banner.singleValuePromise}</div>
              </div>
            )}
            {banner.targetState && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">狙うユーザー状態</div>
                <div className="text-gray-700">{banner.targetState}</div>
              </div>
            )}
            {banner.mainCopyDirection && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">メインコピー方向性</div>
                <div className="text-gray-700">{banner.mainCopyDirection}</div>
              </div>
            )}
            {banner.subElements && Array.isArray(banner.subElements) && banner.subElements.length > 0 && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">サブ要素</div>
                <ArrayChips arr={banner.subElements} />
              </div>
            )}
            {banner.avoid && Array.isArray(banner.avoid) && banner.avoid.length > 0 && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">避けること</div>
                <ArrayChips arr={banner.avoid} />
              </div>
            )}
            {banner.lpShouldAnswer && Array.isArray(banner.lpShouldAnswer) && banner.lpShouldAnswer.length > 0 && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">LPで答えること</div>
                <ArrayChips arr={banner.lpShouldAnswer} />
              </div>
            )}
          </div>
        </div>
      ))}
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
        >
          さらに{remaining}件を表示
        </button>
      )}
      {expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          折りたたむ
        </button>
      )}
    </div>
  );
}

/**
 * ワークフロー実行結果の詳細表示（可視化対応）
 * Step2: 優先度設計で3ブロック構造に再構成
 */
export default function WorkflowRunDetailView({ runItem, runPayload, onReuse, onCompare, onExport, onRegenerate }: WorkflowRunDetailViewProps) {
  const { activeWorkflow, addNode } = useWorkflowStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    input: false,
    rawOutput: false, // Step3: JSONはRawタブでのみ表示
    parsedOutput: false,
    validation: false,
    executionProof: false, // デフォルトで折り畳み（Step2: Cブロック）
  });
  
  // フェーズ3: Step 5 - Mermaid初期化
  useEffect(() => {
    if (typeof window !== 'undefined') {
      mermaid.initialize({ 
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
      });
    }
  }, []);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({}); // セクションID -> タブ名
  const [agentDefinition, setAgentDefinition] = useState<AgentDefinition | null>(null);
  const [outputViewContract, setOutputViewContract] = useState<OutputViewContract | null>(null);
  const [isPinned, setIsPinned] = useState<boolean>(runItem.tags?.includes('pinned') || false);
  
  // 【重要】planningEval等のシステム評価はcontractが許可した時だけ使用
  // Step 4: contractにsystemMetaセクションがある時だけplanningEvalを計算
  const [systemMeta, setSystemMeta] = useState<any>(null);
  useEffect(() => {
    if (agentDefinition && runPayload && outputViewContract) {
      // contractにsystemMetaセクションがあるかチェック
      const hasSystemMetaSection = outputViewContract.sections?.some(s => s.type === 'executionProof' || s.id === 'systemMeta');
      if (hasSystemMetaSection) {
        // contractが許可した時だけplanningEvalを計算
        const planningEval = evaluateRunForPlanning(runPayload, agentDefinition);
        setSystemMeta({
          planningEval,
          // その他のシステム評価もここに追加可能
        });
        
        // contractにexecutionProofセクションがあり、検証失敗の時だけ自動展開
        const executionProofSection = outputViewContract.sections?.find(s => s.type === 'executionProof');
        if (executionProofSection && (planningEval?.statusLabel === '検証失敗' || planningEval?.statusLabel === 'エラー')) {
          setExpandedSections(prev => ({ ...prev, executionProof: true }));
        }
      } else {
        // contractにsystemMetaセクションがない場合は計算しない
        setSystemMeta(null);
      }
    }
  }, [agentDefinition, runPayload, outputViewContract]);

  // 【重要】outputViewContractを唯一の真実にする
  // Step 1: AgentDefinitionからcontractを取得（システム分岐禁止）
  const agentId = runPayload.agentDefinitionId || runPayload.agentId;
  useEffect(() => {
    const loadAgentDefinition = async () => {
      // Step2-1: contract解決順を固定（ユーザー契約100%優先）
      // 1. agentDefinition.outputViewContract（ユーザー定義）
      // 2. （存在しない場合のみ）defaultGenericJsonViewContract
      // ※ "システムが勝手に contract を補完/アップグレード" はしない（managedBy=user を尊重）
      
      if (!agentId) {
        // agentIdがない場合のみフォールバック（contract欠損時のみ）
        console.warn('[WorkflowRunDetailView] agentIdがありません。フォールバックcontractを使用します。');
        setOutputViewContract(defaultGenericJsonViewContract);
        return;
      }
      
      const def = await getAgentDefinition(agentId);
      if (def) {
        setAgentDefinition(def);
        // Step2-1: contractが設定されていればそれを使用（唯一の真実、ユーザー契約100%優先）
        if (def.outputViewContract) {
          setOutputViewContract(def.outputViewContract);
          // 検証: contractがあるのにフォールバックに落ちるのはバグ
          if (process.env.NODE_ENV === 'development') {
            console.log('[WorkflowRunDetailView] ✓ contractを読み込みました:', {
              agentId: def.id,
              contractVersion: def.outputViewContract.version,
              managedBy: def.outputViewContract.meta?.managedBy || 'system',
              sectionsCount: def.outputViewContract.sections?.length || 0,
            });
          }
        } else {
          // Step2-1: contractが無い場合のみdefaultGenericJsonViewContractを使用（固定フォーマット廃止）
          console.warn('[WorkflowRunDetailView] outputViewContractが定義されていません。フォールバックcontractを使用します。', {
            agentId: def.id,
            agentName: def.name,
          });
          setOutputViewContract(defaultGenericJsonViewContract);
        }
      } else {
        // AgentDefinitionが見つからない場合のみフォールバック
        console.warn('[WorkflowRunDetailView] AgentDefinitionが見つかりません。フォールバックcontractを使用します。', { agentId });
        setOutputViewContract(defaultGenericJsonViewContract);
      }
    };
    
    loadAgentDefinition();
  }, [agentId]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('クリップボードにコピーしました');
  };

  // 【重要】Markdownエクスポートはcontract駆動（システム分岐禁止）
  const exportToMarkdown = () => {
    const rawOutput = runPayload.finalOutput || runPayload.parsedOutput || runPayload.output;
    if (!rawOutput) return;
    // フェーズ4: v2正規化
    const output = normalizeFinalOutputToV2(rawOutput);
    
    // contractのtitleを使用
    const title = outputViewContract?.title || agentDefinition?.outputArtifactTitle || '成果物';
    let markdown = `# ${title}\n\n`;
    
    // contractのsectionsに基づいてMarkdownを生成（システム分岐禁止）
    if (outputViewContract?.sections && outputViewContract.sections.length > 0) {
      outputViewContract.sections.forEach((section) => {
        if (section.type === 'executionProof' || section.type === 'raw') return; // メタ情報は除外
        
        const { value: sectionData } = section.path ? getDataByPath(output, section.path, section.id) : { value: output };
        if (!sectionData) return;
        
        markdown += `## ${section.label || section.id}\n\n`;
        
        if (section.type === 'summary' && section.summary) {
          const { titlePath, subtitleTemplate, items } = section.summary;
          if (titlePath) {
            const { value: titleValue } = getDataByPath(output, titlePath, section.id);
            if (titleValue && typeof titleValue === 'string') {
              markdown += `${titleValue}\n\n`;
            }
          }
          if (items && items.length > 0) {
            items.forEach((item) => {
              const itemPath = item.path || (item as any).valuePath;
              const { value } = itemPath ? getDataByPath(output, itemPath, section.id) : { value: null };
              if (value !== null && value !== undefined) {
                const displayValue = Array.isArray(value) ? `${value.length}件` : String(value);
                markdown += `- **${item.label}**: ${displayValue}\n`;
              }
            });
            markdown += `\n`;
          }
        } else if (section.type === 'cards' && section.cards) {
          const { value: items } = getDataByPath(output, section.cards.itemsPath, section.id);
          const itemsArray = Array.isArray(items) ? items : [];
          if (itemsArray.length > 0) {
            itemsArray.forEach((item: any, idx: number) => {
              const { value: title } = section.cards?.titlePath ? getDataByPath(item, section.cards.titlePath, section.id) : { value: item.name || item.title };
              markdown += `### ${idx + 1}. ${title || `アイテム${idx + 1}`}\n\n`;
              if (section.cards?.fields) {
                section.cards.fields.forEach((field) => {
                  const value = getDataByPath(item, field.valuePath);
                  if (value !== null && value !== undefined) {
                    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                    markdown += `- **${field.label}**: ${displayValue}\n`;
                  }
                });
              }
              markdown += `\n`;
            });
          }
        } else if (section.type === 'table' && section.table) {
          const { value: rows } = getDataByPath(output, section.table.rowsPath, section.id);
          const rowsArray = Array.isArray(rows) ? rows : [];
          if (rowsArray.length > 0) {
            markdown += `| ${section.table.columns.map(col => col.label).join(' | ')} |\n`;
            markdown += `| ${section.table.columns.map(() => '---').join(' | ')} |\n`;
            rowsArray.forEach((row: any) => {
              const values = section.table!.columns.map(col => {
                const valuePath = col.valuePath || col.key;
                const { value } = getDataByPath(row, valuePath, section.id);
                return value !== null && value !== undefined ? String(value) : '-';
              });
              markdown += `| ${values.join(' | ')} |\n`;
            });
            markdown += `\n`;
          }
        }
      });
    } else {
      // contractがない場合のみ、JSONをそのままMarkdown化（最小限のフォールバック）
      markdown += '```json\n';
      markdown += JSON.stringify(output, null, 2);
      markdown += '\n```\n';
    }
    
    navigator.clipboard.writeText(markdown);
    alert('Markdownをクリップボードにコピーしました');
  };

  // 1. UIに出す"人間向けラベル"を追加（翻訳レイヤー）
  // 【重要】contractを唯一の真実にする - outputKind分岐を削除
  const getArtifactTypeLabel = (): string => {
    // contractのtitleを使用（システム分岐禁止）
    if (outputViewContract?.title) {
      return outputViewContract.title;
    }
    // contractがない場合のみフォールバック
    return agentDefinition?.outputArtifactTitle || agentDefinition?.name || '成果物';
  };

  const getExecutionStatusLabel = (): { label: string; color: string; icon: 'success' | 'error' | 'warning' } => {
    // Step2: Zod失敗でもstatusはsuccess（品質評価として記録）
    if (runPayload.status === 'success' && runPayload.finalOutput) {
      return { label: '生成済', color: 'green', icon: 'success' };
    } else if (runPayload.status === 'success' && runPayload.parsedOutput && !runPayload.finalOutput) {
      return { label: '生成したが保存失敗', color: 'orange', icon: 'warning' };
    } else if (runPayload.parsedOutput && runPayload.zodValidationResult && !runPayload.zodValidationResult.success) {
      // Step2: Zod検証失敗は警告として表示（ハードエラーではない）
      return { label: '検証失敗（形式が崩れているため整形推奨）', color: 'orange', icon: 'warning' };
    } else if (runPayload.status === 'error') {
      return { label: 'エラー', color: 'red', icon: 'error' };
    } else if (runPayload.llmRawOutput && !runPayload.parsedOutput) {
      return { label: '未生成（パース失敗）', color: 'orange', icon: 'warning' };
    } else if (runPayload.llmRawOutput && !runPayload.parsedOutput && !runPayload.finalOutput) {
      // Step1: rawのみの場合は「成果物（下書き）」として表示
      return { label: '成果物（下書き）', color: 'blue', icon: 'success' };
    }
    return { label: '未生成', color: 'gray', icon: 'warning' };
  };

  const getReliabilityLabel = (): { label: string; color: string; available: boolean } => {
    // Step2: Zod失敗でもrun保存は成功扱い（statusはsuccess、validationはwarning）
    if (runPayload.status === 'success' && runPayload.finalOutput && runPayload.zodValidationResult?.success) {
      return { label: '✔ 企画検討に利用可能', color: 'green', available: true };
    } else if (runPayload.parsedOutput && runPayload.zodValidationResult && !runPayload.zodValidationResult.success) {
      // Step2: UIで「形式が崩れているため整形推奨」と表示
      return { label: '形式が崩れているため整形推奨', color: 'orange', available: true }; // Step2: 実行は許可（利用可能）
    } else if (runPayload.status === 'success' && runPayload.parsedOutput && !runPayload.finalOutput) {
      return { label: '入力不足の可能性（再実行前にInput確認）', color: 'orange', available: false };
    } else if (runPayload.status === 'success' && runPayload.llmRawOutput && !runPayload.parsedOutput && !runPayload.finalOutput) {
      // Step1: rawのみの場合は「成果物（下書き）」として利用可能
      return { label: '成果物（下書き）', color: 'blue', available: true };
    } else if (!runPayload.parsedOutput && !runPayload.finalOutput && !runPayload.llmRawOutput) {
      return { label: '未生成', color: 'gray', available: false };
    }
    return { label: '要確認', color: 'gray', available: false };
  };

  // Reuse機能: RunをInputとして再利用
  const handleReuse = () => {
    if (!activeWorkflow) {
      alert('ワークフローを選択してください');
      return;
    }
    
    if (onReuse) {
      onReuse(runItem.kb_id);
    } else {
      // デフォルト実装: workflow_run_refノードを追加
      const agentName = agentDefinition?.name || runItem.title.split(' - ')[0];
      const executedAt = new Date(runPayload.executedAt || runPayload.startedAt).toLocaleString('ja-JP');
      const displayName = `${agentName} @ ${executedAt}`;
      
      const newNode = {
        id: `input-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'input' as const,
        kind: 'knowledge' as const,
        label: displayName,
        position: {
          x: Math.random() * 300 + 50,
          y: Math.random() * 300 + 50,
        },
        data: {
          inputKind: 'workflow_run_ref' as const,
          refId: runItem.kb_id,
          refKind: 'workflow_run',
          title: displayName,
        },
        notes: `Run ID: ${runItem.kb_id}`,
      };
      
      addNode(newNode);
      alert(`「${displayName}」をInputノードとして追加しました`);
    }
  };

  // ピン留め機能
  const handlePin = async () => {
    try {
      const currentTags = runItem.tags || [];
      const newTags = isPinned
        ? currentTags.filter((tag) => tag !== 'pinned')
        : [...currentTags, 'pinned'];
      
      const response = await fetch(`/api/kb/items/${runItem.kb_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: newTags,
        }),
      });
      
      if (!response.ok) {
        throw new Error('ピン留めの更新に失敗しました');
      }
      
      setIsPinned(!isPinned);
      // runItemを更新（再読み込みは不要だが、状態を同期）
      runItem.tags = newTags;
    } catch (error) {
      console.error('ピン留めエラー:', error);
      alert(`ピン留めの更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const artifactType = getArtifactTypeLabel();
  const executionStatus = getExecutionStatusLabel();
  const reliability = getReliabilityLabel();

  // Step4: path仕様を統一（JSONPath標準化）
  // $.finalOutput.... のような JSONPath を標準にする
  const getDataByPath = (obj: any, path: string | undefined, sectionId?: string): { value: any; error?: string } => {
    if (!path) return { value: obj };
    
    // JSONPath形式（$で始まる）の場合は$を除去
    let normalizedPath = path.startsWith('$.') ? path.substring(2) : path;
    
    // finalOutput. で始まる場合は finalOutput を除去（v2正規形対応）
    if (normalizedPath.startsWith('finalOutput.')) {
      normalizedPath = normalizedPath.substring('finalOutput.'.length);
    }
    
    const keys = normalizedPath.split('.');
    let current = obj;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Step4: pathが解決できない場合は警告を返す
        const error = `パス「${path}」が見つかりません（セクション: ${sectionId || 'unknown'}）`;
        if (process.env.NODE_ENV === 'development') {
          console.warn('[WorkflowRunDetailView]', error);
      }
        return { value: null, error };
    }
    }
    return { value: current };
  };
  
  // テンプレート展開（{{$.path}}形式）
  const expandTemplate = (template: string, data: any): string => {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const { value } = getDataByPath(data, path.trim());
      return value !== null && value !== undefined ? String(value) : '';
    });
  };

  // 汎用オブジェクトを整形表示（1階層まで展開）
  const renderFormattedObject = (obj: any, depth: number = 0): JSX.Element => {
    if (depth > 1) {
      return <div className="text-xs text-gray-400">（詳細を開く）</div>;
    }

    return (
      <div className="space-y-2">
        {Object.entries(obj).map(([key, value]) => (
          <div key={key} className="border-b pb-2 last:border-b-0">
            <div className="font-medium text-gray-700 mb-1">{key}:</div>
            <div className="pl-4 text-gray-600">
              {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? (
                String(value)
              ) : Array.isArray(value) ? (
                <ArrayChips arr={value} />
              ) : typeof value === 'object' && value !== null ? (
                renderFormattedObject(value, depth + 1)
              ) : (
                '-'
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // セクションをレンダリング（outputViewContractベース）
  const renderSection = (
    section: OutputViewContract['sections'][0],
    output: any,
    contract: OutputViewContract,
    agentDef: AgentDefinition | null
  ) => {
    const { value: sectionData, error: sectionPathError } = section.path ? getDataByPath(output, section.path, section.id) : { value: output };
    // Step4: pathが解決できない場合は警告を表示
    if (sectionPathError) {
      return (
        <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
          ⚠️ {sectionPathError}
        </div>
      );
    }

    switch (section.type) {
      case 'summary':
        // 新しい構造: section.summary を使用
        if (section.summary) {
          const { titlePath, subtitleTemplate, items } = section.summary;
          const { value: title, error: titleError } = titlePath ? getDataByPath(output, titlePath, section.id) : { value: null };
          // Step C: subtitleTemplateの配列参照を安全化（{{xxx.length}}はOK、{{xxx[0]...}}は長文化するのでトリム）
          const subtitle = subtitleTemplate ? subtitleTemplate.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const trimmedPath = path.trim();
            // 配列のlength参照は許可（例: {{finalOutput.sections.length}}）
            if (trimmedPath.endsWith('.length')) {
              const arrayPath = trimmedPath.replace(/\.length$/, '');
              const { value: arrayValue } = getDataByPath(output, arrayPath, section.id);
              return Array.isArray(arrayValue) ? String(arrayValue.length) : '0';
            }
            // 配列要素への直接参照（例: {{bannerIdeas[0].pattern}}）は長文化するので表示しない
            if (trimmedPath.includes('[') && trimmedPath.includes(']')) {
              return ''; // 配列要素参照は空文字（長文化を防ぐ）
            }
            const { value } = getDataByPath(output, trimmedPath, section.id);
            // object/arrayの場合は空文字（JSON化を防ぐ）
            if (value !== null && value !== undefined && (typeof value === 'object' || Array.isArray(value))) {
              return '';
            }
            return value !== null && value !== undefined ? String(value) : '';
          }) : null;
          
          // Step C: title/subtitleの安全化（JSON化完全撲滅）
          const safeTitle = title !== null && title !== undefined
            ? (typeof title === 'object' || Array.isArray(title)
                ? null // object/arrayの場合は表示しない
                : String(title))
            : null;
          const safeSubtitle = subtitle && subtitle.length > 0
            ? (subtitle.includes('[object') || subtitle.includes('[array') || subtitle.trim() === ''
                ? '内容が多いため下のカードで確認' // テンプレート展開結果がobject/arrayの場合、または空文字の場合
                : subtitle.trim()) // トリムして余分な空白を除去
            : null;
          
          return (
            <div className="space-y-3">
              {safeTitle && (
                <div className="text-sm font-semibold text-gray-900">{safeTitle}</div>
              )}
              {!safeTitle && title !== null && title !== undefined && (
                <div className="text-xs text-blue-600 italic">内容が多いため下のカードで確認</div>
              )}
              {safeSubtitle && (
                <div className="text-xs text-gray-600">{safeSubtitle}</div>
              )}
              {items && items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    // Step4: pathがあればpathを使用、なければvaluePath（後方互換）
                    const itemPath = item.path || (item as any).valuePath;
                    const { value, error: itemPathError } = itemPath ? getDataByPath(output, itemPath, section.id) : { value: null };
                    // Step3: summary制限撤廃 - 配列/長文/オブジェクトを適切に表示
                    let displayValue: string | JSX.Element;
                    
                    // Step4: path解決エラーの場合は警告を表示
                    if (itemPathError) {
                      displayValue = (
                        <span className="text-yellow-600 text-xs">⚠️ {itemPathError}</span>
                      );
                    } else if (value === null || value === undefined) {
                      displayValue = '-';
                    } else if (Array.isArray(value)) {
                      // Step3: 配列はチップ/箇条書き（最大N件+展開）
                      const maxVisible = 5;
                      const visibleItems = value.slice(0, maxVisible);
                      const remaining = value.length - maxVisible;
                      
                        displayValue = (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {visibleItems.map((v, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                            ))}
                            {remaining > 0 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{remaining}件
                              </span>
                            )}
                          </div>
                          {remaining > 0 && (
                            <details className="cursor-pointer text-xs">
                              <summary className="text-blue-600 hover:underline">すべて表示（{value.length}件）</summary>
                              <div className="mt-2 p-2 bg-gray-50 border rounded">
                                <ul className="list-disc list-inside space-y-1">
                                  {value.map((v, i) => (
                                    <li key={i} className="text-xs">
                                      {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    } else if (typeof value === 'object') {
                      // Step3: オブジェクトはKey-Value表で表示
                        displayValue = (
                        <div className="text-xs">
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:underline">オブジェクトを展開</summary>
                            <div className="mt-2 p-2 bg-gray-50 border rounded">
                              <table className="w-full text-xs">
                                <tbody>
                                  {Object.entries(value).map(([key, val]) => (
                                    <tr key={key} className="border-b">
                                      <td className="font-medium text-gray-700 py-1 pr-4">{key}:</td>
                                      <td className="text-gray-900 py-1">
                                        {typeof val === 'object' ? (
                                          <pre className="text-xs">{JSON.stringify(val, null, 2)}</pre>
                                        ) : (
                                          String(val)
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        </div>
                      );
                    } else if (typeof value === 'string' && value.length > 100) {
                      // Step3: 長文は2行クランプ+展開
                      const lines = value.split('\n');
                      const preview = lines.slice(0, 2).join('\n');
                      const hasMore = lines.length > 2 || value.length > 200;
                      
                        displayValue = (
                        <div className="text-xs">
                          <div className="line-clamp-2 text-gray-700 mb-1">{preview}</div>
                          {hasMore && (
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:underline">全文を展開（{value.length}文字）</summary>
                              <div className="mt-2 p-2 bg-gray-50 border rounded whitespace-pre-wrap">
                                {value}
                              </div>
                            </details>
                          )}
                        </div>
                        );
                      } else {
                      // 短い文字列/数値/booleanはそのまま表示
                      displayValue = String(value);
                    }
                    
                    return (
                      <div key={idx} className="text-xs">
                        <div className="font-medium text-gray-700 mb-1">{item.label}:</div>
                        <div className="text-gray-600">
                          {typeof displayValue === 'string' ? displayValue : displayValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        // 【重要】contractにsummary定義がない場合はエラー（システム側の推測を禁止）
        console.warn('[WorkflowRunDetailView] summaryセクションにsummary定義がありません。', {
          sectionId: section.id,
          sectionLabel: section.label,
        });
        return <div className="text-xs text-gray-500">サマリ定義がありません（contractを確認してください）</div>;

      case 'table':
        // 新しい構造: section.table を使用
        if (section.table) {
          const { rowsPath, columns } = section.table;
          const { value: rows, error: rowsPathError } = rowsPath ? getDataByPath(output, rowsPath, section.id) : { value: sectionData };
          
          // Step4: pathが解決できない場合は警告を表示
          if (rowsPathError) {
            return (
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
                ⚠️ {rowsPathError}
              </div>
            );
          }
          
          if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return <div className="text-xs text-gray-500">テーブルデータがありません</div>;
          }
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    {columns.map((col) => (
                      <th key={col.key} className="border p-2 text-left">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any, idx: number) => (
                    <tr key={idx}>
                      {columns.map((col) => {
                        const valuePath = col.valuePath || col.key;
                        const { value, error: colPathError } = getDataByPath(row, valuePath, section.id);
                        return (
                          <td key={col.key} className="border p-2">
                            {colPathError ? (
                              <span className="text-yellow-600 text-xs">⚠️ {colPathError}</span>
                            ) : (
                              Array.isArray(value) ? value.join(', ') : String(value !== null && value !== undefined ? value : '-')
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <div className="text-xs text-gray-500">テーブル定義がありません</div>;

      case 'cards':
        // 新しい構造: section.cards を使用
        if (section.cards) {
          const { itemsPath, titlePath, subtitlePath, fields } = section.cards;
          const { value: items, error: itemsPathError } = itemsPath ? getDataByPath(output, itemsPath, section.id) : { value: sectionData };
          
          // Step4: pathが解決できない場合は警告を表示
          if (itemsPathError) {
            return (
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
                ⚠️ {itemsPathError}
              </div>
            );
          }
          
          if (!items || !Array.isArray(items) || items.length === 0) {
            return <div className="text-xs text-gray-500">カードデータがありません</div>;
          }
          return (
            <div className="space-y-3">
              {items.map((item: any, index: number) => {
                // 【重要】正規化処理はcontractのdataTransformに移す（システム側の勝手な整形を禁止）
                // ここでは正規化しない（contractが許可した時だけdataTransformで処理）
                const { value: title } = titlePath ? getDataByPath(item, titlePath, section.id) : { value: null };
                const { value: subtitle } = subtitlePath ? getDataByPath(item, subtitlePath, section.id) : { value: null };
                
                return (
                  <div key={index} className="p-3 bg-gray-50 border rounded">
                    {title && (
                      <div className="font-semibold text-sm mb-2">{String(title)}</div>
                    )}
                    {subtitle && (
                      <div className="text-xs text-gray-600 mb-2">{String(subtitle)}</div>
                    )}
                    {fields && fields.length > 0 && (
                      <div className="space-y-2">
                        {fields.map((field, fieldIdx) => {
                          const { value, error: fieldPathError } = getDataByPath(item, field.valuePath, section.id);
                          return (
                            <div key={fieldIdx} className="text-xs">
                              <div className="font-medium text-gray-700 mb-1">{field.label}:</div>
                              <div className="text-gray-600">
                                {fieldPathError ? (
                                  <span className="text-yellow-600">⚠️ {fieldPathError}</span>
                                ) : (
                                  Array.isArray(value) ? value.join(', ') : String(value !== null && value !== undefined ? value : '-')
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }
        // 【重要】contractにcards定義がない場合はエラー（システム側の推測を禁止）
        console.warn('[WorkflowRunDetailView] cardsセクションにcards定義がありません。', {
          sectionId: section.id,
          sectionLabel: section.label,
        });
        return <div className="text-xs text-gray-500">カード定義がありません（contractを確認してください）</div>;

      case 'checklist':
        // 新しい構造: section.checklist を使用
        if (section.checklist) {
          const { itemsPath } = section.checklist;
          const { value: checklistItems } = itemsPath ? getDataByPath(output, itemsPath, section.id) : { value: agentDef?.qualityChecklist };
          if (!checklistItems || !Array.isArray(checklistItems) || checklistItems.length === 0) {
            return <div className="text-xs text-gray-500">チェックリストが設定されていません</div>;
          }
          return (
            <div className="space-y-2 text-xs">
              {checklistItems.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          );
        }
        // 【重要】contractにchecklist定義がない場合はエラー（システム側の推測を禁止）
        console.warn('[WorkflowRunDetailView] checklistセクションにchecklist定義がありません。', {
          sectionId: section.id,
          sectionLabel: section.label,
        });
        return <div className="text-xs text-gray-500">チェックリスト定義がありません（contractを確認してください）</div>;

      case 'raw':
        // Step5: デバッグ専用（最下部・折り畳み・@uiw/react-json-view使用）
        if (section.raw?.tabs && section.raw.tabs.length > 0) {
          const tabData: Record<string, any> = {};
          section.raw.tabs.forEach((tabName) => {
            if (tabName === 'finalOutput') tabData[tabName] = runPayload.finalOutput || runPayload.output;
            else if (tabName === 'parsedOutput') tabData[tabName] = runPayload.parsedOutput;
            else if (tabName === 'llmRawOutput') tabData[tabName] = runPayload.llmRawOutput;
            else if (tabName === 'validation') tabData[tabName] = runPayload.zodValidationResult;
          });
          // タブ状態を親コンポーネントで管理
          const currentTab = activeTabs[section.id] || section.raw.tabs[0];
          return (
            <div>
              {section.raw.tabs.length > 1 && (
                <div className="flex gap-1 border-b mb-4">
                  {section.raw.tabs.map((tab) => {
                    const isActive = tab === currentTab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTabs(prev => ({ ...prev, [section.id]: tab }))}
                        className={`px-3 py-1 text-xs border-b-2 ${
                          isActive ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-600'
                        }`}
                      >
                        {tab === 'finalOutput' ? 'Final Output' :
                         tab === 'parsedOutput' ? 'Parsed Output' :
                         tab === 'llmRawOutput' ? 'LLM Raw Output' :
                         tab === 'validation' ? 'Validation Result' :
                         tab}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-xs text-gray-700">
                    {currentTab === 'finalOutput' ? 'Final Output' :
                     currentTab === 'parsedOutput' ? 'Parsed Output' :
                     currentTab === 'llmRawOutput' ? 'LLM Raw Output' :
                     currentTab === 'validation' ? 'Validation Result' :
                     currentTab}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Step5: コピーJSONボタン */}
                  <button
                    onClick={() => {
                      const data = tabData[currentTab];
                        const jsonText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                        navigator.clipboard.writeText(jsonText).then(() => {
                          alert('JSONをクリップボードにコピーしました');
                        }).catch((err) => {
                          console.error('コピー失敗:', err);
                          alert('コピーに失敗しました');
                        });
                      }}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                      title="JSONをコピー"
                    >
                      <Clipboard className="w-3 h-3" />
                      コピー
                    </button>
                    {/* Step5: ダウンロードJSONボタン */}
                    <button
                      onClick={() => {
                        const data = tabData[currentTab];
                        const jsonText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                        const blob = new Blob([jsonText], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${currentTab}-${runItem.kb_id}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                      title="JSONをダウンロード"
                    >
                      <Download className="w-3 h-3" />
                      ダウンロード
                  </button>
                </div>
                </div>
                {/* Step5: @uiw/react-json-viewでJSONを美しく表示（デバッグ専用） */}
                {(() => {
                  const data = tabData[currentTab];
                  if (typeof data === 'string') {
                    return (
                      <pre className="p-3 bg-gray-50 border rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap break-words">
                        {data}
                      </pre>
                    );
                  }
                  return (
                    <div className="p-3 bg-gray-50 border rounded overflow-auto max-h-60">
                      <JsonView value={data} style={{ backgroundColor: 'transparent' }} />
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        }
        // 【重要】contractにraw定義がない場合はエラー（システム側の推測を禁止）
        console.warn('[WorkflowRunDetailView] rawセクションにraw定義がありません。', {
          sectionId: section.id,
          sectionLabel: section.label,
        });
        return <div className="text-xs text-gray-500">Raw定義がありません（contractを確認してください）</div>;

      case 'executionProof':
        // Step1: executionProofセクションを描画対応
        const rawTabs = section.raw?.tabs || ['proof', 'qualityCheck', 'finalOutput', 'parsedOutput', 'llmRawOutput', 'validation'];
        const currentTab = activeTabs[section.id] || rawTabs[0];
        
        return (
          <div className="space-y-4">
            {/* タブ切替 */}
            {rawTabs.length > 1 && (
              <div className="flex gap-1 border-b mb-4">
                {rawTabs.map((tab) => {
                  const isActive = tab === currentTab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTabs(prev => ({ ...prev, [section.id]: tab }))}
                      className={`px-3 py-1.5 text-xs border-b-2 ${
                        isActive
                          ? 'border-blue-500 text-blue-600 font-semibold' 
                          : 'border-transparent text-gray-600'
                      }`}
                    >
                      {tab === 'proof' ? '実行証明' :
                       tab === 'qualityCheck' ? '品質チェック' :
                       tab === 'finalOutput' ? 'Final Output' :
                       tab === 'parsedOutput' ? 'Parsed Output' :
                       tab === 'llmRawOutput' ? 'LLM Raw Output' :
                       tab === 'validation' ? 'Validation Result' :
                       tab}
                    </button>
                  );
                })}
              </div>
            )}

            {/* タブコンテンツ */}
            {(() => {
              // proofタブ: 実行状態情報
              if (currentTab === 'proof') {
                return (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-600 mb-1">実行状態</div>
                      <div className="flex items-center gap-1">
                        {runPayload.status === 'success' ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-medium">成功</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-600 font-medium">エラー</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">実行時間</div>
                      <div className="font-medium">
                        {runPayload.durationMs ? `${(runPayload.durationMs / 1000).toFixed(2)}秒` : '不明'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">開始時刻</div>
                      <div className="font-medium">
                        {new Date(runPayload.startedAt || runPayload.executedAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">終了時刻</div>
                      <div className="font-medium">
                        {runPayload.finishedAt 
                          ? new Date(runPayload.finishedAt).toLocaleString('ja-JP')
                          : runPayload.status === 'success' ? '完了' : '未完了'}
                      </div>
                    </div>
                    {runPayload.model && (
                      <div>
                        <div className="text-gray-600 mb-1">モデル</div>
                        <div className="font-medium">{runPayload.model}</div>
                      </div>
                    )}
                    {runPayload.agentDefinitionVersionHash && (
                      <div>
                        <div className="text-gray-600 mb-1">Version Hash</div>
                        <div className="font-mono text-xs">{runPayload.agentDefinitionVersionHash.substring(0, 8)}...</div>
                      </div>
                    )}
                  </div>
                );
              }
              
              // qualityCheckタブ: 品質チェック結果
              if (currentTab === 'qualityCheck') {
                const qualityCheck = runPayload.semanticValidationResult;
                if (qualityCheck) {
                  return (
                    <div className="space-y-2 text-xs">
                      <div className={`p-3 rounded ${
                        qualityCheck.pass ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
                      }`}>
                        <div className="font-semibold mb-2">
                          {qualityCheck.pass ? '✅ 品質チェック通過' : '⚠️ 品質チェック警告'}
                        </div>
                        {qualityCheck.reasons && qualityCheck.reasons.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            {qualityCheck.reasons.map((reason: string, idx: number) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                }
                return <div className="text-xs text-gray-500">品質チェック結果がありません</div>;
              }
              
              // finalOutput/parsedOutput/llmRawOutput/validationタブ: rawセクションと同じ表示
              const tabData: Record<string, any> = {};
              if (currentTab === 'finalOutput') tabData[currentTab] = runPayload.finalOutput || runPayload.output;
              else if (currentTab === 'parsedOutput') tabData[currentTab] = runPayload.parsedOutput;
              else if (currentTab === 'llmRawOutput') tabData[currentTab] = runPayload.llmRawOutput;
              else if (currentTab === 'validation') tabData[currentTab] = runPayload.zodValidationResult;
              
              const data = tabData[currentTab];
              if (!data) {
                return <div className="text-xs text-gray-500">データがありません</div>;
              }
              
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-xs text-gray-700">
                      {currentTab === 'finalOutput' ? 'Final Output' :
                       currentTab === 'parsedOutput' ? 'Parsed Output' :
                       currentTab === 'llmRawOutput' ? 'LLM Raw Output' :
                       currentTab === 'validation' ? 'Validation Result' :
                       currentTab}
                    </div>
                    {/* Step D-2: コピーJSONボタン */}
                    <button
                      onClick={() => {
                        const jsonText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                        navigator.clipboard.writeText(jsonText).then(() => {
                          alert('JSONをクリップボードにコピーしました');
                        }).catch((err) => {
                          console.error('コピー失敗:', err);
                          alert('コピーに失敗しました');
                        });
                      }}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                      title="JSONをコピー"
                    >
                      <Clipboard className="w-3 h-3" />
                      コピー
                    </button>
                    {/* Step D-2: ダウンロードJSONボタン */}
                    <button
                      onClick={() => {
                        const jsonText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                        const blob = new Blob([jsonText], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${tab}-${runItem.kb_id}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                      title="JSONをダウンロード"
                    >
                      <Download className="w-3 h-3" />
                      ダウンロード
                    </button>
                  </div>
                  {typeof data === 'string' ? (
                    <pre className="p-3 bg-gray-50 border rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap break-words">
                      {data}
                    </pre>
                  ) : (
                    <div className="p-3 bg-gray-50 border rounded overflow-auto max-h-60">
                      <JsonView value={data} style={{ backgroundColor: 'transparent' }} />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );

      default:
        return <div className="text-xs text-gray-500">未対応のセクションタイプ: {section.type}</div>;
    }
  };

  // mainContentブロックをレンダリング
  const renderMainContentBlock = (block: MainContentBlock, output: any): JSX.Element => {
    const { value: blockData, error: blockPathError } = block.path ? getDataByPath(output, block.path, block.id) : { value: output };
    
    // Step4: pathが解決できない場合は警告を表示
    if (blockPathError) {
      return (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
          <div className="text-sm font-semibold text-yellow-900 mb-1">⚠️ パス解決エラー</div>
          <div className="text-xs text-yellow-800">{blockPathError}</div>
        </div>
      );
    }
    
    // Step B-3: Mermaid統合（既存renderer内でmermaid文字列を検知）
    const detectMermaid = (content: any): boolean => {
      if (typeof content === 'string') {
        // graph TD / graph LR / flowchart で始まる、またはlabelに「図」「フロー」「構造」が含まれる
        return content.trim().startsWith('graph ') || 
               content.trim().startsWith('flowchart ') ||
               block.label.includes('図') || 
               block.label.includes('フロー') || 
               block.label.includes('構造');
      }
      return false;
    };
    
    // Mermaid検知時はmermaid rendererに切り替え
    if (detectMermaid(blockData)) {
      const mermaidContent = typeof blockData === 'string' ? blockData : String(blockData || '');
      const mermaidId = `mermaid-${block.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return (
        <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-lg`}>
          <div className="bg-white p-4 rounded border">
            <MermaidContent content={mermaidContent} id={mermaidId} />
          </div>
        </div>
      );
    }
    
    // Step 4: 重要度に応じたスタイル（視覚化に特化、太く表示）
    const importanceStyles = {
      critical: 'border-3 border-indigo-600 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 shadow-xl',
      high: 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg',
      medium: 'border-2 border-gray-400 bg-gradient-to-br from-gray-50 to-white shadow-md',
      low: 'border border-gray-300 bg-white shadow-sm',
    };
    
    const importancePadding = {
      critical: 'p-8', // Step 4: criticalはさらに太く
      high: 'p-6',
      medium: 'p-5',
      low: 'p-4',
    };
    
    switch (block.renderer) {
      case 'hero':
        // Step B-1: 結論を大きく視覚的に表示（オブジェクト/配列の場合は人間向けに整形）
        let heroText: string;
        if (typeof blockData === 'string') {
          heroText = blockData;
        } else if (Array.isArray(blockData)) {
          // 配列の場合は結合（join）
          heroText = blockData.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join('\n');
        } else if (typeof blockData === 'object' && blockData !== null) {
          // オブジェクトの場合はkey-value形式で整形
          heroText = Object.entries(blockData)
            .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
            .join('\n');
        } else {
          heroText = String(blockData || '');
        }
        return (
          <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-2xl`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
              <div className="flex-1">
                {/* Step B-1: hero（結論）をさらに大きく太く表示 */}
                <div className="text-2xl font-bold text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {heroText}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'bullets':
        // Step B-1: 箇条書き表示（markdown対応、配列ならbullet list、長文は段落分割）
        if (block.fields && block.fields.length > 0) {
          return (
            <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-xl`}>
              <ul className="space-y-3">
                {block.fields.map((field, idx) => {
                  const { value, error: fieldPathError } = getDataByPath(output, field.path, block.id);
                  return (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                        <span className="text-blue-600 font-bold text-xs">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-1">{field.label}</div>
                        <div className="text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                          {fieldPathError ? (
                            <div className="text-yellow-600 text-xs">⚠️ {fieldPathError}</div>
                          ) : value !== null && value !== undefined ? (
                            Array.isArray(value) ? (
                              // 配列ならbullet list（markdown対応）
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>
                                  {value.map((v: any) => `- ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join('\n')}
                                </ReactMarkdown>
                              </div>
                            ) : typeof value === 'string' && value.length > 100 ? (
                              // 長文は段落分割（日本語なら。\nで分割）
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>
                                  {value.split(/[。\n]/).filter(s => s.trim()).map(s => s.trim() + '。').join('\n\n')}
                                </ReactMarkdown>
                              </div>
                            ) : typeof value === 'string' ? (
                              // 短い文字列はmarkdownとして表示
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{value}</ReactMarkdown>
                              </div>
                            ) : (
                              String(value)
                            )
                          ) : (
                            <span className="text-gray-400 italic">未入力</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        } else if (blockData) {
          // pathで指定されたデータを箇条書き
          const items = Array.isArray(blockData) ? blockData : [blockData];
          return (
            <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-xl`}>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>
                  {items.map((item: any) => `- ${typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}`).join('\n')}
                </ReactMarkdown>
              </div>
            </div>
          );
        }
        return <div className="text-sm text-gray-400">データがありません</div>;
        
      case 'cards':
        // カード表示（視覚化に特化したアーティファクト風デザイン）
        if (block.cards) {
          const { value: items, error: itemsPathError } = getDataByPath(output, block.cards.itemsPath, block.id);
          
          // Step4: pathが解決できない場合は警告を表示
          if (itemsPathError) {
            return (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                <div className="text-sm font-semibold text-yellow-900 mb-1">⚠️ パス解決エラー</div>
                <div className="text-xs text-yellow-800">{itemsPathError}</div>
              </div>
            );
          }
          
          const itemsArray = Array.isArray(items) ? items : [];
          if (!Array.isArray(items)) return <div className="text-sm text-gray-400">カードデータが配列ではありません</div>;
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itemsArray.map((item: any, idx: number) => {
                const { value: title } = block.cards.titlePath ? getDataByPath(item, block.cards.titlePath, block.id) : { value: `項目 ${idx + 1}` };
                const { value: subtitle } = block.cards.subtitlePath ? getDataByPath(item, block.cards.subtitlePath, block.id) : { value: null };
                
                return (
                  <div 
                    key={idx} 
                    className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-xl hover:shadow-xl transition-shadow duration-200`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 mb-1">{title}</div>
                        {subtitle && (
                          <div className="text-sm text-gray-600 bg-white/60 px-2 py-1 rounded border border-gray-200">
                            {subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {block.cards.fields && block.cards.fields.length > 0 && (
                      <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                        {block.cards.fields.map((field, fieldIdx) => {
                          const { value, error: fieldPathError } = getDataByPath(item, field.path, block.id);
                          return (
                            <div key={fieldIdx} className="bg-white/80 rounded-lg p-3 border border-gray-100">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                {field.label}
                              </div>
                              <div className="text-sm text-gray-900">
                                {fieldPathError ? (
                                  <span className="text-yellow-600 text-xs">⚠️ {fieldPathError}</span>
                                ) : value !== null && value !== undefined ? (
                                  Array.isArray(value) ? (
                                    // Step B-1: 配列はチップ（pill）で並べる
                                    <div className="flex flex-wrap gap-1.5">
                                      {value.map((v, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium">
                                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                        </span>
                                      ))}
                                    </div>
                                  ) : typeof value === 'object' ? (
                                    <div className="text-xs font-mono bg-gray-50 p-2 rounded border">
                                      {renderFormattedObject(value)}
                                    </div>
                                  ) : (
                                    <span className="font-medium">{String(value)}</span>
                                  )
                                ) : (
                                  <span className="text-gray-400 italic">未入力</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }
        return <div className="text-sm text-gray-400">カード定義がありません</div>;
        
      case 'table':
        // テーブル表示（既存のtable rendererを流用）
        if (block.table) {
          const { value: rows, error: rowsPathError } = getDataByPath(output, block.table.rowsPath, block.id);
          
          // Step4: pathが解決できない場合は警告を表示
          if (rowsPathError) {
            return (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                <div className="text-sm font-semibold text-yellow-900 mb-1">⚠️ パス解決エラー</div>
                <div className="text-xs text-yellow-800">{rowsPathError}</div>
              </div>
            );
          }
          
          const rowsArray = Array.isArray(rows) ? rows : [];
          if (!Array.isArray(rows)) return <div className="text-sm text-gray-400">テーブルデータが配列ではありません</div>;
          
          return (
            <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-lg overflow-x-auto`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {block.table.columns.map((col, colIdx) => (
                      <th key={colIdx} className="px-3 py-2 text-left font-semibold text-gray-700">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsArray.map((row: any, rowIdx: number) => (
                    <tr key={rowIdx} className="border-b">
                      {block.table!.columns.map((col, colIdx) => {
                        const valuePath = col.valuePath || col.key;
                        const { value, error: colPathError } = getDataByPath(row, valuePath, block.id);
                        return (
                          <td key={colIdx} className="px-3 py-2 text-gray-900">
                            {colPathError ? (
                              <span className="text-yellow-600 text-xs">⚠️ {colPathError}</span>
                            ) : value !== null && value !== undefined ? (
                              Array.isArray(value) ? value.join(', ') : String(value)
                            ) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <div className="text-sm text-gray-400">テーブル定義がありません</div>;
        
      case 'analysisHighlights':
        // Step B-1: 分析結果を「示唆→打ち手→注意点」の3区画で表示（markdown対応）
        if (block.fields && block.fields.length > 0) {
          const items = Array.isArray(blockData) ? blockData : (blockData ? [blockData] : []);
          return (
            <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-xl`}>
              <div className="space-y-4">
                {items.length > 0 ? (
                  items.map((item: any, idx: number) => {
                    // 示唆・打ち手・注意点を分類
                    const insights: string[] = [];
                    const actions: string[] = [];
                    const warnings: string[] = [];
                    
                    block.fields.forEach((field) => {
                      const { value } = getDataByPath(item, field.path, block.id);
                      const label = field.label.toLowerCase();
                      const text = value ? String(value) : '';
                      
                      if (label.includes('示唆') || label.includes('根拠') || label.includes('仮説')) {
                        if (text) insights.push(`**${field.label}**: ${text}`);
                      } else if (label.includes('打ち手') || label.includes('アクション') || label.includes('提案')) {
                        if (text) actions.push(`**${field.label}**: ${text}`);
                      } else if (label.includes('注意') || label.includes('リスク') || label.includes('ng')) {
                        if (text) warnings.push(`**${field.label}**: ${text}`);
                      } else {
                        // その他は示唆に分類
                        if (text) insights.push(`**${field.label}**: ${text}`);
                      }
                    });
                    
                          return (
                      <div key={idx} className="bg-white rounded-lg p-4 border-l-4 border-indigo-500 shadow-sm">
                        <div className="space-y-4">
                          {insights.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded mb-2">
                                示唆・根拠
                            </div>
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{insights.join('\n\n')}</ReactMarkdown>
                      </div>
                    </div>
                          )}
                          {actions.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded mb-2">
                                打ち手・提案
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{actions.join('\n\n')}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {warnings.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2">
                                注意点・リスク
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{warnings.join('\n\n')}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-400 italic">分析データがありません</div>
                )}
              </div>
            </div>
          );
        }
        return <div className="text-sm text-gray-400">分析フィールドが定義されていません</div>;
        
      case 'copyBlocks':
        // Step B-1: コピペ用途に特化（各ブロックにコピーボタン、markdown整形）
        if (block.template) {
          const expanded = expandTemplate(block.template.value, output);
          const handleCopy = async () => {
            try {
              await navigator.clipboard.writeText(expanded);
              alert('クリップボードにコピーしました');
            } catch (err) {
              console.error('コピー失敗:', err);
              alert('コピーに失敗しました');
            }
          };
          
          return (
            <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-lg`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">コピー素材</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1.5"
                >
                  <Clipboard className="w-3 h-3" />
                  コピー
                </button>
                </div>
              <div className="prose prose-sm max-w-none bg-white p-4 rounded border border-gray-200">
                <ReactMarkdown>{expanded}</ReactMarkdown>
              </div>
            </div>
          );
        }
        return <div className="text-sm text-gray-400">テンプレートがありません</div>;
        
      case 'markdown':
        // フェーズ3: Step 5 - react-markdownでMarkdownをレンダリング
        const markdownContent = typeof blockData === 'string' ? blockData : 
                                blockData?.markdown || blockData?.content || 
                                (typeof blockData === 'object' ? JSON.stringify(blockData, null, 2) : String(blockData || ''));
        return (
          <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-lg`}>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
          </div>
        );
        
      case 'mermaid':
        // フェーズ3: Step 5 - Mermaidで図解を生成
        const mermaidContent = typeof blockData === 'string' ? blockData : 
                               blockData?.mermaid || blockData?.diagram || 
                               (typeof blockData === 'object' ? JSON.stringify(blockData, null, 2) : String(blockData || ''));
        const mermaidId = `mermaid-${block.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return (
          <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-lg`}>
            <div className="bg-white p-4 rounded border">
              <MermaidContent content={mermaidContent} id={mermaidId} />
            </div>
          </div>
        );
        
      case 'imagePrompts':
        // Step B-1: 画像指示を「制作指示として読める」固定構造に整形（コピーボタン付き）
        const imagePromptData: {
          目的?: string;
          構図?: string;
          被写体?: string;
          背景?: string;
          色?: string;
          トーン?: string;
          NG?: string;
        } = {};
        
        if (block.fields && block.fields.length > 0) {
          block.fields.forEach((field) => {
            const { value } = getDataByPath(output, field.path, block.id);
            const label = field.label.toLowerCase();
            if (label.includes('目的') || label.includes('何を伝える')) {
              imagePromptData.目的 = value ? String(value) : undefined;
            } else if (label.includes('構図')) {
              imagePromptData.構図 = value ? String(value) : undefined;
            } else if (label.includes('被写体')) {
              imagePromptData.被写体 = value ? String(value) : undefined;
            } else if (label.includes('背景')) {
              imagePromptData.背景 = value ? String(value) : undefined;
            } else if (label.includes('色') || label.includes('カラー')) {
              imagePromptData.色 = value ? String(value) : undefined;
            } else if (label.includes('トーン') || label.includes('トンマナ')) {
              imagePromptData.トーン = value ? String(value) : undefined;
            } else if (label.includes('ng') || label.includes('避ける')) {
              imagePromptData.NG = value ? String(value) : undefined;
            }
          });
        } else if (blockData) {
          // フォールバック: 単純なテキストを「目的」として扱う
          imagePromptData.目的 = typeof blockData === 'string' ? blockData : 
                           blockData?.notes || blockData?.instructions || 
                           (typeof blockData === 'object' ? JSON.stringify(blockData, null, 2) : String(blockData || ''));
        }
        
        const imagePromptText = [
          imagePromptData.目的 && `【目的】${imagePromptData.目的}`,
          imagePromptData.構図 && `【構図】${imagePromptData.構図}`,
          imagePromptData.被写体 && `【被写体】${imagePromptData.被写体}`,
          imagePromptData.背景 && `【背景】${imagePromptData.背景}`,
          imagePromptData.色 && `【色】${imagePromptData.色}`,
          imagePromptData.トーン && `【トーン】${imagePromptData.トーン}`,
          imagePromptData.NG && `【NG】${imagePromptData.NG}`,
        ].filter(Boolean).join('\n\n');
        
        const handleCopyImagePrompt = async () => {
          try {
            await navigator.clipboard.writeText(imagePromptText);
            alert('画像指示をクリップボードにコピーしました');
          } catch (err) {
            console.error('コピー失敗:', err);
            alert('コピーに失敗しました');
          }
        };
        
        return (
          <div className={`${importanceStyles[block.importance]} ${importancePadding[block.importance]} rounded-xl`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">制作指示（画像・ビジュアル）</span>
              <button
                onClick={handleCopyImagePrompt}
                className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-1.5"
              >
                <Clipboard className="w-3 h-3" />
                コピー
              </button>
            </div>
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{imagePromptText || '画像指示がありません'}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
        
      default:
        return <div className="text-sm text-gray-400">未対応のrenderer: {block.renderer}</div>;
    }
  };

  // Step2: ルール評価関数（既存のevaluateRulesを簡易実装）
  const evaluateRules = (rules: any[], output: any): Array<{ level: 'error' | 'warning'; message: string }> => {
    const violations: Array<{ level: 'error' | 'warning'; message: string }> = [];
    // 簡易実装（必要に応じて拡張）
    return violations;
  };

  // Step3: フォールバックレンダラー（contractが薄い/無い場合の成果物表示）
  const renderFallbackOutput = (output: any, depth: number = 0): JSX.Element => {
    if (!output) {
      return <div className="text-sm text-gray-500">データがありません</div>;
    }

    // 深さ制限（無限ループ防止）
    if (depth > 3) {
      return <div className="text-xs text-gray-400">（表示を省略）</div>;
    }

    // string → 段落表示
    if (typeof output === 'string') {
      return (
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {output}
        </div>
      );
    }

    // array → リスト or カードの繰り返し表示
    if (Array.isArray(output)) {
      if (output.length === 0) {
        return <div className="text-sm text-gray-500">（空のリスト）</div>;
      }

      // 最初の要素を見て、オブジェクト配列かどうか判定
      const firstItem = output[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        // オブジェクト配列 → カード表示
        return (
          <div className="space-y-4">
            {output.map((item, idx) => (
              <div key={idx} className="p-4 bg-gray-50 border rounded-lg">
                {renderFallbackOutput(item, depth + 1)}
              </div>
            ))}
          </div>
        );
      } else {
        // プリミティブ配列 → リスト表示
        return (
          <ul className="space-y-2 list-disc list-inside text-sm text-gray-700">
            {output.map((item, idx) => (
              <li key={idx}>{String(item)}</li>
            ))}
          </ul>
        );
      }
    }

    // object → 見出し + key/value を整形表示
    if (typeof output === 'object' && output !== null) {
      const keys = Object.keys(output);
      if (keys.length === 0) {
        return <div className="text-sm text-gray-500">（空のオブジェクト）</div>;
      }

      // 特別キーを検出（sections, banners, questions, checklistなど）
      const specialKeys = ['sections', 'banners', 'bannerIdeas', 'questions', 'checklist', 'items'];
      const hasSpecialKey = specialKeys.some(key => keys.includes(key));

      if (hasSpecialKey) {
        // 特別キーがある場合 → カード/表に寄せる
        return (
          <div className="space-y-6">
            {keys.map((key) => {
              const value = output[key];
              const isSpecial = specialKeys.includes(key);
              
              if (isSpecial && Array.isArray(value) && value.length > 0) {
                // 特別キーで配列 → カード表示
                return (
                  <div key={key} className="space-y-3">
                    <h4 className="text-base font-semibold text-gray-900 border-b pb-2">
                      {key === 'sections' ? 'セクション構成' :
                       key === 'banners' || key === 'bannerIdeas' ? 'バナー案' :
                       key === 'questions' ? '質問一覧' :
                       key === 'checklist' ? 'チェックリスト' :
                       key}
                    </h4>
                    <div className="space-y-3">
                      {value.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-white border rounded-lg shadow-sm">
                          {typeof item === 'object' && item !== null ? (
                            <div className="space-y-2 text-sm">
                              {Object.entries(item).map(([k, v]) => (
                                <div key={k} className="flex">
                                  <span className="font-medium text-gray-700 w-32 flex-shrink-0">{k}:</span>
                                  <span className="text-gray-600 flex-1">
                                    {Array.isArray(v) ? v.join(', ') : 
                                     typeof v === 'object' ? JSON.stringify(v, null, 2) :
                                     String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-700">{String(item)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              } else {
                // 通常のキー → 見出し + 値
                return (
                  <div key={key} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">{key}</h4>
                    <div className="pl-4">
                      {renderFallbackOutput(value, depth + 1)}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        );
      } else {
        // 通常のオブジェクト → 見出し + key/value を整形表示
        return (
          <div className="space-y-3">
            {keys.map((key) => {
              const value = output[key];
              return (
                <div key={key} className="border-b pb-3 last:border-b-0">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">{key}</h4>
                  <div className="pl-4 text-sm text-gray-700">
                    {renderFallbackOutput(value, depth + 1)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    }

    // その他（number, booleanなど）
    return <div className="text-sm text-gray-700">{String(output)}</div>;
  };

  // Step2: 対象プロダクト/ペルソナ情報を取得
  const productInfo = runPayload.inputSummary?.productSummary;
  const personaInfo = runPayload.inputSummary?.personaSummary;
  const executedAt = new Date(runPayload.executedAt || runPayload.startedAt).toLocaleString('ja-JP');

  // Step2: メイン成果物データ
  // フェーズ4: v2正規化（表示前に必ずv2に変換）
  const rawOutput = runPayload.finalOutput || runPayload.parsedOutput || runPayload.output;
  const mainOutput = rawOutput ? normalizeFinalOutputToV2(rawOutput) : null;
  
  // Step4: Presentation（ViewModel）を取得
  const presentation = runPayload.presentation;

  // renderAutoMainContent: mainContent未設定時にfinalOutputを自動表示
  const renderAutoMainContent = (data: any): JSX.Element => {
    if (!data) {
      return (
        <div className="p-6 bg-gray-50 border rounded-lg text-center text-gray-500">
          成果物データがありません
        </div>
      );
    }
    
    // dataがstringの場合: react-markdownで表示
    if (typeof data === 'string') {
      return (
        <div className="p-6 bg-white border rounded-lg">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{data}</ReactMarkdown>
          </div>
        </div>
      );
    }
    
    // dataがarrayの場合: cardsで最大10件表示（各itemは主要キーを抜粋）
    if (Array.isArray(data)) {
      const items = data.slice(0, 10);
      const remaining = data.length - 10;
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item: any, idx: number) => {
              // 主要キーを抜粋（id, name, title, label, summary, description等）
              const mainKeys = ['id', 'name', 'title', 'label', 'summary', 'description', 'oneLiner', 'execSummary'];
              const extractedFields: Array<{ key: string; value: any }> = [];
              
              if (typeof item === 'object' && item !== null) {
                mainKeys.forEach(key => {
                  if (key in item && item[key] !== null && item[key] !== undefined) {
                    extractedFields.push({ key, value: item[key] });
                  }
                });
                // 主要キーがない場合は最初の3つのキーを使用
                if (extractedFields.length === 0) {
                  Object.keys(item).slice(0, 3).forEach(key => {
                    extractedFields.push({ key, value: item[key] });
                  });
                }
              }
              
              return (
                <div key={idx} className="p-4 bg-white border rounded-lg shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      {extractedFields.length > 0 && (
                        <div className="space-y-2">
                          {extractedFields.map((field, fieldIdx) => (
                            <div key={fieldIdx} className="text-sm">
                              <div className="font-semibold text-gray-700 mb-1">{field.key}:</div>
                              <div className="text-gray-900">
                                {typeof field.value === 'string' ? (
                                  <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown>{field.value}</ReactMarkdown>
                                  </div>
                                ) : Array.isArray(field.value) || typeof field.value === 'object' ? (
                                  <details className="cursor-pointer text-xs">
                                    <summary className="text-blue-600 hover:underline">展開</summary>
                                    <pre className="mt-2 p-2 bg-gray-50 border rounded text-xs overflow-auto max-h-40">
                                      {JSON.stringify(field.value, null, 2)}
                                    </pre>
                                  </details>
                                ) : (
                                  String(field.value)
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* その他のフィールドも折りたたみで表示 */}
                      {typeof item === 'object' && item !== null && Object.keys(item).length > extractedFields.length && (
                        <details className="cursor-pointer text-xs mt-2">
                          <summary className="text-blue-600 hover:underline">その他の情報を展開</summary>
                          <div className="mt-2 p-2 bg-gray-50 border rounded">
                            <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(item, null, 2)}</pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {remaining > 0 && (
            <div className="text-center text-sm text-gray-500">
              +{remaining}件のアイテムがあります（最初の10件を表示）
            </div>
          )}
        </div>
      );
    }
    
    // dataがobjectの場合: 上位キーごとにカード表示
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      const topLevelKeys = keys.slice(0, 12); // 最大12個のキーを表示
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topLevelKeys.map((key) => {
              const value = data[key];
              
              return (
                <div key={key} className="p-4 bg-white border rounded-lg shadow-sm">
                  <div className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                    {key}
                  </div>
                  <div className="text-sm text-gray-700">
                    {value === null || value === undefined ? (
                      <span className="text-gray-400 italic">未設定</span>
                    ) : typeof value === 'string' ? (
                      // stringはmarkdownで表示
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{value}</ReactMarkdown>
                      </div>
                    ) : Array.isArray(value) ? (
                      // arrayは折りたたみ
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:underline mb-2">
                          配列を展開（{value.length}件）
                        </summary>
                        <div className="mt-2 p-2 bg-gray-50 border rounded">
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            {value.slice(0, 10).map((v: any, i: number) => (
                              <li key={i}>
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </li>
                            ))}
                            {value.length > 10 && <li className="text-gray-500">...他{value.length - 10}件</li>}
                          </ul>
                        </div>
                      </details>
                    ) : typeof value === 'object' ? (
                      // objectは折りたたみ
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:underline mb-2">オブジェクトを展開</summary>
                        <div className="mt-2 p-2 bg-gray-50 border rounded">
                          <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(value, null, 2)}</pre>
                        </div>
                      </details>
                    ) : (
                      String(value)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {keys.length > topLevelKeys.length && (
            <div className="text-center text-sm text-gray-500">
              +{keys.length - topLevelKeys.length}個のキーがあります（最初の{topLevelKeys.length}個を表示）
            </div>
          )}
        </div>
      );
    }
    
    // その他（number, booleanなど）
    return (
      <div className="p-6 bg-white border rounded-lg">
        <div className="text-sm text-gray-700">{String(data)}</div>
      </div>
    );
  };

  // Step5: Presentation Block Renderer（各block typeを描画）
  const renderPresentationBlock = (block: PresentationBlock): JSX.Element => {
    switch (block.type) {
      case 'hero': {
        const content = (block as any).content;
        return (
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg">
            {typeof content === 'string' ? (
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            ) : typeof content === 'object' && content !== null ? (
              <div className="space-y-2">
                {Object.entries(content).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-semibold text-gray-700">{key}:</span>{' '}
                    <span className="text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-700">{String(content)}</div>
            )}
          </div>
        );
      }
      
      case 'bullets': {
        const items = (block as any).items || [];
        return (
          <div className="space-y-2">
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              {items.map((item: any, idx: number) => {
                const text = typeof item === 'string' ? item : item.content || '';
                const label = typeof item === 'object' && item.label ? item.label : null;
                return (
                  <li key={idx} className="flex items-start gap-2">
                    {label && <span className="font-semibold text-gray-600 flex-shrink-0">{label}:</span>}
                    <span className="flex-1">{text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }
      
      case 'cards': {
        const cards = (block as any).cards || [];
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card: any, idx: number) => (
              <div key={idx} className="p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-lg text-gray-900 mb-2">{card.title || `カード ${idx + 1}`}</h4>
                {card.content && (
                  <div className="text-sm text-gray-700">
                    {typeof card.content === 'string' ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{card.content}</ReactMarkdown>
                      </div>
                    ) : typeof card.content === 'object' ? (
                      <div className="space-y-1">
                        {Object.entries(card.content).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-semibold">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      String(card.content)
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
      
      case 'table': {
        const headers = (block as any).headers || [];
        const rows = (block as any).rows || [];
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  {headers.map((header: string, idx: number) => (
                    <th key={idx} className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell: string, cellIdx: number) => (
                      <td key={cellIdx} className="border border-gray-300 px-4 py-2 text-gray-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      
      case 'timeline': {
        const events = (block as any).events || [];
        return (
          <div className="space-y-4">
            {events.map((event: any, idx: number) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full mt-1.5"></div>
                  {idx < events.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-300 ml-1.5 mt-1"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="font-semibold text-gray-900">{event.title}</div>
                  {event.timestamp && (
                    <div className="text-xs text-gray-500 mb-1">{event.timestamp}</div>
                  )}
                  {event.description && (
                    <div className="text-sm text-gray-700 mt-1">{event.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      case 'copyBlocks': {
        const blocks = (block as any).blocks || [];
        return (
          <div className="space-y-4">
            {blocks.map((copyBlock: any, idx: number) => (
              <div key={idx} className="p-4 bg-white border rounded-lg">
                {copyBlock.title && (
                  <h4 className="font-semibold text-gray-900 mb-2">{copyBlock.title}</h4>
                )}
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{copyBlock.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      case 'imagePrompts': {
        const prompts = (block as any).prompts || [];
        return (
          <div className="space-y-4">
            {prompts.map((prompt: any, idx: number) => (
              <div key={idx} className="p-4 bg-white border rounded-lg">
                <div className="space-y-2 text-sm">
                  {prompt.purpose && (
                    <div>
                      <span className="font-semibold text-gray-700">目的:</span>{' '}
                      <span className="text-gray-900">{prompt.purpose}</span>
                    </div>
                  )}
                  {prompt.composition && (
                    <div>
                      <span className="font-semibold text-gray-700">構図:</span>{' '}
                      <span className="text-gray-900">{prompt.composition}</span>
                    </div>
                  )}
                  {prompt.style && (
                    <div>
                      <span className="font-semibold text-gray-700">スタイル:</span>{' '}
                      <span className="text-gray-900">{prompt.style}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-gray-700">プロンプト:</span>
                    <div className="mt-1 p-2 bg-gray-50 border rounded text-gray-900">
                      {prompt.prompt}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      case 'markdown': {
        const content = (block as any).content || '';
        return (
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        );
      }
      
      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            ⚠️ 不明なblock type: {(block as any).type}
          </div>
        );
    }
  };

  // Step5: Presentation全体を描画
  const renderPresentation = (presentation: PresentationModel): JSX.Element => {
    return (
      <div className="space-y-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {presentation.title}
          </h2>
        </div>
        
        {/* Step4: presentation.blocksは常時展開（アコーディオン禁止） */}
        {presentation.blocks.map((block, idx) => (
          <div 
            key={block.id} 
            className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
              {block.label}
            </h3>
            {renderPresentationBlock(block)}
          </div>
        ))}
      </div>
    );
  };

  // Step4: presentationを最優先で描画（presentationがあればmain areaに表示）
  const renderMainContent = (): JSX.Element => {
    // 品質ステータス取得
    const contextQuality = runPayload.contextQuality;
    const qualityStatus = contextQuality?.status || 'usable';
    
    // Step4: presentationがあれば最優先で描画
    if (presentation) {
      return (
        <div className="space-y-8">
          {/* 品質ステータス表示（presentation上部） */}
          {contextQuality && (
            <div className={`p-4 rounded-lg border-2 ${
              qualityStatus === 'usable' 
                ? 'bg-green-50 border-green-300 text-green-900'
                : qualityStatus === 'regenerate_recommended'
                ? 'bg-orange-50 border-orange-300 text-orange-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">
                  {qualityStatus === 'usable' ? '✅' : qualityStatus === 'regenerate_recommended' ? '⚠️' : '❌'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-2">
                    {qualityStatus === 'usable' 
                      ? '✅ 企画に利用可能'
                      : qualityStatus === 'regenerate_recommended'
                      ? '⚠️ 再生成推奨'
                      : '⚠️ 根拠不足'}
                  </div>
                  {contextQuality.errors && contextQuality.errors.length > 0 && (
                    <div className="mb-2">
                      <div className="text-sm font-medium mb-1">エラー:</div>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {contextQuality.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {contextQuality.warnings && contextQuality.warnings.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-1">警告:</div>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {contextQuality.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Step5: Presentation全体を描画（accordion禁止） */}
          {renderPresentation(presentation)}
        </div>
      );
    }
    
    // presentationがない場合: fallbackでrenderFromContractを表示
    return renderFromContract(outputViewContract, runPayload, systemMeta);
  };

  // Step 5: 純関数renderFromContractを実装（contract駆動レンダリング）
  const renderFromContract = (
    contract: OutputViewContract | null,
    runPayload: WorkflowRunPayload,
    injectedSystemMeta: any
  ): JSX.Element | null => {
    if (!contract) {
      // contract欠損時のみフォールバック
      console.warn('[WorkflowRunDetailView] contractがありません。GenericRunViewerを使用します。');
      return (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border rounded">
            <h3 className="text-lg font-bold mb-2">{agentDefinition?.outputArtifactTitle || agentDefinition?.name || '成果物'}</h3>
            <div className="text-xs text-gray-500 mb-2">
              実行日時: {new Date(runPayload.executedAt || runPayload.startedAt).toLocaleString('ja-JP')}
            </div>
            <div className="bg-white rounded p-3 border">
              <pre className="text-xs font-mono text-gray-700 overflow-auto max-h-96">
                {JSON.stringify(mainOutput, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    // contractがあるのにフォールバックに落ちるのはバグ
    if (process.env.NODE_ENV === 'development') {
      console.log('[WorkflowRunDetailView] ✓ contract駆動レンダリング:', {
        contractVersion: contract.version,
        managedBy: contract.meta?.managedBy || 'system',
        sectionsCount: contract.sections?.length || 0,
        hasMainContent: !!contract.mainContent,
      });
    }
    
    // Step E: LP構成案contractにmainContentを必須化（未定義禁止）
    if (!contract.mainContent || !contract.mainContent.blocks || contract.mainContent.blocks.length === 0) {
      console.warn('[WorkflowRunDetailView] ⚠️ contractにmainContentが定義されていません。最重要コンテンツ領域が表示されません。', {
        contractVersion: contract.version,
        title: contract.title,
      });
    }

    // contractのmainContentを優先してレンダリング
    if (contract.mainContent && contract.mainContent.blocks.length > 0) {
      // フェーズ3: Step 4-3 - 品質ステータス表示（文脈の欠落検知）
      const contextQuality = runPayload.contextQuality;
      const qualityStatus = contextQuality?.status || 'usable';
      const qualityWarnings = contextQuality?.warnings || [];
      const qualityErrors = contextQuality?.errors || [];
      
      // Step 5: 品質チェック（ルール違反）をmainContent上部に警告として表示（生成結果を差し替えない）
      const allRuleViolations: Array<{ level: 'error' | 'warning'; message: string; sectionId?: string }> = [];
      if (contract.sections) {
        for (const section of contract.sections) {
          if (section.rules && section.rules.length > 0) {
            const violations = evaluateRules(section.rules, mainOutput);
            violations.forEach(v => {
              allRuleViolations.push({ ...v, sectionId: section.id });
            });
          }
        }
      }
      
      // Step F: 入力から根拠を積むための可視化（mainContentの直前）
      const renderInputEvidence = (): JSX.Element | null => {
        const inputs = runPayload.inputsSnapshot;
        if (!inputs) return null;
        
        const intentPackets = inputs.packets?.filter(p => p.kind === 'intent') || [];
        const productPackets = inputs.packets?.filter(p => p.kind === 'product') || [];
        const personaPackets = inputs.packets?.filter(p => p.kind === 'persona') || [];
        const kbPackets = inputs.packets?.filter(p => p.kind === 'kb_item') || [];
        const runRefPackets = inputs.packets?.filter(p => p.kind === 'workflow_run_ref') || [];
        
        // 従来形式のフォールバック
        const intent = inputs.intent || (intentPackets.length > 0 ? intentPackets[0].content : null);
        const product = inputs.product || (productPackets.length > 0 ? productPackets[0].content : null);
        const persona = inputs.persona || (personaPackets.length > 0 ? personaPackets[0].content : null);
        const knowledge = inputs.knowledge || kbPackets.map(p => ({ kind: p.kind, id: p.refId || '', title: p.title, payload: p.content }));
        const referencedRuns = inputs.referencedRunIds || runRefPackets.map(p => p.refId).filter(Boolean);
        
        if (!intent && !product && !persona && knowledge.length === 0 && referencedRuns.length === 0) {
          return null; // 入力情報がない場合は表示しない
        }
        
        return (
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
              根拠にした入力
            </h3>
            <div className="space-y-4">
              {/* 目的・意図 */}
              {intent && (
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2">目的・意図</div>
                  <div className="text-sm text-gray-900">
                    {typeof intent === 'object' && intent.goal ? (
                      <div className="space-y-2">
                        <div><strong>目的:</strong> {intent.goal}</div>
                        {intent.background && <div><strong>背景:</strong> {intent.background}</div>}
                        {intent.successCriteria && <div><strong>成功条件:</strong> {intent.successCriteria}</div>}
                      </div>
                    ) : (
                      String(intent)
                    )}
                  </div>
                </div>
              )}
              
              {/* 製品情報 */}
              {product && (
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2">参照した製品情報</div>
                  <div className="text-sm text-gray-900">
                    {typeof product === 'object' ? (
                      <div className="space-y-2">
                        <div className="font-semibold">{product.name || product.id}</div>
                        {product.category && <div className="text-xs text-gray-600">カテゴリ: {product.category}</div>}
                        {product.description && (
                          <div className="text-xs text-gray-600">
                            <details className="cursor-pointer">
                              <summary className="hover:underline">説明を展開</summary>
                              <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">{product.description}</div>
                            </details>
                          </div>
                        )}
                        {/* Step3-3: その他のフィールドも折り畳みで表示（配列/長文を潰さない） */}
                        {Object.entries(product).filter(([key]) => !['name', 'id', 'category', 'description'].includes(key)).length > 0 && (
                          <details className="cursor-pointer text-xs">
                            <summary className="text-blue-600 hover:underline">その他の情報を展開</summary>
                            <div className="mt-1 p-2 bg-gray-50 rounded">
                              <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(product, null, 2)}</pre>
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      String(product)
                    )}
                  </div>
                </div>
              )}
              
              {/* ペルソナ */}
              {persona && (
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2">参照したペルソナ</div>
                  <div className="text-sm text-gray-900">
                    {typeof persona === 'object' ? (
                      <div className="space-y-2">
                        <div className="font-semibold">{persona.title || persona.summary || persona.id}</div>
                        {persona.summary && (
                          <div className="text-xs text-gray-600">
                            <details className="cursor-pointer">
                              <summary className="hover:underline">要約を展開</summary>
                              <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">{persona.summary}</div>
                            </details>
                          </div>
                        )}
                        {/* Step3-3: その他のフィールドも折り畳みで表示（配列/長文を潰さない） */}
                        {Object.entries(persona).filter(([key]) => !['title', 'summary', 'id'].includes(key)).length > 0 && (
                          <details className="cursor-pointer text-xs">
                            <summary className="text-blue-600 hover:underline">詳細情報を展開</summary>
                            <div className="mt-1 p-2 bg-gray-50 rounded">
                              <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(persona, null, 2)}</pre>
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      String(persona)
                    )}
                  </div>
                </div>
              )}
              
              {/* 参照KB */}
              {knowledge.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2">参照KB（{knowledge.length}件）</div>
                  <div className="space-y-2">
                    {knowledge.map((kb: any, idx: number) => (
                      <div key={idx} className="text-sm text-gray-900">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <div className="flex-1">
                            <div className="font-medium">{kb.title || kb.id || `KB Item ${idx + 1}`}</div>
                            {kb.kind && <div className="text-xs text-gray-500 mt-0.5">種類: {kb.kind}</div>}
                            {/* Step3-3: payloadも折り畳みで表示（配列/長文を潰さない） */}
                            {kb.payload && (
                              <details className="cursor-pointer text-xs mt-1">
                                <summary className="text-blue-600 hover:underline">内容を展開</summary>
                                <div className="mt-1 p-2 bg-gray-50 rounded">
                                  {typeof kb.payload === 'string' ? (
                                    <div className="whitespace-pre-wrap">{kb.payload}</div>
                                  ) : (
                                    <pre className="overflow-auto max-h-40">{JSON.stringify(kb.payload, null, 2)}</pre>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* workflow_run_ref（再利用） */}
              {referencedRuns.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2">再利用した実行結果（{referencedRuns.length}件）</div>
                  <div className="space-y-2">
                    {referencedRuns.map((runId: string, idx: number) => (
                      <div key={idx} className="text-sm text-gray-900 flex items-center gap-2">
                        <span className="text-blue-500">•</span>
                        <span className="font-mono text-xs">{runId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      };
      
      return (
        <div className="space-y-8">
          {/* Step F: 根拠にした入力（mainContentの直前） */}
          {renderInputEvidence()}
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {contract.mainContent.title}
            </h2>
            
            {/* フェーズ3: Step 4-3 - 品質ステータス表示（結果画面の上部） */}
            {contextQuality && (
              <div className={`mt-4 p-4 rounded-lg border-2 ${
                qualityStatus === 'usable' 
                  ? 'bg-green-50 border-green-300 text-green-900'
                  : qualityStatus === 'regenerate_recommended'
                  ? 'bg-orange-50 border-orange-300 text-orange-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">
                    {qualityStatus === 'usable' ? '✅' : qualityStatus === 'regenerate_recommended' ? '⚠️' : '❌'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-2">
                      {qualityStatus === 'usable' 
                        ? '✅ 企画に利用可能'
                        : qualityStatus === 'regenerate_recommended'
                        ? '⚠️ 再生成推奨'
                        : '⚠️ 根拠不足'}
                    </div>
                    {qualityErrors.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium mb-1">エラー:</div>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {qualityErrors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {qualityWarnings.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-1">警告:</div>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {qualityWarnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 5: ルール違反はmainContent上部に「警告」として表示するだけ（生成結果を差し替えない） */}
            {allRuleViolations.length > 0 && (
              <div className="mt-4 space-y-2">
                {allRuleViolations.map((v, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg text-sm border-2 ${
                      v.level === 'error' 
                        ? 'bg-red-50 border-red-300 text-red-900' 
                        : 'bg-orange-50 border-orange-300 text-orange-900'
                    }`}
                  >
                    <div className="font-semibold mb-1 flex items-center gap-2">
                      {v.level === 'error' ? '⚠️ エラー' : '⚠️ 警告'}
                      {v.sectionId && <span className="text-xs font-normal text-gray-600">({v.sectionId})</span>}
                    </div>
                    <div>{v.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Step3-1: mainContentは常時展開（アコーディオン禁止） */}
          {contract.mainContent.blocks.map((block, idx) => (
            <div 
              key={block.id} 
              className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                {block.label}
              </h3>
              {renderMainContentBlock(block, mainOutput)}
            </div>
          ))}
          
          {/* Step2: contractのsectionsをレンダリング（summary/table/cards等、補助情報として下部に配置） */}
          {/* Step6: executionProof/rawはDebug領域に統合（二重表示を解消） */}
          {contract.sections && contract.sections.length > 0 && (() => {
            // Debug系セクション（executionProof, raw）は除外（後でDebug領域に統合）
            const debugSections = contract.sections.filter(s => s.type === 'executionProof' || s.type === 'raw');
            const otherSections = contract.sections.filter(s => s.type !== 'executionProof' && s.type !== 'raw');
            
            return (
              <>
                {/* 補助情報セクション（summary/table/cards/checklist） */}
                {otherSections.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-300">
                    <div className="space-y-6">
                      {otherSections.map((section) => {
                        return (
                          <div key={section.id} className="space-y-3">
                            <h4 className="text-base font-semibold text-gray-900">{section.label || section.id}</h4>
                            <div className="p-4 bg-gray-50 border rounded-lg">
                              {renderSection(section, mainOutput, contract, agentDefinition)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Step6: Debug領域は削除（メインのデバッグ領域に統合） */}
              </>
            );
          })()}
        </div>
      );
    }

    // mainContentがない場合: renderAutoMainContentで自動表示（警告は推奨メッセージに格下げ）
      return (
        <div className="space-y-8">
        {/* mainContent未設定の推奨メッセージ（格下げ） */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-lg">💡</div>
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                <strong>推奨:</strong> エージェント管理画面で<code className="px-1 py-0.5 bg-blue-100 rounded text-xs">outputViewContract.mainContent</code>を定義すると、より見やすい表示になります。
              </p>
            </div>
          </div>
        </div>
        
        {/* 主要領域: renderAutoMainContentで自動表示 */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">成果物</h2>
          {renderAutoMainContent(mainOutput)}
        </div>
        
        {/* contractのsectionsがあれば表示（補助情報 + 実行証明も含む） */}
        {contract.sections && contract.sections.length > 0 && (() => {
          // Debug系セクション（executionProof, raw）を分離
          const debugSections = contract.sections.filter(s => s.type === 'executionProof' || s.type === 'raw');
          const otherSections = contract.sections.filter(s => s.type !== 'executionProof' && s.type !== 'raw');
          
          return (
            <>
              {/* 補助情報セクション（summary/table/cards/checklist） */}
              {otherSections.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-300">
                  <div className="space-y-6">
                    {otherSections.map((section) => {
                      return (
            <div key={section.id} className="space-y-3">
                          <h4 className="text-base font-semibold text-gray-900">{section.label || section.id}</h4>
                          <div className="p-4 bg-gray-50 border rounded-lg">
                {renderSection(section, mainOutput, contract, agentDefinition)}
              </div>
        </div>
      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Step6: Debug領域は削除（メインのデバッグ領域に統合） */}
            </>
          );
        })()}
      </div>
    );
  };

  // Step 6: 検証ロジック（contractがあるのにシステム分岐が残っていないかチェック）
  useEffect(() => {
    if (outputViewContract && process.env.NODE_ENV === 'development') {
      // 検証1: contractがあるのにExecutionProofが固定表示されていないか
      const hasExecutionProofInContract = outputViewContract.sections?.some(s => s.type === 'executionProof');
      const hasFixedExecutionProof = expandedSections.hasOwnProperty('executionProof');
      if (!hasExecutionProofInContract && hasFixedExecutionProof) {
        console.warn('[WorkflowRunDetailView] ⚠️ contractにexecutionProofセクションがないのに、固定表示されています。');
      }

      // 検証2: sections描画順がcontractと一致しているか（既に実装済み）
      // 検証3: contractにないセクションが追加されていないか（既に実装済み）
      
      // 検証4: outputKind分岐が残っていないか（手動チェックが必要）
      console.log('[WorkflowRunDetailView] ✓ contract検証完了:', {
        contractVersion: outputViewContract.version,
        managedBy: outputViewContract.meta?.managedBy || 'system',
        sectionsCount: outputViewContract.sections?.length || 0,
        hasMainContent: !!outputViewContract.mainContent,
      });
    }
  }, [outputViewContract, expandedSections]);

  return (
    <div className="flex flex-col h-full">
      {/* A) 上部：固定ヘッダー（sticky） */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="p-4 space-y-3">
          {/* 成果物タイトル + バッジ（contract駆動） */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {/* contractのtitleを使用 */}
              <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 text-base font-semibold rounded">
                {artifactType}
              </span>
              {/* contractのbadgesを使用（システム評価はcontractが許可した時だけ） */}
              {outputViewContract?.badges && outputViewContract.badges.length > 0 ? (
                outputViewContract.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1.5 text-sm font-semibold rounded ${
                      badge.tone === 'green' ? 'bg-green-100 text-green-800' :
                      badge.tone === 'orange' ? 'bg-orange-100 text-orange-800' :
                      badge.tone === 'red' ? 'bg-red-100 text-red-800' :
                      badge.tone === 'blue' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {badge.label}
                  </span>
                ))
              ) : (
                // contractにbadgesがない場合のみ、システム評価を表示（後方互換性）
                <span className={`px-3 py-1.5 text-sm font-semibold rounded ${
                  reliability.color === 'green' ? 'bg-green-100 text-green-800' :
                  reliability.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {reliability.label}
                </span>
              )}
            </div>
            {/* 主要アクション（Export, Reuse, Compare, Pin） */}
            <div className="flex items-center gap-2">
              {/* Export（Markdownコピー） */}
              {mainOutput && (
                <button
                  onClick={exportToMarkdown}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1.5"
                  title="Markdown形式でコピー"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  エクスポート
                </button>
              )}
              {/* Reuse（Inputとして使う） */}
              {runPayload.status === 'success' && runPayload.finalOutput && (
                <button
                  onClick={handleReuse}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1.5"
                  title="この実行結果を次のエージェントの入力として使用"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  再利用
                </button>
              )}
              {/* Compare */}
              {onCompare && (
                <button
                  onClick={() => onCompare(runItem.kb_id)}
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 flex items-center gap-1.5"
                  title="他の実行結果と比較"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  比較
                </button>
              )}
              {/* Pin */}
              <button
                onClick={handlePin}
                className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 ${
                  isPinned
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={isPinned ? 'ピン留め解除' : 'ピン留め'}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                ピン留め
              </button>
            </div>
          </div>
          
          {/* 対象プロダクト / ペルソナ / 実行日時 */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {productInfo && (
              <div>
                <span className="font-medium">対象プロダクト:</span> {productInfo.name}
                {productInfo.category && <span className="ml-1 text-gray-500">({productInfo.category})</span>}
              </div>
            )}
            {personaInfo && (
              <div>
                <span className="font-medium">ペルソナ:</span> {personaInfo.title || personaInfo.id}
              </div>
            )}
            <div>
              <span className="font-medium">実行日時:</span> {executedAt}
            </div>
          </div>
        </div>
      </div>

      {/* Step4: B) 中央：メイン成果物（presentationを最優先） */}
      <div className="flex-1 overflow-y-auto p-4">
        {!mainOutput && !presentation ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="font-semibold mb-2">まだ成果物が生成されていません。</p>
              <p className="text-sm">エージェントが実行中か、最終的な成果物として保存されませんでした。</p>
              {runPayload.status === 'error' && (
                <p className="mt-2 text-red-600 text-sm">エラーが発生したため、成果物が生成できませんでした。</p>
              )}
              {runPayload.llmRawOutput && !runPayload.parsedOutput && (
                <p className="mt-2 text-orange-600 text-sm">AIからの応答はありましたが、構造化された形式へのパースに失敗しました。</p>
              )}
            </div>
          </div>
        ) : (
          // Step4: presentationを最優先で描画
          renderMainContent()
        )}
      </div>

      {/* Step4: Debug領域（Raw JSONは常に最下部に隔離、重複削除） */}
      {(presentation || mainOutput) && (
        <div className="mt-8 pt-6 border-t-2 border-gray-400 px-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700">デバッグ領域（開発/検証用）</h3>
            <p className="text-xs text-gray-500 mt-1">Raw JSON・実行証明・検証結果などの技術情報</p>
          </div>
          <div className="space-y-4">
            {/* Raw JSON表示 */}
            <div className="bg-gray-50 rounded-lg border border-gray-300">
            <button
                onClick={() => toggleSection('raw')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-100 rounded-t-lg"
              >
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-gray-900">デバッグ用JSON</h4>
                  <span className="text-xs text-gray-500">（開発/検証用）</span>
                </div>
                {expandedSections['raw'] ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
              {expandedSections['raw'] && (
                <div className="p-4 border-t border-gray-300">
                  <div className="flex gap-2 mb-4">
                        <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(runPayload, null, 2));
                        alert('JSONをクリップボードにコピーしました');
                      }}
                      className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> コピー
                        </button>
                      <button
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(runPayload, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `workflow-run-${runPayload.agentNodeId || 'unknown'}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> ダウンロード
                      </button>
                    </div>
                  <div className="bg-white rounded border">
                    <JsonView 
                      value={runPayload} 
                      style={{ backgroundColor: 'transparent' }}
                      collapsed={2}
                    />
                  </div>
                  </div>
                    )}
                  </div>
            
            {/* contractのsectionsにexecutionProofがある場合は表示 */}
            {outputViewContract?.sections && (() => {
              const executionProofSection = outputViewContract.sections.find(s => s.type === 'executionProof');
              if (!executionProofSection) return null;
              
              const isExpanded = expandedSections[executionProofSection.id] || false;
                    return (
                <div className="bg-gray-50 rounded-lg border border-gray-300">
                          <button
                    onClick={() => toggleSection(executionProofSection.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-100 rounded-t-lg"
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-gray-900">{executionProofSection.label || '実行証明'}</h4>
                      <span className="text-xs text-gray-500">（開発/検証用）</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    )}
                          </button>
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-300">
                      {renderSection(executionProofSection, mainOutput, outputViewContract, agentDefinition)}
                        </div>
                  )}
                      </div>
                    );
                })()}
                    </div>
              </div>
            )}
    </div>
  );
}
