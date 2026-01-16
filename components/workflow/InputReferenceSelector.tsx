'use client';

import { useState, useEffect } from 'react';
import { useProductStore } from '@/store/useProductStore';
import { InputNodeData } from '@/types/workflow';
import { KBItem } from '@/kb/types';

interface InputReferenceSelectorProps {
  inputKind: 'product' | 'persona' | 'kb_item';
  currentData?: InputNodeData;
  onSelect: (data: InputNodeData) => void;
  onCancel: () => void;
}

/**
 * Input参照先選択モーダル
 */
export default function InputReferenceSelector({
  inputKind,
  currentData,
  onSelect,
  onCancel,
}: InputReferenceSelectorProps) {
  const { products } = useProductStore();
  const [selectedId, setSelectedId] = useState<string>(currentData?.refId || '');
  const [kbItems, setKbItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // KBアイテムを読み込む（persona/kb_itemの場合）
  useEffect(() => {
    if (inputKind === 'persona') {
      loadPersonas();
    } else if (inputKind === 'kb_item') {
      loadKnowledgeItems();
    }
  }, [inputKind]);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kb/items?type=persona');
      if (response.ok) {
        const data = await response.json();
        // agent_definitionタイプを除外
        const filtered = (data.items || []).filter((item: any) => item.type !== 'agent_definition');
        setKbItems(filtered);
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKnowledgeItems = async () => {
    setLoading(true);
    try {
      // ナレッジタイプを取得（market_insight, strategy_option, planning_hook, banner_insight, banner_auto_layout）
      // 注意: APIでは'insight', 'option', 'plan'として保存されている可能性がある
      const types = ['insight', 'option', 'plan'];
      const allItems: KBItem[] = [];
      
      for (const type of types) {
        const response = await fetch(`/api/kb/items?type=${type}`);
        if (response.ok) {
          const data = await response.json();
          // payloadを確認して、market_insight/strategy_option/planning_hook/banner_insight/banner_auto_layoutをフィルタ
          // agent_definitionタイプは除外
          const filtered = (data.items || [])
            .filter((item: KBItem) => item.type !== 'agent_definition') // agent_definitionを除外
            .filter((item: KBItem) => {
              if (type === 'insight') {
                // insightタイプは market_insight または banner_insight の可能性がある
                const payload = item.payload as any;
                return payload?.meta?.kb_type === 'market_insight' || 
                       payload?.meta?.kb_type === 'banner_insight' ||
                       payload?.meta?.kb_type === 'banner_auto_layout' ||
                       !payload?.meta; // 旧形式も含める
              } else if (type === 'option') {
                const payload = item.payload as any;
                return payload?.meta?.kb_type === 'strategy_option' || !payload?.meta;
              } else if (type === 'plan') {
                const payload = item.payload as any;
                return payload?.meta?.kb_type === 'planning_hook' || !payload?.meta;
              }
              return true;
            });
          allItems.push(...filtered);
        }
      }
      
      setKbItems(allItems);
    } catch (error) {
      console.error('Failed to load knowledge items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedId) {
      alert('参照先を選択してください');
      return;
    }

    let refKind: string | undefined;
    let title: string | undefined;

    if (inputKind === 'product') {
      const product = products.find((p) => p.productId === selectedId);
      title = product?.name;
    } else {
      const item = kbItems.find((item) => item.kb_id === selectedId);
      if (item) {
        title = item.title;
        if (inputKind === 'kb_item') {
          refKind = item.type;
        }
      }
    }

    onSelect({
      inputKind,
      refId: selectedId,
      refKind,
      title,
    });
  };

  const filteredItems = kbItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold">
            {inputKind === 'product' && '製品を選択'}
            {inputKind === 'persona' && 'ペルソナを選択'}
            {inputKind === 'kb_item' && 'ナレッジを選択'}
          </h3>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {inputKind === 'product' && (
            <div className="space-y-2">
              {products.length === 0 ? (
                <p className="text-gray-500 text-sm">製品が登録されていません</p>
              ) : (
                products.map((product) => (
                  <label
                    key={product.productId}
                    className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="product"
                      value={product.productId}
                      checked={selectedId === product.productId}
                      onChange={(e) => setSelectedId(e.target.value)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      {product.category && (
                        <div className="text-sm text-gray-500">{product.category}</div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          )}

          {(inputKind === 'persona' || inputKind === 'kb_item') && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              
              {loading ? (
                <div className="text-center text-gray-500 py-8">読み込み中...</div>
              ) : filteredItems.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {inputKind === 'persona' ? 'ペルソナが登録されていません' : 'ナレッジが登録されていません'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <label
                      key={item.kb_id}
                      className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="kbItem"
                        value={item.kb_id}
                        checked={selectedId === item.kb_id}
                        onChange={(e) => setSelectedId(e.target.value)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-gray-500">
                          種別: {item.type} | 更新: {new Date(item.updated_at).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            選択
          </button>
        </div>
      </div>
    </div>
  );
}
