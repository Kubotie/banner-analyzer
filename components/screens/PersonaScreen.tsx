'use client';

import { useState, useEffect } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { useProductStore } from '@/store/useProductStore';
import { downloadJson } from '@/utils/exportJson';
import { Save } from 'lucide-react';
import { savePersona } from '@/lib/kb-client';
import { getKBItem } from '@/kb/db';
import { PersonaPayload } from '@/kb/types';

export default function PersonaScreen() {
  const { activeProduct } = useProductStore();
  const { 
    aggregation,
    personas,
    personaAxes,
    updatingPersonaId,
    setCurrentStep,
    generatePersonas,
    project,
  } = usePersonaStore();
  
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 初回表示時は自動生成しない（ペルソナ軸設定が必要なため）
  // useEffect(() => {
  //   if (aggregation && personas.length === 0 && aggregation.clusters.length > 0) {
  //     handleGenerate();
  //   }
  // }, [aggregation, personas.length]);
  
  // 最初のPersonaを選択
  useEffect(() => {
    if (personas.length > 0 && !selectedPersonaId) {
      setSelectedPersonaId(personas[0].id);
    }
  }, [personas, selectedPersonaId]);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generatePersonas();
    } catch (error) {
      console.error('Persona生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // APIキーが設定されていない場合の特別な処理
      if (errorMessage.includes('APIキーが設定されていません')) {
        const setupInfo = errorMessage.split('\n\n')[1] || '';
        alert(`APIキーが設定されていません。\n\n${setupInfo}\n\n詳細は README_LLM_SETUP.md を参照してください。`);
      } else {
        alert(`Persona生成でエラーが発生しました: ${errorMessage}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPersona) {
      alert('保存するペルソナを選択してください。');
      return;
    }
    
    setIsSaving(true);
    try {
      // 更新モードの場合、既存のペルソナを更新
      if (updatingPersonaId) {
        const { getKBItem } = await import('@/kb/db');
        const existingItem = getKBItem(updatingPersonaId);
        if (existingItem) {
          // PersonaPayloadに変換（savePersonaと同じロジック）
          const updatedPayload: PersonaPayload = {
            type: 'persona',
            persona_id: selectedPersona.id || `persona-${Date.now()}`,
            hypothesis_label: '仮説ペルソナ',
            summary: selectedPersona.one_line_summary || '',
            story: selectedPersona.background_story || '',
            proxy_structure: {
              whose_problem: selectedPersona.proxy_purchase_structure?.whose_problem || '',
              who_solves: selectedPersona.proxy_purchase_structure?.who_solves || '',
              how: selectedPersona.proxy_purchase_structure?.how || '',
            },
            jtbd: {
              functional: selectedPersona.job_to_be_done?.functional || [],
              emotional: selectedPersona.job_to_be_done?.emotional || [],
              social: selectedPersona.job_to_be_done?.social || [],
            },
            decision_criteria_top5: selectedPersona.decision_criteria_top5 || [],
            journey: {
              trigger: selectedPersona.typical_journey?.trigger || '',
              consider: selectedPersona.typical_journey?.consideration || '',
              purchase: selectedPersona.typical_journey?.purchase || '',
              continue: selectedPersona.typical_journey?.retention || '',
            },
            pitfalls: selectedPersona.common_misconceptions || [],
            tactics: {
              message: selectedPersona.effective_strategies?.messages || [],
              route: selectedPersona.effective_strategies?.touchpoints || [],
              offer: selectedPersona.effective_strategies?.offers || [],
            },
            evidence: {
              quotes: (selectedPersona.evidence?.quotes || []).map((q: any) => ({
                text: q.text || q.quoteText || '',
                respondent_id: q.respondent_id || q.respondentId || '',
                category: q.category || 'general',
              })),
              count: selectedPersona.evidence?.count || selectedPersona.evidence?.quotes?.length || 0,
            },
            evidence_quotes: (selectedPersona.evidence?.quotes || []).map((q: any) => ({
              text: q.text || q.quoteText || '',
              source_file: q.source_file || q.source || '',
              line_number: q.line_number || q.lineNumber,
              line_range: q.line_range || (q.lineRange ? { start: q.lineRange.start, end: q.lineRange.end } : undefined),
              statement_id: q.statement_id || q.statementId,
              category: q.category || 'general',
            })),
          };
          
          // 既存アイテムを更新（payloadとupdated_atを更新）
          const stored = localStorage.getItem('kb_items');
          if (stored) {
            const items = JSON.parse(stored);
            const index = items.findIndex((i: any) => i.kb_id === updatingPersonaId);
            if (index !== -1) {
              items[index] = {
                ...items[index],
                payload: updatedPayload,
                updated_at: new Date().toISOString(),
                source_project_id: activeProduct?.productId, // productIdを更新
              };
              localStorage.setItem('kb_items', JSON.stringify(items));
            }
          }
          alert('ペルソナを更新しました。');
        }
      } else {
        // 新規保存
        await savePersona(selectedPersona, {
          title: `KB-Persona_${selectedPersona.one_line_summary.substring(0, 20)}`,
          folder_path: 'My Files/Personas',
          source_app: 'persona-app',
          source_project_id: activeProduct?.productId, // productIdをsource_project_idとして使用
        });
        alert('ナレッジベースに保存しました。');
      }
      // ナレッジベース画面への自動遷移を削除（保存後は現在の画面に留まる）
    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);
  
  const criteriaLabel: { [key: string]: string } = {
    price: '価格',
    trust: '信頼',
    effort: '手間',
    effectiveness: '効果',
  };
  
  if (!aggregation) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="p-8 bg-red-50 rounded-lg text-center">
            <p className="text-red-600 font-semibold mb-2">
              ⚠️ Aggregation結果がありません
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Persona生成には、Aggregation結果が必要です。
            </p>
            <button
              onClick={() => setCurrentStep('aggregation')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Aggregation画面へ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Persona表示</h2>
          <div className="flex gap-2">
            {personas.length > 0 && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !selectedPersona}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
                  title="ナレッジベースに保存"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => downloadJson(personas, 'C.json')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                  title="Persona JSONをエクスポート"
                >
                  C.json エクスポート
                </button>
              </>
            )}
            {personas.length === 0 && (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {isGenerating ? '生成中...' : 'Persona生成'}
                </button>
                <button
                  onClick={() => setCurrentStep('persona-axis')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                  title="ペルソナ軸を設定・編集"
                >
                  ペルソナ軸設定
                </button>
              </>
            )}
            {personas.length > 0 && (
              <button
                onClick={() => setCurrentStep('comparison')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                比較画面へ
              </button>
            )}
          </div>
        </div>
        
        {personas.length === 0 ? (
          <div className="space-y-4">
            {updatingPersonaId && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 font-semibold mb-2">
                  ℹ️ 既存ペルソナを更新します
                </p>
                <p className="text-sm text-gray-700">
                  新しいデータを追加して、既存のペルソナを更新します。
                </p>
              </div>
            )}
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-semibold mb-2">
                ✓ Aggregation結果を使用します
              </p>
              <p className="text-sm text-gray-600">
                クラスタ数: {aggregation.clusters.length}個
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ※ Extractionに直接戻らず、Aggregation結果のみを入力として使用します
              </p>
            </div>
            
            {isGenerating ? (
              <div className="p-8 bg-blue-50 rounded-lg text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Persona生成中...</p>
              </div>
            ) : (
              <div className="p-8 bg-yellow-50 rounded-lg text-center">
                <p className="text-gray-600 mb-2">
                  Persona生成を開始してください
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Aggregation結果のみを入力として、Personaカードを生成します。
                </p>
                {personaAxes.length === 0 && (
                  <div className="p-4 bg-red-50 rounded-lg mb-4">
                    <p className="text-red-800 font-semibold mb-2">
                      ⚠️ ペルソナ軸が設定されていません
                    </p>
                    <p className="text-sm text-red-600 mb-3">
                      Persona生成には、ペルソナ軸の設定が必要です。
                    </p>
                    <button
                      onClick={() => setCurrentStep('persona-axis')}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      ペルソナ軸設定へ
                    </button>
                  </div>
                )}
                {personaAxes.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-800 font-semibold mb-2">
                      ✓ 設定済みのペルソナ軸 ({personaAxes.length}件)
                    </p>
                    <ul className="text-sm text-blue-700 text-left list-disc list-inside">
                      {personaAxes.map((axis) => (
                        <li key={axis.id}>{axis.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* タブ */}
            <div className="flex gap-2 border-b">
              {personas.map((persona) => {
                const cluster = aggregation.clusters.find((c) => c.id === persona.cluster_id);
                return (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersonaId(persona.id)}
                    className={`px-4 py-2 font-medium ${
                      selectedPersonaId === persona.id
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {persona.cluster_id} ({cluster ? `${(cluster.prevalence * 100).toFixed(1)}%` : ''})
                  </button>
                );
              })}
            </div>
            
            {/* Personaカード */}
            {selectedPersona && (
              <div className="space-y-6">
                {/* 仮説ペルソナラベル */}
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ※仮説ペルソナ（一次情報に基づく現時点の判断）
                </div>
                
                {/* 1行要約 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">【1行要約】</h3>
                  <p className="text-lg">{selectedPersona.one_line_summary}</p>
                </div>
                
                {/* 背景ストーリー */}
                <div>
                  <h3 className="font-semibold mb-2">【背景ストーリー】</h3>
                  <p className="text-gray-700">{selectedPersona.background_story}</p>
                </div>
                
                {/* 購入の構造 */}
                <div>
                  <h3 className="font-semibold mb-2">【購入の構造】</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <span className="font-medium w-24">誰の課題:</span>
                      <span className="text-gray-700">{selectedPersona.proxy_purchase_structure.whose_problem}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium w-24">誰が解決:</span>
                      <span className="text-gray-700">{selectedPersona.proxy_purchase_structure.who_solves}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium w-24">どう解決:</span>
                      <span className="text-gray-700">{selectedPersona.proxy_purchase_structure.how}</span>
                    </div>
                  </div>
                </div>
                
                {/* JTBD */}
                <div>
                  <h3 className="font-semibold mb-2">【JTBD】</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">機能:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedPersona.job_to_be_done.functional.map((jtbd, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded"
                          >
                            {jtbd}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">感情:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedPersona.job_to_be_done.emotional.map((jtbd, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-pink-100 text-pink-800 text-sm rounded"
                          >
                            {jtbd}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">社会:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedPersona.job_to_be_done.social.map((jtbd, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded"
                          >
                            {jtbd}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 判断基準TOP5 */}
                <div>
                  <h3 className="font-semibold mb-2">【判断基準TOP5】</h3>
                  <div className="space-y-2">
                    {selectedPersona.decision_criteria_top5.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="font-medium w-8">{idx + 1}.</span>
                        <span className="text-gray-700 w-24">{item.criterion}:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full"
                            style={{ width: `${item.weight * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-16 text-right">
                          {item.weight.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 典型ジャーニー */}
                <div>
                  <h3 className="font-semibold mb-2">【典型ジャーニー】</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <span className="font-medium w-24">きっかけ:</span>
                      <span className="text-gray-700">{selectedPersona.typical_journey.trigger}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium w-24">検討:</span>
                      <span className="text-gray-700">{selectedPersona.typical_journey.consideration}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium w-24">購入:</span>
                      <span className="text-gray-700">{selectedPersona.typical_journey.purchase}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium w-24">継続:</span>
                      <span className="text-gray-700">{selectedPersona.typical_journey.retention}</span>
                    </div>
                  </div>
                </div>
                
                {/* 誤解しやすいポイント */}
                <div>
                  <h3 className="font-semibold mb-2">【誤解しやすいポイント】</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {selectedPersona.common_misconceptions.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
                
                {/* 有効な施策 */}
                <div>
                  <h3 className="font-semibold mb-2">【有効な施策】</h3>
                  <div className="space-y-3">
                    {selectedPersona.effective_strategies.messages && selectedPersona.effective_strategies.messages.length > 0 && (
                      <div>
                        <span className="font-medium">メッセージ:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedPersona.effective_strategies.messages.map((msg, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                            >
                              {msg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedPersona.effective_strategies.touchpoints && selectedPersona.effective_strategies.touchpoints.length > 0 && (
                      <div>
                        <span className="font-medium">導線:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedPersona.effective_strategies.touchpoints.map((tp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-indigo-100 text-indigo-800 text-sm rounded"
                            >
                              {tp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedPersona.effective_strategies.offers && selectedPersona.effective_strategies.offers.length > 0 && (
                      <div>
                        <span className="font-medium">オファー:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedPersona.effective_strategies.offers.map((offer, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded"
                            >
                              {offer}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Evidence */}
                <div>
                  <h3 className="font-semibold mb-2">【Evidence】</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    引用件数: {selectedPersona.evidence.count}件
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedPersona.evidence.quotes.map((quote, idx) => (
                      <div
                        key={idx}
                        className="p-3 border border-gray-200 rounded text-sm"
                      >
                        <div className="mb-1">「{quote.text}」</div>
                        <div className="text-xs text-gray-500">
                          [{quote.respondent_id}] {quote.category}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
