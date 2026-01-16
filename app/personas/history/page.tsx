'use client';

import { useState, useEffect } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import UnifiedLayout from '@/components/UnifiedLayout';
import { getStepName } from '@/lib/persona-history-db';
import { useRouter } from 'next/navigation';

/**
 * ペルソナ分析履歴一覧ページ
 * /personas/history
 */
export default function PersonaHistoryPage() {
  const router = useRouter();
  const { getHistories, restoreFromHistory } = usePersonaStore();
  const [histories, setHistories] = useState<any[]>([]);

  // 履歴一覧を読み込む
  useEffect(() => {
    const loadedHistories = getHistories();
    setHistories(loadedHistories);
  }, [getHistories]);

  const handleRestoreHistory = (historyId: string) => {
    if (confirm('この履歴から再開しますか？現在の状態は失われます。')) {
      restoreFromHistory(historyId);
      // ペルソナページに遷移
      router.push('/personas');
    }
  };

  const handleDeleteHistory = (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('この履歴を削除しますか？')) {
      const { deleteHistory } = usePersonaStore.getState();
      deleteHistory(historyId);
      // 履歴一覧を更新
      const updatedHistories = getHistories();
      setHistories(updatedHistories);
    }
  };

  return (
    <UnifiedLayout>
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">ペルソナ分析履歴</h1>
          
          {histories.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">履歴がありません</p>
              <p className="text-sm text-gray-400 mt-2">
                Extraction以降に進んだ場合、自動で履歴が保存されます
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
                        Extraction数
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        現在のステップ
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
                          {history.extractionCount}件
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {getStepName(history.currentStep)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(history.updatedAt).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleRestoreHistory(history.historyId)}
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
