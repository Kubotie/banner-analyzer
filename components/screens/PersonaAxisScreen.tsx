'use client';

import React, { useState } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { PersonaAxis } from '@/types';
import { Plus, X, ArrowRight, Sparkles } from 'lucide-react';

export default function PersonaAxisScreen() {
  const { personaAxes, setPersonaAxes, addPersonaAxis, updatePersonaAxis, deletePersonaAxis, setCurrentStep, aggregation, generatePersonaAxesWithAI } = usePersonaStore();
  const [newAxisName, setNewAxisName] = useState('');
  const [newAxisDescription, setNewAxisDescription] = useState('');
  const [isGeneratingAxes, setIsGeneratingAxes] = useState(false);

  const handleAddAxis = () => {
    if (!newAxisName.trim()) {
      alert('軸名を入力してください。');
      return;
    }

    const newAxis: PersonaAxis = {
      id: `axis-${Date.now()}`,
      name: newAxisName.trim(),
      description: newAxisDescription.trim() || undefined,
      order: personaAxes.length,
    };

    addPersonaAxis(newAxis);
    setNewAxisName('');
    setNewAxisDescription('');
  };

  const handleDeleteAxis = (id: string) => {
    if (confirm('この軸を削除しますか？')) {
      deletePersonaAxis(id);
      // 削除後にorderを再設定
      const updatedAxes = personaAxes.filter(axis => axis.id !== id).map((axis, idx) => ({
        ...axis,
        order: idx,
      }));
      setPersonaAxes(updatedAxes);
    }
  };

  const handleGenerateAxesWithAI = async () => {
    if (!aggregation || !aggregation.clusters || aggregation.clusters.length === 0) {
      alert('Aggregation結果が必要です。先にAggregationを生成してください。');
      return;
    }
    
    setIsGeneratingAxes(true);
    try {
      await generatePersonaAxesWithAI();
      alert('AIでペルソナ軸を生成しました。');
    } catch (error) {
      console.error('ペルソナ軸生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // APIキーが設定されていない場合の特別な処理
      if (errorMessage.includes('APIキーが設定されていません')) {
        const setupInfo = errorMessage.split('\n\n')[1] || '';
        alert(`APIキーが設定されていません。\n\n${setupInfo}\n\n詳細は README_LLM_SETUP.md を参照してください。`);
      } else {
        alert(`ペルソナ軸生成でエラーが発生しました: ${errorMessage}`);
      }
    } finally {
      setIsGeneratingAxes(false);
    }
  };

  const handleNext = () => {
    if (personaAxes.length === 0) {
      alert('少なくとも1つのペルソナ軸を設定してください。');
      return;
    }
    setCurrentStep('summary'); // Persona生成画面へ
  };

  const handleBack = () => {
    setCurrentStep('aggregation');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ペルソナ軸設定</h2>
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              戻る
            </button>
            <button
              onClick={handleNext}
              disabled={personaAxes.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Persona生成へ進む
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">
            <strong>ペルソナ軸とは：</strong>
          </p>
          <p className="text-sm text-gray-600 mb-2">
            生成するペルソナの分類軸を設定します。各軸に沿って、Aggregation結果からペルソナを生成します。
          </p>
          <p className="text-sm text-gray-600 mb-3">
            例：自身購入で悩みが深い人、自身購入で悩みが浅い人、代理購入の人
          </p>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <button
              onClick={handleGenerateAxesWithAI}
              disabled={isGeneratingAxes || !aggregation || !aggregation.clusters || aggregation.clusters.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isGeneratingAxes ? 'AIで生成中...' : 'AIで自動生成'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              AIがAggregation結果を分析して、適切なペルソナ軸を自動生成します。
            </p>
          </div>
        </div>

        {/* 軸追加フォーム */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-3">新しい軸を追加</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">軸名（必須）</label>
              <input
                type="text"
                value={newAxisName}
                onChange={(e) => setNewAxisName(e.target.value)}
                placeholder="例: 自身購入で悩みが深い人"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddAxis();
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">説明（任意）</label>
              <textarea
                value={newAxisDescription}
                onChange={(e) => setNewAxisDescription(e.target.value)}
                placeholder="この軸の詳細説明（任意）"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={handleAddAxis}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              軸を追加
            </button>
          </div>
        </div>

        {/* 軸一覧 */}
        <div>
          <h3 className="font-semibold mb-3">設定済みの軸 ({personaAxes.length}件)</h3>
          {personaAxes.length === 0 ? (
            <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
              軸が設定されていません。上記のフォームから軸を追加してください。
            </div>
          ) : (
            <div className="space-y-3">
              {personaAxes
                .sort((a, b) => a.order - b.order)
                .map((axis) => (
                  <div key={axis.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-500">#{axis.order + 1}</span>
                          <h4 className="font-semibold text-lg">{axis.name}</h4>
                        </div>
                        {axis.description && (
                          <p className="text-sm text-gray-600 mt-1">{axis.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAxis(axis.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="削除"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* 注意事項 */}
        {personaAxes.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>注意：</strong>設定した軸に沿って、Aggregation結果の各クラスタからPersonaが生成されます。
              クラスタ数: {aggregation?.clusters?.length || 0}個
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
