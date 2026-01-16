'use client';

import { useState } from 'react';
import UnifiedLayout from '@/components/UnifiedLayout';
import KBView from '@/components/KBView';
import KBDetailView from '@/components/KBDetailView';

export default function KBPage() {
  const [selectedKBItem, setSelectedKBItem] = useState<any>(null);

  return (
    <UnifiedLayout>
      <div className="h-full overflow-y-auto p-6">
        {selectedKBItem ? (
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedKBItem(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  ← 一覧に戻る
                </button>
                <h2 className="text-xl font-semibold text-gray-900">{selectedKBItem.title}</h2>
                <div></div>
              </div>
            </div>
            <KBDetailView
              item={selectedKBItem}
              onNavigateToPersona={(personaId) => {
                setSelectedKBItem(null);
              }}
            />
          </div>
        ) : (
          <KBView
            onUseData={(item) => {
              alert('データをactiveContextに設定しました。他のタブで使用できます。');
            }}
            onViewDetail={(item) => {
              setSelectedKBItem(item);
            }}
          />
        )}
      </div>
    </UnifiedLayout>
  );
}
