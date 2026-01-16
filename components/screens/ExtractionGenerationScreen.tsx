'use client';

import { useState } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';

export default function ExtractionGenerationScreen() {
  const { inputSources, generateExtractions, setCurrentStep } = usePersonaStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress('処理を開始しています...');
    try {
      // 進捗を監視するためのログリスナーを設定
      const originalLog = console.log;
      const originalWarn = console.warn;
      
      console.log = (...args) => {
        originalLog(...args);
        if (args[0] && typeof args[0] === 'string' && args[0].includes('Extraction生成中:')) {
          setProgress(args[0]);
        }
      };
      
      console.warn = (...args) => {
        originalWarn(...args);
        if (args[0] && typeof args[0] === 'string' && args[0].includes('quotesが空です')) {
          setProgress(args[0]);
        }
      };
      
      await generateExtractions();
      setGenerated(true);
      setProgress('完了しました！');
      
      // ログリスナーを元に戻す
      console.log = originalLog;
      console.warn = originalWarn;
    } catch (error) {
      console.error('Extraction生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // APIキーが設定されていない場合の特別な処理
      if (errorMessage.includes('APIキーが設定されていません')) {
        setProgress('APIキーが設定されていません。設定方法を確認してください。');
        // アラートの代わりに、より詳細な情報を表示
        const setupInfo = errorMessage.split('\n\n')[1] || '';
        alert(`APIキーが設定されていません。\n\n${setupInfo}\n\n詳細は README_LLM_SETUP.md を参照してください。`);
      } else {
        alert(`Extraction生成でエラーが発生しました: ${errorMessage}`);
      }
      setProgress('エラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    setCurrentStep('extraction-review');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Extraction生成</h2>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              発言から事実のみを抽出し、Extraction JSONを生成します。
            </p>
            <p className="text-sm text-gray-500 mb-4">
              入力ソース数: {inputSources.length}件
            </p>
            <p className="text-xs text-gray-400 mb-4">
              ※ LLMが入力テキストを分析し、回答者（respondent）を識別してExtractionを生成します
            </p>
          </div>

          {!generated ? (
            <div className="space-y-4">
              {isGenerating ? (
                <div className="p-8 bg-blue-50 rounded-lg text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-semibold mb-2">Extraction生成中...</p>
                  {progress && (
                    <p className="text-sm text-gray-500">{progress}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    この処理には時間がかかる場合があります。しばらくお待ちください。
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={inputSources.length === 0}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  AIでExtraction生成
                </button>
              )}
            </div>
          ) : (
            <div className="p-6 bg-green-50 rounded-lg">
              <p className="text-green-800 font-semibold mb-2">
                ✓ Extraction生成が完了しました
              </p>
              <p className="text-sm text-gray-600 mb-4">
                生成されたExtraction JSONを確認・修正してください。
              </p>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                確認・修正へ進む
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
