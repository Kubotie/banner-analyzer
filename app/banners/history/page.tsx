'use client';

import { useState, useEffect } from 'react';
import UnifiedLayout from '@/components/UnifiedLayout';
import { getTabName, getBannerHistories, deleteBannerHistory } from '@/lib/banner-history-db';
import { useRouter } from 'next/navigation';

/**
 * バナー分析履歴一覧ページ
 * /banners/history
 */
export default function BannerHistoryPage() {
  const router = useRouter();
  const [histories, setHistories] = useState<any[]>([]);

  // 履歴一覧を読み込む
  useEffect(() => {
    const loadedHistories = getBannerHistories();
    setHistories(loadedHistories);
  }, []);

  const handleRestoreHistory = (historyId: string) => {
    if (confirm('この履歴から再開しますか？現在の状態は失われます。')) {
      // 履歴IDをURLパラメータで渡す
      router.push(`/banner-analyzer?historyId=${historyId}&tab=${getBannerHistories().find(h => h.historyId === historyId)?.currentTab || 'analysis'}`);
    }
  };

  const handleDeleteHistory = (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('この履歴を削除しますか？')) {
      deleteBannerHistory(historyId);
      // 履歴一覧を更新
      const updatedHistories = getBannerHistories();
      setHistories(updatedHistories);
    }
  };

  return (
    <UnifiedLayout>
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">バナー分析履歴</h1>
          
          {histories.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">履歴がありません</p>
              <p className="text-sm text-gray-400 mt-2">
                画像を読み込んだ後、自動で履歴が保存されます
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        タイトル
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        バナー数
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        現在のタブ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        更新日時
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {histories.map((history) => (
                      <tr
                        key={history.historyId}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRestoreHistory(history.historyId)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-sm text-gray-900">
                            {history.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {history.bannerCount}件
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {getTabName(history.currentTab)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(history.updatedAt).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreHistory(history.historyId);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            >
                              再開
                            </button>
                            <button
                              onClick={(e) => handleDeleteHistory(history.historyId, e)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
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
            </div>
          )}
        </div>
      </div>
    </UnifiedLayout>
  );
}
