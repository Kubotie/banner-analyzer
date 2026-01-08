'use client';

import { Persona, MarketInsight } from '@/types/schema';

interface PersonaViewProps {
  personas: Persona[];
  marketInsights: MarketInsight[];
  onNavigateToInsight?: (insightIndex: number) => void;
}

export default function PersonaView({
  personas,
  marketInsights,
  onNavigateToInsight,
}: PersonaViewProps) {
  // 各ペルソナに関連するMarket Insightを取得
  const getRelatedInsights = (personaId: string): MarketInsight[] => {
    return marketInsights.filter((mi) =>
      mi.persona_relevance.some((pr) => pr.persona_id === personaId)
    );
  };

  return (
    <div className="space-y-6">
      {personas.length === 0 ? (
        <div className="text-center text-gray-500 py-8">ペルソナがありません</div>
      ) : (
        personas.map((persona) => {
          const relatedInsights = getRelatedInsights(persona.id);

          return (
            <div key={persona.id} className="bg-white rounded-lg border p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">{persona.name}</h3>
                <div className="text-sm text-gray-600">ID: {persona.id}</div>
              </div>

              {/* 不安・懸念事項 */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">不安・懸念事項</div>
                <div className="flex flex-wrap gap-2">
                  {persona.concerns.map((concern, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs"
                    >
                      {concern}
                    </span>
                  ))}
                </div>
              </div>

              {/* 判断基準 */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">判断基準</div>
                <div className="flex flex-wrap gap-2">
                  {persona.decision_criteria.map((criteria, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                    >
                      {criteria}
                    </span>
                  ))}
                </div>
              </div>

              {/* 行動パターン */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">行動パターン</div>
                <div className="flex flex-wrap gap-2">
                  {persona.behavior_patterns.map((pattern, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs"
                    >
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>

              {/* 関連するMarket Insight */}
              {relatedInsights.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    関連する市場インサイト ({relatedInsights.length}件)
                  </div>
                  <div className="space-y-2">
                    {relatedInsights.map((insight, idx) => {
                      const relevance = insight.persona_relevance.find(
                        (pr) => pr.persona_id === persona.id
                      );
                      const relevanceSymbol =
                        relevance?.relevance_level === 'high'
                          ? '◎'
                          : relevance?.relevance_level === 'medium'
                          ? '◯'
                          : relevance?.relevance_level === 'low'
                          ? '△'
                          : '？';

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => onNavigateToInsight?.(marketInsights.indexOf(insight))}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-600">{relevanceSymbol}</span>
                            <span className="text-sm font-medium text-gray-800">
                              {insight.competitor_choice.choice}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {insight.competitor_choice.evidence}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 italic">
                            クリックで詳細を表示
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 備考 */}
              {persona.notes && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium text-gray-700 mb-1">備考</div>
                  <div className="text-sm text-gray-600">{persona.notes}</div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
