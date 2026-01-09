'use client';

import { useState } from 'react';
import { LPRough, MarketInsight, Persona } from '@/types/schema';

interface LPRoughViewProps {
  lpRough: LPRough;
  marketInsights: MarketInsight[];
  personas: Persona[];
  onNavigateToInsight?: (insightIndex: number) => void;
  onNavigateToPersona?: (personaId: string) => void;
}

export default function LPRoughView({
  lpRough,
  marketInsights,
  personas,
  onNavigateToInsight,
  onNavigateToPersona,
}: LPRoughViewProps) {
  const [selectedSectionOrder, setSelectedSectionOrder] = useState<number | null>(null);
  const [sectionOrder, setSectionOrder] = useState<number[]>(
    lpRough.sections.map((s) => s.order).sort((a, b) => a - b)
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const selectedSection = selectedSectionOrder
    ? lpRough.sections.find((s) => s.order === selectedSectionOrder)
    : null;

  const handleExportMarkdown = () => {
    let markdown = `# LP構成ラフ（${lpRough.strategy_option === 'A' ? '同調' : lpRough.strategy_option === 'B' ? '部分的にずらす' : 'あえて外す'}）\n\n`;

    // セクション一覧（順序入替後の順序を反映）
    markdown += '## セクション一覧\n\n';
    sectionOrder.forEach((order, displayIndex) => {
      const section = lpRough.sections.find((s) => s.order === order);
      if (!section) return;

      markdown += `### ${displayIndex + 1}. ${section.section_name}\n\n`;
      markdown += `**目的**: ${section.purpose}\n\n`;
      markdown += `**入れるべき要素**:\n`;
      section.include.forEach((item) => {
        markdown += `- ${item}\n`;
      });
      markdown += '\n';
    });

    // 注意点
    if (lpRough.cautions.length > 0) {
      markdown += '## 注意点\n\n';
      lpRough.cautions.forEach((caution) => {
        markdown += `### ${caution.point}\n\n`;
        markdown += `**壊れる条件**: ${caution.condition}\n\n`;
      });
    }

    // Planning Hooks
    if (lpRough.planning_hooks.length > 0) {
      markdown += '## Planning Hooks（まだ決めるべき問い）\n\n';
      lpRough.planning_hooks.forEach((hook) => {
        markdown += `### ${hook.question}\n\n`;
        markdown += `**背景**: ${hook.context}\n\n`;
      });
    }

    // ダウンロード
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lp-rough-${lpRough.strategy_option}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          LP構成ラフ（{lpRough.strategy_option === 'A' ? '同調' : lpRough.strategy_option === 'B' ? '部分的にずらす' : 'あえて外す'}）
        </h2>
        <button
          onClick={handleExportMarkdown}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Markdownエクスポート
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左：セクションリスト */}
        <div className="w-1/2 border-r overflow-y-auto p-6">
          <h3 className="text-lg font-bold mb-4">セクション一覧（順序入替可）</h3>
          <div className="space-y-3">
            {sectionOrder.map((order, displayIndex) => {
              const section = lpRough.sections.find((s) => s.order === order);
              if (!section) return null;

              return (
                <div
                  key={section.order}
                  draggable
                  onDragStart={() => setDraggedIndex(displayIndex)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex === null) return;

                    const newOrder = [...sectionOrder];
                    const [removed] = newOrder.splice(draggedIndex, 1);
                    newOrder.splice(displayIndex, 0, removed);
                    setSectionOrder(newOrder);
                    setDraggedIndex(null);
                  }}
                  className={`p-4 border rounded-lg cursor-move transition-colors ${
                    selectedSectionOrder === section.order
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${draggedIndex === displayIndex ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedSectionOrder(section.order)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-gray-500">#{displayIndex + 1}</span>
                    <h4 className="text-lg font-semibold">{section.section_name}</h4>
                    <span className="text-xs text-gray-400">ドラッグで順序変更</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{section.purpose}</p>
                  <div className="text-xs text-gray-600">
                    <div className="font-medium mb-1">入れるべき要素:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {section.include.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右：根拠パネル */}
        <div className="w-1/2 overflow-y-auto p-6 bg-gray-50">
          {selectedSection ? (
            <div>
              <h3 className="text-lg font-bold mb-4">根拠パネル</h3>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{selectedSection.section_name}</h4>
                <p className="text-sm text-gray-700 mb-4">{selectedSection.purpose}</p>
              </div>

              {/* 関連Market Insight */}
              {selectedSection.evidence_links.related_insights &&
                selectedSection.evidence_links.related_insights.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-sm text-gray-700 mb-2">関連Market Insight</h5>
                    <div className="space-y-2">
                      {selectedSection.evidence_links.related_insights.map((insightId, idx) => {
                        // insightIdが "insight-0" 形式の場合と、直接インデックスの場合に対応
                        const insightIndex = insightId.startsWith('insight-')
                          ? parseInt(insightId.split('-')[1] || '0', 10)
                          : parseInt(insightId, 10);
                        const insight = marketInsights[insightIndex];
                        if (!insight) return null;

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-white border rounded cursor-pointer hover:bg-gray-50"
                            onClick={() => onNavigateToInsight?.(insightIndex)}
                          >
                            <div className="text-sm font-medium text-gray-800 mb-1">
                              {insight.competitor_choice.choice}
                            </div>
                            <div className="text-xs text-gray-600">
                              {insight.competitor_choice.evidence}
                            </div>
                            {onNavigateToInsight && (
                              <div className="text-xs text-blue-600 mt-1 italic">
                                クリックでMarket Insight詳細を表示
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* 関連Persona */}
              {selectedSection.evidence_links.related_persona_ids &&
                selectedSection.evidence_links.related_persona_ids.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-sm text-gray-700 mb-2">関連Persona</h5>
                    <div className="space-y-2">
                      {selectedSection.evidence_links.related_persona_ids.map((personaId) => {
                        const persona = personas.find((p) => p.id === personaId);
                        if (!persona) return null;

                        return (
                          <div
                            key={personaId}
                            className="p-3 bg-white border rounded cursor-pointer hover:bg-gray-50"
                            onClick={() => onNavigateToPersona?.(personaId)}
                          >
                            <div className="text-sm font-medium text-gray-800 mb-1">
                              {persona.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              不安: {persona.concerns.slice(0, 2).join(', ')}
                            </div>
                            {onNavigateToPersona && (
                              <div className="text-xs text-blue-600 mt-1 italic">
                                クリックでPersona詳細を表示
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              左のセクションを選択すると、根拠が表示されます
            </div>
          )}

          {/* 注意点 */}
          {lpRough.cautions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-4">注意点</h3>
              <div className="space-y-3">
                {lpRough.cautions.map((caution, idx) => (
                  <div key={idx} className="p-4 bg-yellow-50 border border-yellow-300 rounded">
                    <div className="font-medium text-yellow-800 mb-2">{caution.point}</div>
                    <div className="text-sm text-yellow-700">{caution.condition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planning Hooks */}
          {lpRough.planning_hooks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-4">Planning Hooks（まだ決めるべき問い）</h3>
              <div className="space-y-3">
                {lpRough.planning_hooks.map((hook, idx) => (
                  <div key={idx} className="p-4 bg-white border rounded">
                    <div className="font-medium text-gray-800 mb-1">{hook.question}</div>
                    <div className="text-sm text-gray-600">{hook.context}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
