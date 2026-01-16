'use client';

import { useState, useEffect } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { downloadJson } from '@/utils/exportJson';

export default function AggregationScreen() {
  const { 
    extractionRecords, 
    aggregation,
    setCurrentStep,
    getFinalizedExtractionRecords,
    isExtractionFinalized,
    generateAggregation,
    setAggregation
  } = usePersonaStore();
  
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const finalizedRecords = getFinalizedExtractionRecords();

  // 未確定の場合はExtraction確認画面にリダイレクト
  useEffect(() => {
    if (!isExtractionFinalized()) {
      alert('Extraction Recordが確定されていません。Extraction確認画面で確定してください。');
      setCurrentStep('extraction-review');
    }
  }, [isExtractionFinalized, setCurrentStep]);

  // 初回表示時にAggregationを生成
  useEffect(() => {
    if (isExtractionFinalized() && !aggregation && finalizedRecords.length > 0) {
      handleGenerate();
    }
  }, [isExtractionFinalized, aggregation, finalizedRecords.length]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateAggregation();
    } catch (error) {
      console.error('Aggregation生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // APIキーが設定されていない場合の特別な処理
      if (errorMessage.includes('APIキーが設定されていません')) {
        const setupInfo = errorMessage.split('\n\n')[1] || '';
        alert(`APIキーが設定されていません。\n\n${setupInfo}\n\n詳細は README_LLM_SETUP.md を参照してください。`);
      } else {
        alert(`Aggregation生成でエラーが発生しました: ${errorMessage}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isExtractionFinalized()) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="p-8 bg-red-50 rounded-lg text-center">
            <p className="text-red-600 font-semibold mb-2">
              ⚠️ Extraction Recordが確定されていません
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Aggregation生成には、確定済みのExtraction Recordが必要です。
            </p>
            <button
              onClick={() => setCurrentStep('extraction-review')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Extraction確認画面へ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCluster = aggregation?.clusters.find((c) => c.id === selectedCluster);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Aggregation生成・確認</h2>
          <div className="flex gap-2">
            {aggregation && (
              <button
                onClick={() => downloadJson(aggregation, 'B.json')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                title="Aggregation JSONをエクスポート"
              >
                B.json エクスポート
              </button>
            )}
            {!aggregation && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isGenerating ? '生成中...' : 'Aggregation生成'}
              </button>
            )}
            {aggregation && (
              <button
                onClick={() => setCurrentStep('persona-axis')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                次へ（ペルソナ軸設定）
              </button>
            )}
          </div>
        </div>

        {!aggregation ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-semibold mb-2">
                ✓ 確定済みExtraction Recordを使用します
              </p>
              <p className="text-sm text-gray-600">
                確定済みExtraction数: {finalizedRecords.length}件
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ※ 生テキストやStatementから直接生成することはできません
              </p>
            </div>
            
            {isGenerating ? (
              <div className="p-8 bg-blue-50 rounded-lg text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Aggregation生成中...</p>
              </div>
            ) : (
              <div className="p-8 bg-yellow-50 rounded-lg text-center">
                <p className="text-gray-600 mb-2">
                  Aggregation生成を開始してください
                </p>
                <p className="text-sm text-gray-500">
                  Extraction JSONのみを入力として、クラスタリングを行います。
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* 左: クラスタ一覧 */}
            <div className="col-span-1 space-y-3">
              <h3 className="font-semibold text-lg mb-3">クラスタ一覧</h3>
              <div className="space-y-2">
                {aggregation.clusters.map((cluster) => (
                  <button
                    key={cluster.id}
                    onClick={() => setSelectedCluster(cluster.id)}
                    className={`w-full p-3 text-left border rounded-lg ${
                      selectedCluster === cluster.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{cluster.name}</div>
                    <div className="text-xs text-gray-600">
                      出現率: {(cluster.prevalence * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {cluster.respondent_ids?.length ?? 0}件
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                <div>総回答者数: {aggregation.total_respondents}人</div>
                <div>クラスタ数: {aggregation.clusters.length}個</div>
                <div className="mt-2 text-gray-500">
                  生成日時: {new Date(aggregation.metadata.generated_at).toLocaleString('ja-JP')}
                </div>
              </div>
            </div>

            {/* 右: クラスタ詳細 */}
            <div className="col-span-2">
              {currentCluster ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{currentCluster.name}</h3>
                  
                  {/* 出現率 */}
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="text-sm font-medium">出現率</div>
                    <div className="text-2xl font-bold">{(currentCluster.prevalence * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {currentCluster.respondent_ids?.length ?? 0} / {aggregation.total_respondents}人
                    </div>
                  </div>

                  {/* 代表的パターン */}
                  <div>
                    <h4 className="font-semibold mb-2">代表的パターン</h4>
                    
                    <div className="space-y-3">
                      {/* トリガー */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">トリガー</div>
                        <div className="flex flex-wrap gap-2">
                          {currentCluster.patterns.triggers.length > 0 ? (
                            currentCluster.patterns.triggers.map((trigger, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                              >
                                {trigger}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">情報不足</span>
                          )}
                        </div>
                      </div>

                      {/* 判断基準 */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">判断基準</div>
                        <div className="space-y-1">
                          {Object.keys(currentCluster.patterns.decision_criteria).length > 0 ? (
                            Object.entries(currentCluster.patterns.decision_criteria)
                              .sort(([, a], [, b]) => (b || 0) - (a || 0))
                              .map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600 w-24">{key}:</span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${(value || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600 w-12 text-right">
                                    {(value || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))
                          ) : (
                            <span className="text-xs text-gray-400">情報不足</span>
                          )}
                        </div>
                      </div>

                      {/* 障壁 */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">障壁</div>
                        <div className="flex flex-wrap gap-2">
                          {currentCluster.patterns.barriers.length > 0 ? (
                            currentCluster.patterns.barriers.map((barrier, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded"
                              >
                                {barrier}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">情報不足</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 代表引用 */}
                  <div>
                    <h4 className="font-semibold mb-2">代表引用（{currentCluster.representative_quotes.length}件）</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {currentCluster.representative_quotes.map((quote, idx) => (
                        <div
                          key={idx}
                          className="p-3 border border-gray-200 rounded text-sm"
                        >
                          <div className="mb-1">「{quote.quote}」</div>
                          <div className="text-xs text-gray-500">
                            [{quote.respondent_id}] {quote.category}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-600">左側のクラスタを選択して詳細を確認してください</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
