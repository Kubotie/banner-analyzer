'use client';

import { useState, useEffect } from 'react';
import UnifiedLayout from '@/components/UnifiedLayout';
import { useProductStore } from '@/store/useProductStore';
import { getSavedExtractions, deleteSavedExtraction } from '@/lib/extraction-db';
import { SavedExtraction } from '@/types/extraction-saved';
import { Download, Copy, Trash2, Eye, X } from 'lucide-react';

export default function ExtractionsPage() {
  const { activeProduct, products } = useProductStore();
  const [extractions, setExtractions] = useState<SavedExtraction[]>([]);
  const [filteredExtractions, setFilteredExtractions] = useState<SavedExtraction[]>([]);
  const [selectedExtraction, setSelectedExtraction] = useState<SavedExtraction | null>(null);
  const [filters, setFilters] = useState<{
    productId?: string;
    q?: string;
  }>({
    productId: activeProduct?.productId,
    q: '',
  });

  useEffect(() => {
    loadExtractions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [extractions, filters]);

  useEffect(() => {
    if (activeProduct) {
      setFilters((prev) => ({ ...prev, productId: activeProduct.productId }));
    }
  }, [activeProduct]);

  const loadExtractions = () => {
    const loaded = getSavedExtractions();
    setExtractions(loaded);
  };

  const applyFilters = () => {
    let filtered = [...extractions];

    if (filters.productId) {
      filtered = filtered.filter((e) => e.productId === filters.productId);
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.tags && e.tags.some((tag) => tag.toLowerCase().includes(q))) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    setFilteredExtractions(filtered);
  };

  const handleDownloadJSON = (extraction: SavedExtraction) => {
    const dataStr = JSON.stringify(extraction.extractionRecords, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${extraction.title}_${extraction.extractionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = (extraction: SavedExtraction) => {
    // 構造化データごとにデータ名・値を含む形式でCSVを生成
    const rows: string[][] = [];
    
    // ヘッダー行
    rows.push([
      'データ名',
      '値',
      'respondent_id',
      'フィールド種別',
    ]);
    
    // 各ExtractionRecordを展開
    extraction.extractionRecords.forEach((record) => {
      const respondentId = record.respondent_id;
      
      // 基本フィールド
      if (record.role) {
        rows.push(['role', record.role, respondentId, 'string']);
      }
      if (record.relationship) {
        rows.push(['relationship', record.relationship, respondentId, 'string']);
      }
      
      // trigger（配列）
      record.trigger.forEach((t, idx) => {
        rows.push([`trigger[${idx}]`, t, respondentId, 'array_item']);
      });
      
      // barriers（配列）
      record.barriers.forEach((b, idx) => {
        rows.push([`barriers[${idx}]`, b, respondentId, 'array_item']);
      });
      
      // household（オブジェクト）
      if (record.household) {
        if (record.household.composition) {
          rows.push(['household.composition', record.household.composition, respondentId, 'object_property']);
        }
        if (record.household.age_range) {
          rows.push(['household.age_range', record.household.age_range, respondentId, 'object_property']);
        }
        if (record.household.occupation) {
          rows.push(['household.occupation', record.household.occupation, respondentId, 'object_property']);
        }
      }
      
      // purchase_context（オブジェクト）
      if (record.purchase_context) {
        if (record.purchase_context.timing) {
          rows.push(['purchase_context.timing', record.purchase_context.timing, respondentId, 'object_property']);
        }
        if (record.purchase_context.channel) {
          rows.push(['purchase_context.channel', record.purchase_context.channel, respondentId, 'object_property']);
        }
        if (record.purchase_context.type) {
          rows.push(['purchase_context.type', record.purchase_context.type, respondentId, 'object_property']);
        }
      }
      
      // job_to_be_done（オブジェクト）
      if (record.job_to_be_done) {
        if (record.job_to_be_done.functional) {
          record.job_to_be_done.functional.forEach((j, idx) => {
            rows.push([`job_to_be_done.functional[${idx}]`, j, respondentId, 'array_item']);
          });
        }
        if (record.job_to_be_done.emotional) {
          record.job_to_be_done.emotional.forEach((j, idx) => {
            rows.push([`job_to_be_done.emotional[${idx}]`, j, respondentId, 'array_item']);
          });
        }
        if (record.job_to_be_done.social) {
          record.job_to_be_done.social.forEach((j, idx) => {
            rows.push([`job_to_be_done.social[${idx}]`, j, respondentId, 'array_item']);
          });
        }
      }
      
      // decision_criteria（オブジェクト）
      if (record.decision_criteria) {
        if (record.decision_criteria.price !== undefined) {
          rows.push(['decision_criteria.price', record.decision_criteria.price.toString(), respondentId, 'number']);
        }
        if (record.decision_criteria.trust !== undefined) {
          rows.push(['decision_criteria.trust', record.decision_criteria.trust.toString(), respondentId, 'number']);
        }
        if (record.decision_criteria.effort !== undefined) {
          rows.push(['decision_criteria.effort', record.decision_criteria.effort.toString(), respondentId, 'number']);
        }
        if (record.decision_criteria.effectiveness !== undefined) {
          rows.push(['decision_criteria.effectiveness', record.decision_criteria.effectiveness.toString(), respondentId, 'number']);
        }
      }
      
      // information_sources（配列）
      record.information_sources.forEach((s, idx) => {
        rows.push([`information_sources[${idx}]`, s, respondentId, 'array_item']);
      });
      
      // behavior_patterns（オブジェクト）
      if (record.behavior_patterns) {
        if (record.behavior_patterns.who) {
          rows.push(['behavior_patterns.who', record.behavior_patterns.who, respondentId, 'object_property']);
        }
        if (record.behavior_patterns.when) {
          rows.push(['behavior_patterns.when', record.behavior_patterns.when, respondentId, 'object_property']);
        }
        if (record.behavior_patterns.what) {
          rows.push(['behavior_patterns.what', record.behavior_patterns.what, respondentId, 'object_property']);
        }
      }
      
      // confidence
      rows.push(['confidence', record.confidence.toString(), respondentId, 'number']);
      
      // quotes（配列）
      record.quotes.forEach((q, idx) => {
        rows.push([`quotes[${idx}].id`, q.id, respondentId, 'quote']);
        rows.push([`quotes[${idx}].text`, q.text, respondentId, 'quote']);
        rows.push([`quotes[${idx}].category`, q.category, respondentId, 'quote']);
        rows.push([`quotes[${idx}].source_file`, q.source_file, respondentId, 'quote']);
        if (q.line_number) {
          rows.push([`quotes[${idx}].line_number`, q.line_number.toString(), respondentId, 'quote']);
        }
      });
    });
    
    const csvContent = rows.map((row) => 
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const dataBlob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${extraction.title}_${extraction.extractionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = async (extraction: SavedExtraction) => {
    const dataStr = JSON.stringify(extraction.extractionRecords, null, 2);
    try {
      await navigator.clipboard.writeText(dataStr);
      alert('JSONをクリップボードにコピーしました');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('コピーに失敗しました');
    }
  };

  const handleDelete = (extractionId: string) => {
    if (window.confirm('このExtractionを削除しますか？')) {
      deleteSavedExtraction(extractionId);
      loadExtractions();
      if (selectedExtraction?.extractionId === extractionId) {
        setSelectedExtraction(null);
      }
    }
  };

  return (
    <UnifiedLayout>
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">確定Extraction一覧</h2>
          </div>

          {/* フィルタ */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">サービス・製品</label>
                <select
                  value={filters.productId || ''}
                  onChange={(e) => setFilters({ ...filters, productId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">すべて</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">検索</label>
                <input
                  type="text"
                  value={filters.q || ''}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  placeholder="タイトル、タグ、メモで検索"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* 一覧 */}
          <div className="space-y-2 mb-6">
            {filteredExtractions.map((extraction) => (
              <div
                key={extraction.extractionId}
                className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedExtraction(extraction)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{extraction.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        サービス・製品: {extraction.productId
                          ? products.find((p) => p.productId === extraction.productId)?.name || '不明'
                          : '未設定'}
                      </span>
                      <span>件数: {extraction.extractionRecords.length}件</span>
                      <span>種別: {extraction.source === 'interview' ? 'インタビュー' : extraction.source === 'banner' ? 'バナー' : 'その他'}</span>
                      <span>更新: {new Date(extraction.updatedAt).toLocaleString('ja-JP')}</span>
                    </div>
                    {extraction.tags && extraction.tags.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {extraction.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExtraction(extraction);
                      }}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      詳細
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(extraction.extractionId);
                      }}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredExtractions.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                保存されたExtractionがありません
              </div>
            )}
          </div>

          {/* 詳細モーダル */}
          {selectedExtraction && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                  <h3 className="text-xl font-semibold">{selectedExtraction.title}</h3>
                  <button
                    onClick={() => setSelectedExtraction(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">サービス・製品:</span>{' '}
                        {selectedExtraction.productId
                          ? products.find((p) => p.productId === selectedExtraction.productId)?.name || '不明'
                          : '未設定'}
                      </div>
                      <div>
                        <span className="font-medium">件数:</span> {selectedExtraction.extractionRecords.length}件
                      </div>
                      <div>
                        <span className="font-medium">種別:</span>{' '}
                        {selectedExtraction.source === 'interview' ? 'インタビュー' : selectedExtraction.source === 'banner' ? 'バナー' : 'その他'}
                      </div>
                      <div>
                        <span className="font-medium">更新日時:</span>{' '}
                        {new Date(selectedExtraction.updatedAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    {selectedExtraction.notes && (
                      <div>
                        <span className="font-medium">メモ:</span>
                        <p className="text-gray-700">{selectedExtraction.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* JSONプレビュー */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">JSONプレビュー</h4>
                    <div className="bg-gray-50 rounded border p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs">
                        {JSON.stringify(selectedExtraction.extractionRecords, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* 構造化ビュー */}
                  <div>
                    <h4 className="font-semibold mb-2">構造化ビュー</h4>
                    <div className="space-y-4">
                      {selectedExtraction.extractionRecords.map((record) => (
                        <div key={record.respondent_id} className="bg-gray-50 rounded p-4">
                          <h5 className="font-medium mb-2">Respondent: {record.respondent_id}</h5>
                          <div className="text-sm space-y-1">
                            <div>role: {record.role || '未設定'}</div>
                            <div>relationship: {record.relationship || '未設定'}</div>
                            <div>trigger: {record.trigger.join(', ') || 'なし'}</div>
                            <div>barriers: {record.barriers.join(', ') || 'なし'}</div>
                            <div>confidence: {record.confidence.toFixed(2)}</div>
                            <div>quotes: {record.quotes.length}件</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="border-t p-6 flex gap-2">
                  <button
                    onClick={() => handleDownloadJSON(selectedExtraction)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON
                  </button>
                  <button
                    onClick={() => handleDownloadCSV(selectedExtraction)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                  <button
                    onClick={() => handleCopyJSON(selectedExtraction)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy JSON
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </UnifiedLayout>
  );
}
