'use client';

import { useState, useEffect } from 'react';
import UnifiedLayout from '@/components/UnifiedLayout';
import { useProductStore } from '@/store/useProductStore';
import { Product, Competitor } from '@/types/product';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function ProductsPage() {
  const { products, activeProduct, loadProducts, addProduct, updateProduct, removeProduct, setActiveProduct } = useProductStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    description: string;
    competitors: Competitor[];
  }>({
    name: '',
    category: '',
    description: '',
    competitors: [],
  });

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({ name: '', category: '', description: '', competitors: [] });
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.productId);
    setFormData({
      name: product.name,
      category: product.category || '',
      description: product.description || '',
      competitors: product.competitors || [],
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('商品名は必須です');
      return;
    }

    if (editingId) {
      updateProduct(editingId, formData);
      setEditingId(null);
    } else {
      addProduct(formData);
      setIsCreating(false);
    }
    setFormData({ name: '', category: '', description: '', competitors: [] });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', category: '', description: '', competitors: [] });
  };

  const handleAddCompetitor = () => {
    setFormData({
      ...formData,
      competitors: [...formData.competitors, { name: '' }],
    });
  };

  const handleUpdateCompetitor = (index: number, updates: Partial<Competitor>) => {
    const newCompetitors = [...formData.competitors];
    newCompetitors[index] = { ...newCompetitors[index], ...updates };
    setFormData({ ...formData, competitors: newCompetitors });
  };

  const handleRemoveCompetitor = (index: number) => {
    setFormData({
      ...formData,
      competitors: formData.competitors.filter((_, i) => i !== index),
    });
  };

  const handleDelete = (productId: string) => {
    if (window.confirm('このサービス・製品を削除しますか？')) {
      removeProduct(productId);
    }
  };

  return (
    <UnifiedLayout>
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">サービス・製品登録</h2>
            {!isCreating && !editingId && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                サービス・製品登録
              </button>
            )}
          </div>

          {/* 作成/編集フォーム */}
          {(isCreating || editingId) && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? '編集' : '新規作成'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    商品名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="商品名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">カテゴリ</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="カテゴリ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">説明</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={`以下のような情報を入力してください：

想定ターゲット: 〜
解決すること: 〜
成分・効果効能: 〜
料金: 〜
提供タイプ: 〜`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    商品名以外の詳細情報（想定ターゲット、解決すること、成分・効果効能、料金、提供タイプなど）を入力してください
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">競合</label>
                  <div className="space-y-2">
                    {formData.competitors.map((competitor, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={competitor.name}
                          onChange={(e) => handleUpdateCompetitor(index, { name: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="競合名"
                        />
                        <input
                          type="url"
                          value={competitor.url || ''}
                          onChange={(e) => handleUpdateCompetitor(index, { url: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="URL"
                        />
                        <input
                          type="text"
                          value={competitor.notes || ''}
                          onChange={(e) => handleUpdateCompetitor(index, { notes: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="メモ"
                        />
                        <button
                          onClick={() => handleRemoveCompetitor(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddCompetitor}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      + 競合を追加
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 一覧 */}
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.productId}
                className={`bg-white rounded-lg shadow p-6 ${
                  activeProduct?.productId === product.productId ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{product.name}</h3>
                      {activeProduct?.productId === product.productId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          選択中
                        </span>
                      )}
                    </div>
                    {product.category && (
                      <p className="text-sm text-gray-600 mb-1">カテゴリ: {product.category}</p>
                    )}
                    {product.description && (
                      <p className="text-sm text-gray-700 mb-2">{product.description}</p>
                    )}
                    {product.competitors && product.competitors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">競合:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {product.competitors.map((comp, idx) => (
                            <li key={idx}>
                              {comp.name}
                              {comp.url && (
                                <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">
                                  {comp.url}
                                </a>
                              )}
                              {comp.notes && <span className="text-gray-500 ml-2">({comp.notes})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      作成: {new Date(product.createdAt).toLocaleString('ja-JP')} / 
                      更新: {new Date(product.updatedAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveProduct(product.productId)}
                      className={`px-3 py-1 text-sm rounded ${
                        activeProduct?.productId === product.productId
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {activeProduct?.productId === product.productId ? '選択中' : '選択'}
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.productId)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                サービス・製品が登録されていません。右上のボタンから新規作成してください。
              </div>
            )}
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}
