'use client';

import React from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { Persona } from '@/types';
import { Save } from 'lucide-react';

export default function ComparisonScreen() {
  const { comparison, personas, generateComparison, setCurrentStep, saveComparisonToKnowledgeBase } = usePersonaStore();

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (!comparison) {
      alert('保存する比較データがありません。');
      return;
    }
    
    setIsSaving(true);
    try {
      const comparisonId = await saveComparisonToKnowledgeBase(comparison);
      alert('ナレッジベースに保存しました。');
      // ナレッジベース画面への自動遷移を削除（保存後は現在の画面に留まる）
    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (personas.length < 2) {
      alert('比較するには、複数のペルソナが必要です。');
      return;
    }
    
    setIsGenerating(true);
    try {
      await generateComparison();
    } catch (error) {
      console.error('比較生成エラー:', error);
      alert(`比較生成でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">ペルソナ比較</h2>
          <div className="p-8 bg-blue-50 rounded-lg text-center">
            <p className="text-gray-600 mb-2">
              AIで詳細な比較分析を生成中...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!comparison || comparison.personas.length < 2) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">ペルソナ比較</h2>
          <div className="p-8 bg-yellow-50 rounded-lg text-center">
            <p className="text-gray-600 mb-2">
              {personas.length >= 2 ? '比較データを生成してください' : '⚠️ 比較するには、複数のペルソナが必要です'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              現在のペルソナ数: {personas.length}
            </p>
            {personas.length >= 2 ? (
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isGenerating ? '生成中...' : '比較データを生成'}
              </button>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Persona生成画面で複数のペルソナを生成してください。
                </p>
                <button
                  onClick={() => setCurrentStep('summary')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Persona生成画面へ
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ペルソナ比較</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || personas.length < 2}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="比較データを再生成"
            >
              {isGenerating ? '生成中...' : '再生成'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !comparison}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
              title="ナレッジベースに保存"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => setCurrentStep('summary')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Persona画面へ
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-semibold">観点</th>
                {comparison.personas.map((personaId) => {
                  const persona = personas.find(p => p.id === personaId);
                  return (
                    <th key={personaId} className="p-3 text-left font-semibold min-w-[300px]">
                      {persona?.one_line_summary || `ペルソナ${personaId}`}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* 1行要約 */}
              <tr className="border-b">
                <td className="p-3 font-medium bg-gray-50">1行要約</td>
                {comparison.personas.map((personaId) => (
                  <td key={personaId} className="p-3 align-top">
                    <div className="text-sm">{comparison.comparison.one_line_summary[personaId] || '情報不足'}</div>
                  </td>
                ))}
              </tr>
              {/* 背景ストーリー */}
              <tr className="border-b">
                <td className="p-3 font-medium bg-gray-50">背景ストーリー</td>
                {comparison.personas.map((personaId) => (
                  <td key={personaId} className="p-3 align-top">
                    <div className="text-sm">{comparison.comparison.background_story[personaId] || '情報不足'}</div>
                  </td>
                ))}
              </tr>
              {/* 購入の構造 */}
              <tr className="border-b">
                <td className="p-3 font-medium bg-gray-50">購入の構造</td>
                {comparison.personas.map((personaId) => {
                  const structure = comparison.comparison.proxy_purchase_structure[personaId];
                  return (
                    <td key={personaId} className="p-3 align-top">
                      {structure ? (
                        <div className="text-sm space-y-1">
                          <div><strong>誰の課題:</strong> {structure.whose_problem}</div>
                          <div><strong>誰が解決:</strong> {structure.who_solves}</div>
                          <div><strong>どう解決:</strong> {structure.how}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">情報不足</div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* JTBD */}
              <tr className="border-b">
                <td className="p-3 font-medium bg-gray-50">JTBD</td>
                {comparison.personas.map((personaId) => {
                  const jtbd = comparison.comparison.job_to_be_done[personaId];
                  return (
                    <td key={personaId} className="p-3 align-top">
                      {jtbd ? (
                        <div className="text-sm space-y-2">
                          <div><strong>機能:</strong> {jtbd.functional.join(', ') || 'なし'}</div>
                          <div><strong>感情:</strong> {jtbd.emotional.join(', ') || 'なし'}</div>
                          <div><strong>社会:</strong> {jtbd.social.join(', ') || 'なし'}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">情報不足</div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* 判断基準TOP5 */}
              <tr className="border-b">
                <td className="p-3 font-medium bg-gray-50">判断基準TOP5</td>
                {comparison.personas.map((personaId) => {
                  const criteria = comparison.comparison.decision_criteria_top5[personaId] || [];
                  return (
                    <td key={personaId} className="p-3 align-top">
                      {criteria.length > 0 ? (
                        <div className="text-sm space-y-1">
                          {criteria.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span>{idx + 1}. {c.criterion}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${c.weight * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{(c.weight * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">情報不足</div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* 典型ジャーニー */}
              <tr className="border-b">
                <td className="p-3 font-medium bg-gray-50">典型ジャーニー</td>
                {comparison.personas.map((personaId) => {
                  const journey = comparison.comparison.typical_journey[personaId];
                  return (
                    <td key={personaId} className="p-3 align-top">
                      {journey ? (
                        <div className="text-sm space-y-1">
                          <div><strong>きっかけ:</strong> {journey.trigger}</div>
                          <div><strong>検討:</strong> {journey.consideration}</div>
                          <div><strong>購入:</strong> {journey.purchase}</div>
                          <div><strong>継続:</strong> {journey.retention}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">情報不足</div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* 誤解しやすいポイント */}
              <tr className="border-b">
                <td className="p-3 font-medium bg-gray-50">誤解しやすいポイント</td>
                {comparison.personas.map((personaId) => {
                  const misconceptions = comparison.comparison.common_misconceptions[personaId] || [];
                  return (
                    <td key={personaId} className="p-3 align-top">
                      {misconceptions.length > 0 ? (
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {misconceptions.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-gray-400">情報不足</div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* 有効な施策 */}
              <tr className="border-b">
                <td className="p-3 font-medium bg-gray-50">有効な施策</td>
                {comparison.personas.map((personaId) => {
                  const strategies = comparison.comparison.effective_strategies[personaId];
                  return (
                    <td key={personaId} className="p-3 align-top">
                      {strategies ? (
                        <div className="text-sm space-y-2">
                          {strategies.messages && strategies.messages.length > 0 && (
                            <div>
                              <strong>メッセージ:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {strategies.messages.map((m, idx) => (
                                  <li key={idx}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {strategies.touchpoints && strategies.touchpoints.length > 0 && (
                            <div>
                              <strong>導線:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {strategies.touchpoints.map((t, idx) => (
                                  <li key={idx}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {strategies.offers && strategies.offers.length > 0 && (
                            <div>
                              <strong>オファー:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {strategies.offers.map((o, idx) => (
                                  <li key={idx}>{o}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">情報不足</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 共通点・相違点（概要） */}
        {(comparison.commonPoints.length > 0 || comparison.differences.length > 0) && (
          <div className="mt-6 space-y-4">
            {comparison.commonPoints.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">共通点（概要）</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {comparison.commonPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            {comparison.differences.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">相違点（概要）</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {comparison.differences.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 詳細分析（各フィールドごと） */}
        {comparison.detailedAnalysis && (
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-bold mb-4">詳細分析（フィールド別）</h3>
            
            {/* 1行要約 */}
            {comparison.detailedAnalysis.one_line_summary && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">1行要約</h4>
                {comparison.detailedAnalysis.one_line_summary.commonPoints && comparison.detailedAnalysis.one_line_summary.commonPoints.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-green-700">共通点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.one_line_summary.commonPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {comparison.detailedAnalysis.one_line_summary.differences && comparison.detailedAnalysis.one_line_summary.differences.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">相違点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.one_line_summary.differences.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 背景ストーリー */}
            {comparison.detailedAnalysis.background_story && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">背景ストーリー</h4>
                {comparison.detailedAnalysis.background_story.commonPoints && comparison.detailedAnalysis.background_story.commonPoints.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-green-700">共通点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.background_story.commonPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {comparison.detailedAnalysis.background_story.differences && comparison.detailedAnalysis.background_story.differences.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">相違点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.background_story.differences.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 購入の構造 */}
            {comparison.detailedAnalysis.proxy_purchase_structure && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">購入の構造</h4>
                {comparison.detailedAnalysis.proxy_purchase_structure.commonPoints && comparison.detailedAnalysis.proxy_purchase_structure.commonPoints.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-green-700">共通点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.proxy_purchase_structure.commonPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {comparison.detailedAnalysis.proxy_purchase_structure.differences && comparison.detailedAnalysis.proxy_purchase_structure.differences.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">相違点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.proxy_purchase_structure.differences.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* JTBD */}
            {comparison.detailedAnalysis.job_to_be_done && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">JTBD（Job to be Done）</h4>
                {comparison.detailedAnalysis.job_to_be_done.commonPoints && comparison.detailedAnalysis.job_to_be_done.commonPoints.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-green-700">共通点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.job_to_be_done.commonPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {comparison.detailedAnalysis.job_to_be_done.differences && comparison.detailedAnalysis.job_to_be_done.differences.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">相違点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.job_to_be_done.differences.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 判断基準TOP5 */}
            {comparison.detailedAnalysis.decision_criteria_top5 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">判断基準TOP5</h4>
                {comparison.detailedAnalysis.decision_criteria_top5.commonPoints && comparison.detailedAnalysis.decision_criteria_top5.commonPoints.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-green-700">共通点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.decision_criteria_top5.commonPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {comparison.detailedAnalysis.decision_criteria_top5.differences && comparison.detailedAnalysis.decision_criteria_top5.differences.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">相違点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.decision_criteria_top5.differences.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 典型ジャーニー */}
            {comparison.detailedAnalysis.typical_journey && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">典型ジャーニー</h4>
                {comparison.detailedAnalysis.typical_journey.commonPoints && comparison.detailedAnalysis.typical_journey.commonPoints.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-green-700">共通点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.typical_journey.commonPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {comparison.detailedAnalysis.typical_journey.differences && comparison.detailedAnalysis.typical_journey.differences.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">相違点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.typical_journey.differences.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 誤解しやすいポイント */}
            {comparison.detailedAnalysis.common_misconceptions && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">誤解しやすいポイント</h4>
                {comparison.detailedAnalysis.common_misconceptions.commonPoints && comparison.detailedAnalysis.common_misconceptions.commonPoints.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-green-700">共通点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.common_misconceptions.commonPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {comparison.detailedAnalysis.common_misconceptions.differences && comparison.detailedAnalysis.common_misconceptions.differences.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">相違点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.common_misconceptions.differences.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 有効な施策 */}
            {comparison.detailedAnalysis.effective_strategies && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">有効な施策</h4>
                {comparison.detailedAnalysis.effective_strategies.commonPoints && comparison.detailedAnalysis.effective_strategies.commonPoints.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-green-700">共通点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.effective_strategies.commonPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {comparison.detailedAnalysis.effective_strategies.differences && comparison.detailedAnalysis.effective_strategies.differences.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">相違点:</span>
                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                      {comparison.detailedAnalysis.effective_strategies.differences.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 次の思考への橋渡し */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">次に考えるとよい観点</h3>
          <ul className="space-y-2 text-sm">
            <li>
              • このペルソナで、競合はどんな表現をしているか
              <button className="ml-2 text-blue-600 hover:underline">→ 競合バナー分析アプリへ</button>
            </li>
            <li>
              • このペルソナ前提で、今回の訴求はどう設計するか
              <button className="ml-2 text-blue-600 hover:underline">→ クリエイティブ戦略整理アプリへ</button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
