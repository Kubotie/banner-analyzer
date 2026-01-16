'use client';

import { useState, useMemo, useEffect } from 'react';
import { KBBaseMeta, KBItem, PersonaPayload } from '@/kb/types';
import { useProductStore } from '@/store/useProductStore';

interface KBViewProps {
  onUseData?: (item: KBItem) => void; // 「このデータで使う」コールバック
  onViewDetail?: (item: KBItem) => void; // 詳細表示コールバック
  initialType?: string; // 初期表示タイプ（デフォルト: 'all'）
}

export default function KBView({ onUseData, onViewDetail, initialType = 'all' }: KBViewProps) {
  const { products } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [items, setItems] = useState<KBBaseMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // 一覧を取得
  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedFolder) params.set('folder_path', selectedFolder);
      if (selectedProductId) params.set('source_project_id', selectedProductId);

      const response = await fetch(`/api/kb/items?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch items');

      const data = await response.json();
      const allItems = data.items || [];
      
      // デバッグログ（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        const typeCounts = allItems.reduce((acc: Record<string, number>, item: KBBaseMeta) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {});
        console.log('[KBView] Raw API response:', {
          total: allItems.length,
          types: [...new Set(allItems.map((i: KBBaseMeta) => i.type))],
          typeCounts,
          sampleItems: allItems.slice(0, 3).map((i: KBBaseMeta) => ({
            kb_id: i.kb_id,
            type: i.type,
            title: i.title,
          })),
        });
      }
      
      // agent_definitionとworkflow_runタイプを除外
      // エージェント定義とワークフロー実行結果はナレッジベースに表示しない
      const filteredItems = allItems.filter((item: KBBaseMeta) => {
        const shouldExclude = item.type === 'agent_definition' || item.type === 'workflow_run';
        if (process.env.NODE_ENV === 'development' && shouldExclude) {
          console.log('[KBView] Excluding item:', {
            kb_id: item.kb_id,
            type: item.type,
            title: item.title,
          });
        }
        return !shouldExclude;
      });
      
      // デバッグログ（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        const excludedTypeCounts = allItems
          .filter((item: KBBaseMeta) => item.type === 'agent_definition' || item.type === 'workflow_run')
          .reduce((acc: Record<string, number>, item: KBBaseMeta) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
          }, {});
        console.log('[KBView] Filtered items:', {
          total: allItems.length,
          filtered: filteredItems.length,
          excluded: allItems.length - filteredItems.length,
          excludedTypeCounts,
        });
      }
      
      setItems(filteredItems);
    } catch (error) {
      console.error('[KBView] Failed to fetch KB items:', error);
      setItems([]); // エラー時は空配列を設定
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [searchQuery, selectedType, selectedFolder, selectedProductId]);

  // フォルダ一覧を取得
  const folders = useMemo(() => {
    const folderSet = new Set<string>();
    items.forEach((item) => {
      folderSet.add(item.folder_path);
    });
    return Array.from(folderSet).sort();
  }, [items]);

  // 削除処理
  const handleDelete = async (kbId: string) => {
    if (!confirm('このナレッジを削除しますか？')) return;

    try {
      const response = await fetch(`/api/kb/items/${kbId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete item');

      // 一覧を更新
      fetchItems();
    } catch (error) {
      console.error('Failed to delete KB item:', error);
      alert('削除に失敗しました');
    }
  };

  // 「このデータで使う」処理
  const handleUseData = async (kbId: string) => {
    try {
      // 詳細を取得
      const response = await fetch(`/api/kb/items/${kbId}`);
      if (!response.ok) throw new Error('Failed to fetch item');

      const data = await response.json();
      const item: KBItem = data.item;

      // JSONをクリップボードにコピー
      const jsonString = JSON.stringify(item.payload, null, 2);
      await navigator.clipboard.writeText(jsonString);

      // activeContextにセット
      const contextData: any = {};
      if (item.payload.type === 'persona') {
        contextData.persona_ids = [(item.payload as PersonaPayload).persona_id];
      } else if (item.payload.type === 'insight') {
        contextData.insight_ids = [(item.payload as any).insight_id];
      } else if (item.payload.type === 'banner') {
        contextData.banner_ids = [(item.payload as any).banner_id];
      } else if (item.payload.type === 'report') {
        contextData.report_id = (item.payload as any).report_id;
      } else if (item.payload.type === 'option') {
        contextData.option_id = (item.payload as any).option_id;
      } else if (item.payload.type === 'plan') {
        contextData.plan_id = (item.payload as any).plan_id;
      }

      const contextResponse = await fetch('/api/context/active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextData),
      });

      if (!contextResponse.ok) throw new Error('Failed to set active context');

      alert('JSONデータをクリップボードにコピーし、activeContextに設定しました');
      onUseData?.(item);
    } catch (error) {
      console.error('Failed to use data:', error);
      alert('データの使用に失敗しました');
    }
  };

  // 種別の表示名
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      persona: 'ペルソナ',
      banner: 'バナー',
      insight: 'インサイト',
      report: 'レポート',
      option: 'オプション',
      plan: 'プラン',
    };
    return labels[type] || type;
  };

  // 更新日時の表示
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">ナレッジベース</h2>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          disabled
          title="MVPでは非活性"
        >
          ＋ナレッジ追加
        </button>
      </div>

      {/* 検索とフィルタ */}
      <div className="bg-white border-b px-6 py-4 space-y-3">
        {/* 検索 */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="ナレッジ名またはタグで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* フィルタ */}
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべてのフォルダ</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべての種別</option>
            <option value="persona">ペルソナ</option>
            <option value="banner">バナー</option>
            <option value="insight">インサイト</option>
            <option value="report">レポート</option>
            <option value="option">オプション</option>
            <option value="plan">プラン</option>
          </select>

          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての製品・サービス</option>
            {products.map((product) => (
              <option key={product.productId} value={product.productId}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 一覧テーブル */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-gray-500 py-8">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery || selectedFolder || selectedType !== 'all' || selectedProductId
              ? '検索条件に一致するナレッジがありません'
              : 'ナレッジがまだ保存されていません'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名前</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">種別</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">オーナー</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">共有状態</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">更新日時</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr
                    key={item.kb_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      // 詳細を取得して表示
                      fetch(`/api/kb/items/${item.kb_id}`)
                        .then((res) => res.json())
                        .then((data) => {
                          onViewDetail?.(data.item);
                        })
                        .catch((error) => {
                          console.error('Failed to fetch detail:', error);
                        });
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500">{item.folder_path}</div>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                        {getTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.owner_id}</td>
                    <td className="px-4 py-3">
                      {item.visibility === 'shared' ? (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                          共有中
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                          非共有
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.updated_at)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {onViewDetail && (
                          <button
                            onClick={() => {
                              fetch(`/api/kb/items/${item.kb_id}`)
                                .then((res) => res.json())
                                .then((data) => {
                                  onViewDetail?.(data.item);
                                });
                            }}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="詳細を表示"
                          >
                            詳細
                          </button>
                        )}
                        <button
                          onClick={() => handleUseData(item.kb_id)}
                          className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                          title="このデータで使う（JSONコピー + activeContext保持）"
                        >
                          使う
                        </button>
                        <button
                          onClick={() => handleDelete(item.kb_id)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
