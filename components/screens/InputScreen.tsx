'use client';

import { useState, useEffect } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { useProductStore } from '@/store/useProductStore';
import { InputSource } from '@/types';
import { useRouter } from 'next/navigation';

export default function InputScreen() {
  const router = useRouter();
  const { inputSources, addInputSource, removeInputSource, splitTextIntoStatements, addStatements, setCurrentStep, setUpdatingPersonaId, resetSession } = usePersonaStore();
  const { activeProduct } = useProductStore();
  
  const [personaMode, setPersonaMode] = useState<'new' | 'update'>('new');
  const [selectedExistingPersonaId, setSelectedExistingPersonaId] = useState<string | null>(null);
  const [existingPersonas, setExistingPersonas] = useState<any[]>([]);
  const [inputType, setInputType] = useState<'interview' | 'comment' | 'persona'>('interview');
  const [text, setText] = useState('');
  const [metadata, setMetadata] = useState({
    interviewName: '',
    interviewDate: '',
    segment: '',
    owner: '',
  });

  // 既存ペルソナを読み込む（API経由で取得）
  useEffect(() => {
    if (activeProduct && personaMode === 'update') {
      (async () => {
        try {
          // APIエンドポイント経由でpersonaを取得
          const params = new URLSearchParams();
          params.set('type', 'persona');
          if (activeProduct.productId) {
            params.set('source_project_id', activeProduct.productId);
          }
          
          const response = await fetch(`/api/kb/items?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch personas');
          
          const data = await response.json();
          setExistingPersonas(data.items || []);
        } catch (error) {
          console.error('既存ペルソナ読み込みエラー:', error);
          setExistingPersonas([]);
        }
      })();
    } else {
      setExistingPersonas([]);
    }
  }, [activeProduct, personaMode]);

  // 既存ペルソナを選択した場合、そのペルソナの情報を表示（KB参照に統一）
  useEffect(() => {
    if (selectedExistingPersonaId) {
      // 既存ペルソナの情報を表示（参考用）
      // 実際の更新はPersona生成後に実行
      // 必要に応じてKBから詳細を取得可能
    }
  }, [selectedExistingPersonaId]);

  const handleAddSource = () => {
    if (!text.trim()) return;

    const sourceId = `source-${Date.now()}`;
    const source: InputSource = {
      id: sourceId,
      type: inputType,
      text,
      metadata: {
        interviewName: metadata.interviewName || undefined,
        interviewDate: metadata.interviewDate || undefined,
        segment: metadata.segment || undefined,
        owner: metadata.owner || undefined,
      },
      createdAt: new Date().toISOString(),
    };

    addInputSource(source);
    setText('');
    setMetadata({ interviewName: '', interviewDate: '', segment: '', owner: '' });
  };

  const handleStartExtraction = () => {
    // 更新モードの場合、既存ペルソナIDを設定
    if (personaMode === 'update' && selectedExistingPersonaId) {
      setUpdatingPersonaId(selectedExistingPersonaId);
    } else {
      setUpdatingPersonaId(null);
    }
    
    // Statement生成をスキップして、直接Extraction生成へ
    // LLMが入力ソース全体を分析してrespondentを識別するため、事前のStatement分割は不要
    setCurrentStep('extraction');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  const handleStartNewSession = () => {
    if (confirm('新規セッションを開始しますか？現在の入力データはすべてクリアされます。')) {
      resetSession();
      setPersonaMode('new');
      setSelectedExistingPersonaId(null);
      setText('');
      setMetadata({ interviewName: '', interviewDate: '', segment: '', owner: '' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">データ入力</h2>
          <button
            onClick={handleStartNewSession}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            新規セッションを開始
          </button>
        </div>
        
        {!activeProduct && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-semibold mb-2">
              ⚠️ サービス・製品が選択されていません
            </p>
            <p className="text-sm text-yellow-700 mb-3">
              ペルソナ作成を開始するには、まずサービス・製品を選択してください。
            </p>
            <button
              onClick={() => router.push('/products')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              サービス・製品登録へ
            </button>
          </div>
        )}

        {activeProduct && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium mb-2">ペルソナ作成モード</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="new"
                  checked={personaMode === 'new'}
                  onChange={(e) => setPersonaMode(e.target.value as 'new' | 'update')}
                  className="mr-2"
                />
                新規作成
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="update"
                  checked={personaMode === 'update'}
                  onChange={(e) => setPersonaMode(e.target.value as 'new' | 'update')}
                  className="mr-2"
                />
                既存を更新
              </label>
            </div>
            {personaMode === 'update' && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2">更新するペルソナを選択（必須）</label>
                {existingPersonas.length === 0 ? (
                  <div className="p-3 bg-yellow-50 rounded border border-yellow-200 text-sm text-yellow-800">
                    この製品・サービスに登録されているペルソナがありません。新規作成モードで作成してください。
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedExistingPersonaId || ''}
                      onChange={(e) => setSelectedExistingPersonaId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">選択してください</option>
                      {existingPersonas.map((item) => {
                        // payloadからペルソナ情報を取得
                        const payload = item.payload as any;
                        const personaSummary = payload?.summary || item.title;
                        return (
                          <option key={item.kb_id} value={item.kb_id}>
                            {item.title} - {personaSummary.substring(0, 30)}... ({new Date(item.updated_at).toLocaleDateString('ja-JP')})
                          </option>
                        );
                      })}
                    </select>
                    {selectedExistingPersonaId && (
                      <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200 text-sm">
                        <p className="text-blue-800 font-medium mb-1">
                          ✓ 選択したペルソナを更新します
                        </p>
                        <p className="text-blue-700 text-xs">
                          新しいデータを入力して、既存のペルソナを更新できます。既存のペルソナ情報に新しいデータが追加・反映されます。
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">入力タイプ</label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="interview">インタビュー記録</option>
              <option value="comment">定性コメント</option>
              <option value="persona">既存ペルソナ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ファイル取り込み（.txt / .md）</label>
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">インタビュー名（任意）</label>
              <input
                type="text"
                value={metadata.interviewName}
                onChange={(e) => setMetadata({ ...metadata, interviewName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="インタビュー名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">実施日（任意）</label>
              <input
                type="date"
                value={metadata.interviewDate}
                onChange={(e) => setMetadata({ ...metadata, interviewDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">対象セグメント（任意）</label>
              <input
                type="text"
                value={metadata.segment}
                onChange={(e) => setMetadata({ ...metadata, segment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="対象セグメント"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">担当者（任意）</label>
              <input
                type="text"
                value={metadata.owner}
                onChange={(e) => setMetadata({ ...metadata, owner: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="担当者"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">テキストエリア</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Q: なぜこのサービスを…&#10;A: 価格が安いから…"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddSource}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              追加
            </button>
            <button
              onClick={handleStartExtraction}
              disabled={
                inputSources.length === 0 || 
                !activeProduct || 
                (personaMode === 'update' && !selectedExistingPersonaId)
              }
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Extraction生成へ進む
            </button>
            {personaMode === 'update' && !selectedExistingPersonaId && (
              <p className="text-xs text-red-600 mt-1">
                既存を更新モードでは、更新するペルソナを選択してください
              </p>
            )}
            {!activeProduct && (
              <p className="text-xs text-red-600 mt-1">
                サービス・製品を選択してください
              </p>
            )}
          </div>
        </div>
      </div>

      {inputSources.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">入力済みソース一覧</h3>
          <ul className="space-y-2">
            {inputSources.map((source) => (
              <li key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm">
                  {source.type === 'interview' && 'インタビュー記録'}
                  {source.type === 'comment' && '定性コメント'}
                  {source.type === 'persona' && '既存ペルソナ'}
                  {source.metadata?.interviewName && ` - ${source.metadata.interviewName}`}
                </span>
                <button
                  onClick={() => removeInputSource(source.id)}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
