'use client';

import { useRef } from 'react';
import { Persona, MarketInsight, StrategyOption, PlanningHook } from '@/types/schema';
import ExportButton from './ExportButton';

interface PlanningSummaryViewProps {
  personas: Persona[];
  marketInsights: MarketInsight[];
  strategyOptions: StrategyOption[];
  planningHooks: PlanningHook[];
}

export default function PlanningSummaryView({
  personas,
  marketInsights,
  strategyOptions,
  planningHooks,
}: PlanningSummaryViewProps) {
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleExportPNG = async () => {
    if (!summaryRef.current) return;

    try {
      // 動的インポート（クライアントサイドのみ、オプショナル）
      const html2canvasModule = await import('html2canvas').catch(() => null);
      if (!html2canvasModule) {
        alert('PNGエクスポート機能を使用するには、html2canvasパッケージのインストールが必要です。\n\nnpm install html2canvas');
        return;
      }

      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f9fafb',
      });

      const link = document.createElement('a');
      link.download = `企画サマリ_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('PNG export failed:', error);
      alert('PNGエクスポートに失敗しました。');
    }
  };

  const handleExportPDF = async () => {
    if (!summaryRef.current) return;

    try {
      // 動的インポート（クライアントサイドのみ、オプショナル）
      const html2canvasModule = await import('html2canvas').catch(() => null);
      const jspdfModule = await import('jspdf').catch(() => null);

      if (!html2canvasModule || !jspdfModule) {
        alert('PDFエクスポート機能を使用するには、html2canvasとjspdfパッケージのインストールが必要です。\n\nnpm install html2canvas jspdf');
        return;
      }

      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jspdfModule;

      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f9fafb',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`企画サマリ_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDFエクスポートに失敗しました。');
    }
  };
  const getRelevanceSymbol = (level: 'high' | 'medium' | 'low' | 'unknown') => {
    switch (level) {
      case 'high':
        return '◎';
      case 'medium':
        return '◯';
      case 'low':
        return '△';
      default:
        return '？';
    }
  };

  const getRelevanceColor = (level: 'high' | 'medium' | 'low' | 'unknown') => {
    switch (level) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-blue-600';
      case 'low':
        return 'text-yellow-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      {/* エクスポートボタン（固定） */}
      <div className="sticky top-0 z-10 bg-white border-b p-4 mb-4 -mx-6 -mt-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">企画サマリ</h1>
          <ExportButton onExportPNG={handleExportPNG} onExportPDF={handleExportPDF} />
        </div>
      </div>

      <div ref={summaryRef} className="max-w-6xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-2">企画サマリ</h2>
          <p className="text-sm text-gray-600">
            分析結果を1画面に集約。合意形成と次アクション決定に活用してください。
          </p>
        </div>

        {/* Market Insight セクション */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">市場インサイト（構造の読み取り）</h2>
          <div className="space-y-6">
            {marketInsights.map((insight, idx) => (
              <div key={idx} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded">
                <div className="mb-3">
                  <span className="text-xs font-medium px-2 py-1 bg-white rounded">
                    {idx + 1}枚目
                  </span>
                </div>

                {/* 1. 想定されているペルソナ前提 */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    【1. 想定されているペルソナ前提（人の不安・制約）】
                  </div>
                  <div className="text-sm text-gray-800">{insight.persona_assumption.assumption}</div>
                  <div className="text-xs text-gray-500 mt-1">根拠: {insight.persona_assumption.evidence}</div>
                </div>

                {/* 2. 観測された競合の選択 */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    【2. 観測された競合の選択（事実 + 根拠）】
                  </div>
                  <div className="text-sm font-medium text-gray-800">{insight.competitor_choice.choice}</div>
                  <div className="text-xs text-gray-500 mt-1">根拠: {insight.competitor_choice.evidence}</div>
                </div>

                {/* 3. なぜその選択が合理的か */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    【3. なぜその選択が合理的か（仮説）】
                  </div>
                  <div className="text-sm text-gray-800">{insight.rationality_hypothesis}</div>
                </div>

                {/* 4. 当たり前になっている可能性 */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    【4. 当たり前になっている可能性（外すとリスク）】
                  </div>
                  <div className="text-sm font-medium text-orange-700">{insight.taken_for_granted_risk}</div>
                </div>

                {/* どのペルソナに強く効いているか */}
                {insight.persona_relevance && insight.persona_relevance.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="text-xs font-medium text-gray-600 mb-2">【どのペルソナに強く効いているか】</div>
                    <div className="space-y-1">
                      {insight.persona_relevance.map((pr, prIdx) => {
                        const persona = personas.find((p) => p.id === pr.persona_id);
                        return (
                          <div key={prIdx} className="flex items-start gap-2 text-sm">
                            <span className={`font-bold ${getRelevanceColor(pr.relevance_level)}`}>
                              {getRelevanceSymbol(pr.relevance_level)}
                            </span>
                            <div className="flex-1">
                              <span className="font-medium">{persona ? persona.name : pr.persona_id}</span>
                              <span className="text-xs text-gray-600 ml-2">{pr.reasoning}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Persona セクション */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">ペルソナ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personas.map((persona) => {
              const relatedInsights = marketInsights.filter((mi) =>
                mi.persona_relevance.some((pr) => pr.persona_id === persona.id)
              );

              return (
                <div key={persona.id} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-bold mb-2">{persona.name}</h3>
                  <div className="text-xs text-gray-600 mb-2">ID: {persona.id}</div>

                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-700 mb-1">不安・懸念事項</div>
                    <div className="flex flex-wrap gap-1">
                      {persona.concerns.slice(0, 2).map((concern, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                          {concern}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-700 mb-1">判断基準</div>
                    <div className="flex flex-wrap gap-1">
                      {persona.decision_criteria.slice(0, 2).map((criteria, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {criteria}
                        </span>
                      ))}
                    </div>
                  </div>

                  {relatedInsights.length > 0 && (
                    <div className="text-xs text-gray-600 mt-2">
                      関連インサイト: {relatedInsights.length}件
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Strategy Options セクション */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">戦略オプション</h2>
          <div className="space-y-6">
            {strategyOptions.map((option, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-lg p-5 ${
                  option.option_type === 'A'
                    ? 'border-blue-500 bg-blue-50'
                    : option.option_type === 'B'
                    ? 'border-green-500 bg-green-50'
                    : 'border-orange-500 bg-orange-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl font-bold">Option {option.option_type}</div>
                  <div className="text-lg font-semibold">{option.title}</div>
                </div>

                {/* 参考要素・使わない要素 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-white rounded border">
                    <div className="text-xs font-medium text-gray-700 mb-1">参考にする要素</div>
                    <div className="text-sm text-gray-800">
                      要素: {option.referenced_elements.components?.join(', ') || 'なし'}
                    </div>
                    <div className="text-sm text-gray-800">
                      訴求軸: {option.referenced_elements.appeal_axes?.join(', ') || 'なし'}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-xs font-medium text-gray-700 mb-1">使わない要素</div>
                    <div className="text-sm text-gray-800">
                      要素: {option.avoided_elements.components?.join(', ') || 'なし'}
                    </div>
                    <div className="text-sm text-gray-800">
                      訴求軸: {option.avoided_elements.appeal_axes?.join(', ') || 'なし'}
                    </div>
                  </div>
                </div>

                {/* ペルソナ別のリスク感 */}
                {option.persona_risk_assessment && option.persona_risk_assessment.length > 0 && (
                  <div className="mb-4 p-3 bg-white rounded border">
                    <div className="text-sm font-medium text-gray-700 mb-2">ペルソナ別のリスク感</div>
                    <div className="grid grid-cols-3 gap-2">
                      {option.persona_risk_assessment.map((assessment, aIdx) => {
                        const persona = personas.find((p) => p.id === assessment.persona_id);
                        const riskColor =
                          assessment.risk_level === 'low'
                            ? 'border-green-300 bg-green-50'
                            : assessment.risk_level === 'medium'
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-red-300 bg-red-50';
                        const riskLabel =
                          assessment.risk_level === 'low'
                            ? '低'
                            : assessment.risk_level === 'medium'
                            ? '中'
                            : '高';

                        return (
                          <div key={aIdx} className={`p-2 rounded border text-xs ${riskColor}`}>
                            <div className="font-medium mb-1">
                              {persona ? persona.name : assessment.persona_id}
                            </div>
                            <div className="font-bold">リスク: {riskLabel}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* メリット・リスク */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded border border-green-300">
                    <div className="text-xs font-medium text-green-700 mb-1">想定されるメリット（仮説）</div>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {option.potential_benefits.map((benefit, i) => (
                        <li key={i}>• {benefit}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 bg-white rounded border border-red-300">
                    <div className="text-xs font-medium text-red-700 mb-1">想定されるリスク（仮説）</div>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {option.potential_risks.map((risk, i) => (
                        <li key={i}>• {risk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planning Hooks セクション */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">企画フック（考える問い）</h2>
          <div className="space-y-6">
            {planningHooks.map((hook, idx) => (
              <div key={idx} className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50 rounded">
                <div className="mb-3">
                  <span className="text-sm font-semibold">Option {hook.strategy_option}</span>
                </div>
                <div className="space-y-3">
                  {hook.hooks.map((h, hookIdx) => (
                    <div key={hookIdx} className="bg-white rounded p-3 border">
                      <div className="text-sm font-semibold text-gray-900 mb-1">{h.question}</div>
                      {h.context && (
                        <div className="text-xs text-gray-600 mt-1">{h.context}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 次アクション決定のためのチェックリスト */}
        <div className="bg-white rounded-lg border p-6 border-yellow-300 bg-yellow-50">
          <h2 className="text-xl font-bold mb-4 border-b border-yellow-400 pb-2">
            次アクション決定のためのチェックポイント
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-gray-800 mb-2">
                【検討すべき観点】
              </div>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>どのStrategy Optionを採用するか？（A/B/C）</li>
                <li>各Optionのペルソナ別リスク感をどう評価するか？</li>
                <li>Planning Hooksの問いに対して、どう回答するか？</li>
                <li>市場インサイトの「当たり前」をどう扱うか？</li>
              </ul>
            </div>
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-gray-800 mb-2">
                【注意事項】
              </div>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>すべての情報は仮説であり、断定表現は含まれていません</li>
                <li>最終的な判断は、実際の検証データと合わせて検討してください</li>
                <li>ペルソナ別のリスク感は、ターゲット設定の参考として活用してください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
