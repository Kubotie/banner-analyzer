'use client';

import { useState } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { KnowledgeBaseItem, SavedPersona } from '@/types';
import { Plus, Search, Folder, Edit2, Trash2, Copy, ExternalLink, FileDown } from 'lucide-react';

export default function KnowledgeBaseScreen() {
  const {
    knowledgeBaseItems,
    getKnowledgeBaseItems,
    getKnowledgeBaseItem,
    updateKnowledgeBaseItem,
    deleteKnowledgeBaseItem,
    searchKnowledgeBase,
    setActivePersona,
    copyPersonaToClipboard,
    setCurrentStep,
  } = usePersonaStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  // 検索結果を取得
  const filteredItems = searchQuery.trim()
    ? searchKnowledgeBase(searchQuery)
    : getKnowledgeBaseItems();

  // フォルダでグループ化
  const itemsByFolder = filteredItems.reduce((acc, item) => {
    const folder = item.folder || (item.type === 'comparison' ? 'My Files/比較' : 'My Files/ペルソナ');
    if (!acc[folder]) {
      acc[folder] = [];
    }
    acc[folder].push(item);
    return acc;
  }, {} as Record<string, KnowledgeBaseItem[]>);

  // タイトル編集開始
  const handleStartEdit = (item: KnowledgeBaseItem) => {
    setEditingTitle(item.id);
    setEditTitleValue(item.title);
  };

  // タイトル保存
  const handleSaveTitle = (id: string) => {
    if (editTitleValue.trim()) {
      updateKnowledgeBaseItem(id, { title: editTitleValue.trim() });
    }
    setEditingTitle(null);
    setEditTitleValue('');
  };

  // 削除
  const handleDelete = (id: string) => {
    if (confirm('このペルソナを削除しますか？')) {
      deleteKnowledgeBaseItem(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  // 「このペルソナで使う」ボタン（PDF出力）
  const handleUsePersona = async (persona: SavedPersona) => {
    try {
      // 動的インポートでPDF出力機能をロード（ビルド時のエラーを回避）
      const { exportPersonaToPDF: exportPDF } = await import('@/utils/pdfExport');
      await exportPDF(persona);
      // activePersonaとしてセット
      setActivePersona(persona);
      alert('ペルソナをPDFで出力しました。');
    } catch (error) {
      console.error('PDF出力エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      if (errorMessage.includes('jspdfパッケージがインストールされていません')) {
        alert('PDF出力機能を使用するには、jspdfパッケージが必要です。\nターミナルで「npm install jspdf」を実行してください。');
      } else {
        alert(`PDF出力に失敗しました: ${errorMessage}`);
      }
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ナレッジベース</h2>
          <button
            onClick={() => {
              // Persona画面に遷移して、保存できる状態にする
              setCurrentStep('summary');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            ナレッジ追加
          </button>
        </div>

        {/* 検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ナレッジベース名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左側: 一覧 */}
        <div className="col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">一覧</h3>
            <p className="text-xs text-gray-500 mt-1">{filteredItems.length}件</p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {Object.entries(itemsByFolder).map(([folder, items]) => (
              <div key={folder} className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-gray-600">
                  <Folder className="w-4 h-4" />
                  {folder}
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-2 rounded-md cursor-pointer hover:bg-gray-50 ${
                        selectedItem?.id === item.id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(item.updated_at)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {item.owner} {item.shared ? '・共有' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {searchQuery ? '検索結果がありません' : 'ナレッジベースが空です'}
              </div>
            )}
          </div>
        </div>

        {/* 右側: 詳細 */}
        <div className="col-span-2 bg-white rounded-lg shadow">
          {selectedItem ? (
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  {editingTitle === selectedItem.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={() => handleSaveTitle(selectedItem.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTitle(selectedItem.id);
                          } else if (e.key === 'Escape') {
                            setEditingTitle(null);
                            setEditTitleValue('');
                          }
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <h3 className="text-lg font-bold">{selectedItem.title}</h3>
                  )}
                  <div className="text-sm text-gray-500 mt-1 space-y-1">
                    <div>更新日時: {formatDate(selectedItem.updated_at)}</div>
                    <div>オーナー: {selectedItem.owner} {selectedItem.shared ? '・共有中' : '・非共有'}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartEdit(selectedItem)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title="タイトルを編集"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 仮説ラベル */}
              {selectedItem.type === 'persona' && selectedItem.persona && (
                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ※{selectedItem.persona.hypothesis_label}（一次情報に基づく現時点の判断）
                </div>
              )}
              {selectedItem.type === 'comparison' && selectedItem.comparison && (
                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ※{selectedItem.comparison.hypothesis_label}（一次情報に基づく現時点の判断）
                </div>
              )}

              {/* ペルソナ詳細 */}
              {selectedItem.type === 'persona' && selectedItem.persona && (
                <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1行要約</h4>
                  <p className="text-sm text-gray-700">{selectedItem.persona.summary}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">背景ストーリー</h4>
                  <p className="text-sm text-gray-700">{selectedItem.persona.story}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">購入の構造</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><strong>誰の課題:</strong> {selectedItem.persona.proxy_structure.whose_problem}</div>
                    <div><strong>誰が解決:</strong> {selectedItem.persona.proxy_structure.who_solves}</div>
                    <div><strong>どう解決:</strong> {selectedItem.persona.proxy_structure.how}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">JTBD</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><strong>機能:</strong> {selectedItem.persona.jtbd.functional.join(', ') || 'なし'}</div>
                    <div><strong>感情:</strong> {selectedItem.persona.jtbd.emotional.join(', ') || 'なし'}</div>
                    <div><strong>社会:</strong> {selectedItem.persona.jtbd.social.join(', ') || 'なし'}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">判断基準TOP5</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    {selectedItem.persona.decision_criteria_top5.map((c, idx) => (
                      <div key={idx}>
                        {idx + 1}. {c.criterion} (重み: {(c.weight * 100).toFixed(0)}%)
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">典型ジャーニー</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><strong>きっかけ:</strong> {selectedItem.persona.journey.trigger}</div>
                    <div><strong>検討:</strong> {selectedItem.persona.journey.consider}</div>
                    <div><strong>購入:</strong> {selectedItem.persona.journey.purchase}</div>
                    <div><strong>継続:</strong> {selectedItem.persona.journey.continue}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">誤解しやすいポイント</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    {selectedItem.persona.pitfalls.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">有効な施策</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    {selectedItem.persona.tactics.message && selectedItem.persona.tactics.message.length > 0 && (
                      <div>
                        <strong>メッセージ:</strong>
                        <ul className="list-disc list-inside ml-4">
                          {selectedItem.persona.tactics.message.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedItem.persona.tactics.route && selectedItem.persona.tactics.route.length > 0 && (
                      <div>
                        <strong>導線:</strong>
                        <ul className="list-disc list-inside ml-4">
                          {selectedItem.persona.tactics.route.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedItem.persona.tactics.offer && selectedItem.persona.tactics.offer.length > 0 && (
                      <div>
                        <strong>オファー:</strong>
                        <ul className="list-disc list-inside ml-4">
                          {selectedItem.persona.tactics.offer.map((o, idx) => (
                            <li key={idx}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Evidence</h4>
                  <div className="text-sm text-gray-700">
                    引用件数: {selectedItem.persona.evidence.count}件
                  </div>
                </div>
                </div>
              )}

              {/* 比較詳細 */}
              {selectedItem.type === 'comparison' && selectedItem.comparison && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">比較対象ペルソナ</h4>
                    <div className="text-sm text-gray-700">
                      {selectedItem.comparison.personas.length}件のペルソナを比較
                    </div>
                  </div>

                  {selectedItem.comparison.comparison_data.commonPoints && selectedItem.comparison.comparison_data.commonPoints.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">共通点</h4>
                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                        {selectedItem.comparison.comparison_data.commonPoints.map((point: string, idx: number) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedItem.comparison.comparison_data.differences && selectedItem.comparison.comparison_data.differences.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">相違点</h4>
                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                        {selectedItem.comparison.comparison_data.differences.map((diff: string, idx: number) => (
                          <li key={idx}>{diff}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedItem.comparison.comparison_data.detailedAnalysis && (
                    <div>
                      <h4 className="font-semibold mb-2">詳細分析（フィールド別）</h4>
                      <div className="text-sm text-gray-700 space-y-3">
                        {Object.entries(selectedItem.comparison.comparison_data.detailedAnalysis).map(([field, analysis]: [string, any]) => (
                          <div key={field} className="border-l-2 border-blue-200 pl-3">
                            <div className="font-medium mb-1">{field}</div>
                            {analysis.commonPoints && analysis.commonPoints.length > 0 && (
                              <div className="mb-2">
                                <div className="text-xs text-gray-500">共通点:</div>
                                <ul className="list-disc list-inside ml-2">
                                  {analysis.commonPoints.map((cp: string, idx: number) => (
                                    <li key={idx}>{cp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysis.differences && analysis.differences.length > 0 && (
                              <div>
                                <div className="text-xs text-gray-500">相違点:</div>
                                <ul className="list-disc list-inside ml-2">
                                  {analysis.differences.map((diff: string, idx: number) => (
                                    <li key={idx}>{diff}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

                {/* アクションボタン */}
                <div className="pt-4 border-t flex gap-2">
                  {selectedItem.type === 'persona' && selectedItem.persona && (
                    <>
                      <button
                        onClick={() => handleUsePersona(selectedItem.persona!)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                      >
                        <FileDown className="w-4 h-4" />
                        PDFで出力
                      </button>
                      <button
                        onClick={() => copyPersonaToClipboard(selectedItem.persona!)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        JSONをコピー
                      </button>
                    </>
                  )}
                  
                  {/* 他アプリ連携ボタン（UIのみ） */}
                  <div className="ml-auto flex gap-2">
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-sm"
                      title="競合バナー分析へ（実装予定）"
                    >
                      <ExternalLink className="w-4 h-4" />
                      競合バナー分析へ
                    </button>
                    <button
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 text-sm"
                      title="戦略オプションへ（実装予定）"
                    >
                      <ExternalLink className="w-4 h-4" />
                      戦略オプションへ
                    </button>
                    <button
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2 text-sm"
                      title="LP構成ラフへ（実装予定）"
                    >
                      <ExternalLink className="w-4 h-4" />
                      LP構成ラフへ
                    </button>
                  </div>
                </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              左側の一覧からペルソナまたは比較を選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
