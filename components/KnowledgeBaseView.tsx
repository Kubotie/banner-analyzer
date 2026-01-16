'use client';

import { useState, useMemo, useEffect } from 'react';
import { KnowledgeBase } from '@/types/schema';
import {
  getKnowledgeBaseList,
  searchKnowledgeBase,
  filterByFolder,
  filterByType,
  deleteKnowledgeBase,
} from '@/lib/knowledge-base';

interface KnowledgeBaseViewProps {
  onUseData?: (kb: KnowledgeBase) => void; // 「このデータで使う」コールバック
  onNavigateToBanner?: (bannerId: string) => void;
  onNavigateToInsight?: (insightIndex: number) => void;
  onViewDetail?: (kb: KnowledgeBase) => void; // 詳細表示コールバック
}

export default function KnowledgeBaseView({
  onUseData,
  onNavigateToBanner,
  onNavigateToInsight,
  onViewDetail,
}: KnowledgeBaseViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'banner' | 'insight' | 'report' | 'all'>('all');
  const [knowledgeBaseList, setKnowledgeBaseList] = useState<KnowledgeBase[]>(getKnowledgeBaseList());

  // ナレッジベース一覧を更新（保存時に反映されるように）
  useEffect(() => {
    setKnowledgeBaseList(getKnowledgeBaseList());
  }, []);

  // 削除後に一覧を更新
  const handleDeleteWithRefresh = (kbId: string) => {
    if (confirm('このナレッジを削除しますか？')) {
      deleteKnowledgeBase(kbId);
      setKnowledgeBaseList(getKnowledgeBaseList());
    }
  };

  // 検索とフィルタを適用
  const filteredList = useMemo(() => {
    let result = knowledgeBaseList;

    // 検索
    if (searchQuery.trim()) {
      result = searchKnowledgeBase(searchQuery);
    }

    // フォルダフィルタ
    if (selectedFolder) {
      result = result.filter((kb) => kb.folder_path === selectedFolder);
    }

    // 種別フィルタ
    if (selectedType !== 'all') {
      result = result.filter((kb) => kb.type === selectedType);
    }

    // 更新日時でソート（新しい順）
    return result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [knowledgeBaseList, searchQuery, selectedFolder, selectedType]);

  // フォルダ一覧を取得
  const folders = useMemo(() => {
    const folderSet = new Set<string>();
    knowledgeBaseList.forEach((kb) => {
      folderSet.add(kb.folder_path);
    });
    return Array.from(folderSet).sort();
  }, [knowledgeBaseList]);


  // 「このデータで使う」処理
  const handleUseData = (kb: KnowledgeBase) => {
    // JSONをクリップボードにコピー
    const jsonString = JSON.stringify(kb.data, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      // activeContextとして保持（localStorage）
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeContext', JSON.stringify(kb.data));
        localStorage.setItem('activeContextType', kb.type);
      }
      // コールバック実行
      onUseData?.(kb);
    }).catch((error) => {
      console.error('Failed to copy to clipboard:', error);
      alert('クリップボードへのコピーに失敗しました');
    });
  };

  // 種別の表示名
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'banner':
        return 'バナー';
      case 'insight':
        return 'インサイト';
      case 'report':
        return 'レポート';
      default:
        return type;
    }
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
            placeholder="ナレッジ名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* フィルタ */}
        <div className="flex items-center gap-4">
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
            onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべての種別</option>
            <option value="banner">バナー</option>
            <option value="insight">インサイト</option>
            <option value="report">レポート</option>
          </select>
        </div>
      </div>

      {/* 一覧テーブル */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredList.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery || selectedFolder || selectedType !== 'all'
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
                {filteredList.map((kb) => (
                  <tr key={kb.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{kb.name}</div>
                      <div className="text-xs text-gray-500">{kb.folder_path}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                        {getTypeLabel(kb.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{kb.owner}</td>
                    <td className="px-4 py-3">
                      {kb.shared ? (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">共有中</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">非共有</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(kb.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {onViewDetail && (
                          <button
                            onClick={() => onViewDetail(kb)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="詳細を表示"
                          >
                            詳細
                          </button>
                        )}
                        <button
                          onClick={() => handleUseData(kb)}
                          className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                          title="このデータで使う（JSONコピー + activeContext保持）"
                        >
                          使う
                        </button>
                        <button
                          onClick={() => handleDeleteWithRefresh(kb.id)}
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
