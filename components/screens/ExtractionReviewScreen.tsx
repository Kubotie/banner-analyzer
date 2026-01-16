'use client';

import { useState, useEffect } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { ExtractionRecord, Quote } from '@/types';
import { downloadJson } from '@/utils/exportJson';
import { validateQuoteIntegrity, QuoteIntegrityIssue } from '@/utils/extractionSchema';

export default function ExtractionReviewScreen() {
  const { 
    extractionRecords, 
    selectedExtractionRecord,
    setSelectedExtractionRecord,
    updateExtractionRecord,
    statements,
    inputSources,
    setCurrentStep,
    finalizeExtractionRecords,
    isExtractionFinalized,
    quoteIntegrityIssues
  } = usePersonaStore();
  
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [highlightedStatement, setHighlightedStatement] = useState<string | null>(null);
  const [highlightedSourceText, setHighlightedSourceText] = useState<string | null>(null);

  const currentRecord = extractionRecords.find(
    (r) => r.respondent_id === (selectedExtractionRecord || extractionRecords[0]?.respondent_id)
  );
  
  // 現在のRecordの整合性問題を取得
  const currentRecordIssues = currentRecord 
    ? quoteIntegrityIssues.find(item => item.respondent_id === currentRecord.respondent_id)?.issues || []
    : [];

  useEffect(() => {
    if (extractionRecords.length > 0 && !selectedExtractionRecord) {
      setSelectedExtractionRecord(extractionRecords[0].respondent_id);
    }
  }, [extractionRecords, selectedExtractionRecord, setSelectedExtractionRecord]);

  const handleFieldChange = (field: keyof ExtractionRecord, value: any) => {
    if (!currentRecord) return;
    // 確定済みの場合は編集不可
    if (currentRecord.finalized) {
      alert('確定済みのExtraction Recordは編集できません。');
      return;
    }
    updateExtractionRecord(currentRecord.respondent_id, { [field]: value });
  };

  const handleQuoteClick = (quote: Quote) => {
    setSelectedQuote(quote.id);
    setHighlightedStatement(quote.statement_id);
    
    // 入力ソースから原文を取得
    const source = inputSources.find((s) => s.id === quote.source_file);
    if (source) {
      setHighlightedSourceText(source.text);
    } else {
      // Statementから取得を試みる
      const statement = statements.find((s) => s.id === quote.statement_id);
      if (statement) {
        setHighlightedSourceText(statement.text);
      }
    }
    
    // 元のStatementをスクロール
    const element = document.getElementById(`statement-${quote.statement_id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleConfidenceChange = (newConfidence: number) => {
    if (!currentRecord) return;
    // 確定済みの場合は編集不可
    if (currentRecord.finalized) {
      alert('確定済みのExtraction Recordは編集できません。');
      return;
    }
    const updatedBreakdown = { ...currentRecord.confidence_breakdown };
    updateExtractionRecord(currentRecord.respondent_id, {
      confidence: Math.max(0, Math.min(1, newConfidence)),
      confidence_breakdown: updatedBreakdown,
    });
  };
  
  const handleFinalize = () => {
    if (window.confirm('Extraction Recordを確定しますか？\n確定後は編集できず、Aggregation生成の入力として使用されます。')) {
      finalizeExtractionRecords();
      alert('Extraction Recordを確定しました。Aggregation生成へ進むことができます。');
    }
  };
  
  const handleGoToAggregation = () => {
    if (!isExtractionFinalized()) {
      alert('Extraction Recordを確定してからAggregation生成へ進んでください。');
      return;
    }
    setCurrentStep('aggregation');
  };

  if (!currentRecord) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Extraction Recordが見つかりません。</p>
        </div>
      </div>
    );
  }

  const currentIndex = extractionRecords.findIndex((r) => r.respondent_id === currentRecord.respondent_id);
  const hasNext = currentIndex < extractionRecords.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      setSelectedExtractionRecord(extractionRecords[currentIndex + 1].respondent_id);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setSelectedExtractionRecord(extractionRecords[currentIndex - 1].respondent_id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Extraction確認・修正</h2>
          <div className="flex gap-2">
            {currentRecordIssues.length > 0 && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded flex items-center gap-1" title={`${currentRecordIssues.length}件のquotes整合性問題があります。詳細はquotes一覧で確認できます。`}>
                <span>⚠️</span>
                <span>{currentRecordIssues.length}件の整合性問題</span>
              </div>
            )}
            <button
              onClick={() => downloadJson(extractionRecords, 'A.json')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              title="Extraction JSONをエクスポート"
            >
              A.json エクスポート
            </button>
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:bg-gray-100 disabled:text-gray-400"
            >
              前へ
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {currentIndex + 1} / {extractionRecords.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:bg-gray-100 disabled:text-gray-400"
            >
              次へ
            </button>
            {!isExtractionFinalized() ? (
              <button
                onClick={handleFinalize}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                確定（Finalize）
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">
                  ✓ 確定済み
                </span>
                <button
                  onClick={handleGoToAggregation}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Aggregation生成へ進む
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 左カラム: フィールド編集 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">フィールド編集</h3>
            
            {/* role */}
            <div>
              <label className="block text-sm font-medium mb-1">
                role
                {currentRecord.field_quotes.role && (
                  <span className="ml-2 text-xs text-blue-600">
                    [根拠: {currentRecord.field_quotes.role.length}件]
                  </span>
                )}
                {currentRecord.finalized && (
                  <span className="ml-2 text-xs text-red-600">(確定済み・編集不可)</span>
                )}
              </label>
              <input
                type="text"
                value={currentRecord.role || ''}
                onChange={(e) => handleFieldChange('role', e.target.value || null)}
                disabled={currentRecord.finalized}
                placeholder="例: 本人購入者、代理購入者、不明など"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  currentRecord.finalized ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
              {currentRecord.field_quotes.role && currentRecord.field_quotes.role.length > 0 && (
                <button
                  onClick={() => handleQuoteClick(currentRecord.field_quotes.role![0])}
                  className="mt-1 text-xs text-blue-600 hover:underline"
                >
                  quotesを確認
                </button>
              )}
            </div>

            {/* relationship */}
            <div>
              <label className="block text-sm font-medium mb-1">
                relationship
                {currentRecord.field_quotes.relationship && (
                  <span className="ml-2 text-xs text-blue-600">
                    [根拠: {currentRecord.field_quotes.relationship.length}件]
                  </span>
                )}
              </label>
              <input
                type="text"
                value={currentRecord.relationship || ''}
                onChange={(e) => handleFieldChange('relationship', e.target.value || null)}
                disabled={currentRecord.finalized}
                placeholder="例: 配偶者、親、子、恋人、同棲パートナーなど"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  currentRecord.finalized ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
              {currentRecord.field_quotes.relationship && currentRecord.field_quotes.relationship.length > 0 && (
                <button
                  onClick={() => handleQuoteClick(currentRecord.field_quotes.relationship![0])}
                  className="mt-1 text-xs text-blue-600 hover:underline"
                >
                  quotesを確認
                </button>
              )}
            </div>

            {/* trigger */}
            <div>
              <label className="block text-sm font-medium mb-1">
                trigger
                {currentRecord.field_quotes.trigger && (
                  <span className="ml-2 text-xs text-blue-600">
                    [根拠: {currentRecord.field_quotes.trigger.length}件]
                  </span>
                )}
              </label>
              <div className="space-y-2">
                {currentRecord.trigger.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => {
                        const newTriggers = [...currentRecord.trigger];
                        newTriggers[idx] = e.target.value;
                        handleFieldChange('trigger', newTriggers);
                      }}
                      disabled={currentRecord.finalized}
                      className={`flex-1 px-3 py-2 border border-gray-300 rounded-md ${
                        currentRecord.finalized ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    <button
                      onClick={() => {
                        const newTriggers = currentRecord.trigger.filter((_, i) => i !== idx);
                        handleFieldChange('trigger', newTriggers);
                      }}
                      disabled={currentRecord.finalized}
                      className={`px-2 py-1 text-white text-sm rounded ${
                        currentRecord.finalized 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      削除
                    </button>
                    {currentRecord.field_quotes.trigger && currentRecord.field_quotes.trigger[idx] && (
                      <button
                        onClick={() => handleQuoteClick(currentRecord.field_quotes.trigger![idx])}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        quotes
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    handleFieldChange('trigger', [...currentRecord.trigger, '']);
                  }}
                  disabled={currentRecord.finalized}
                  className={`px-3 py-1 text-gray-700 text-sm rounded ${
                    currentRecord.finalized 
                      ? 'bg-gray-100 cursor-not-allowed' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  + 追加
                </button>
              </div>
            </div>

            {/* barriers */}
            <div>
              <label className="block text-sm font-medium mb-1">
                barriers
                {currentRecord.field_quotes.barriers && (
                  <span className="ml-2 text-xs text-blue-600">
                    [根拠: {currentRecord.field_quotes.barriers.length}件]
                  </span>
                )}
              </label>
              <div className="space-y-2">
                {currentRecord.barriers.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => {
                        const newBarriers = [...currentRecord.barriers];
                        newBarriers[idx] = e.target.value;
                        handleFieldChange('barriers', newBarriers);
                      }}
                      disabled={currentRecord.finalized}
                      className={`flex-1 px-3 py-2 border border-gray-300 rounded-md ${
                        currentRecord.finalized ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    <button
                      onClick={() => {
                        const newBarriers = currentRecord.barriers.filter((_, i) => i !== idx);
                        handleFieldChange('barriers', newBarriers);
                      }}
                      disabled={currentRecord.finalized}
                      className={`px-2 py-1 text-white text-sm rounded ${
                        currentRecord.finalized 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      削除
                    </button>
                    {currentRecord.field_quotes.barriers && currentRecord.field_quotes.barriers[idx] && (
                      <button
                        onClick={() => handleQuoteClick(currentRecord.field_quotes.barriers![idx])}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        quotes
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    handleFieldChange('barriers', [...currentRecord.barriers, '']);
                  }}
                  disabled={currentRecord.finalized}
                  className={`px-3 py-1 text-gray-700 text-sm rounded ${
                    currentRecord.finalized 
                      ? 'bg-gray-100 cursor-not-allowed' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  + 追加
                </button>
              </div>
            </div>

            {/* confidence */}
            <div>
              <label className="block text-sm font-medium mb-1">
                confidence
                {currentRecord.finalized && (
                  <span className="ml-2 text-xs text-red-600">(確定済み・編集不可)</span>
                )}
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={currentRecord.confidence}
                  onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
                  disabled={currentRecord.finalized}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                    currentRecord.finalized ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
                <div className="text-xs text-gray-600 space-y-1">
                  <div>根拠件数: {currentRecord.quotes.length}件 → {currentRecord.confidence_breakdown.quote_count_score.toFixed(2)}</div>
                  <div>フィールド充足率: {(currentRecord.confidence_breakdown.field_completeness_score / 0.3 * 100).toFixed(0)}% → {currentRecord.confidence_breakdown.field_completeness_score.toFixed(2)}</div>
                  <div>引用の明確性: {currentRecord.confidence_breakdown.quote_clarity_score.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 右カラム: quotes/原文ハイライト */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">quotes / 原文ハイライト</h3>
            
            {/* quotes一覧 */}
            <div>
              <h4 className="text-sm font-medium mb-2">quotes一覧</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentRecord.quotes.map((quote) => {
                  // このquoteの整合性問題を取得
                  const quoteIssues = currentRecordIssues.filter(issue => issue.quoteId === quote.id);
                  const hasIssues = quoteIssues.length > 0;
                  
                  return (
                    <div
                      key={quote.id}
                      className={`p-3 border rounded ${
                        selectedQuote === quote.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : hasIssues
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-sm font-medium flex-1">{quote.text}</div>
                        {hasIssues && (
                          <span className="ml-2 text-xs text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded">
                            ⚠️
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        source: {quote.source_file}
                        {quote.line_number && `, line: ${quote.line_number}`}
                        {quote.line_range && `, range: ${quote.line_range.start}-${quote.line_range.end}`}
                      </div>
                      {hasIssues && (
                        <div className="mb-1 text-xs text-yellow-700">
                          {quoteIssues.map((issue, idx) => (
                            <div key={idx} className="mb-0.5">
                              • {issue.message}
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => handleQuoteClick(quote)}
                        className="mt-1 text-xs text-blue-600 hover:underline"
                      >
                        原文を表示
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 原文ハイライト */}
            {(highlightedStatement || highlightedSourceText) && (
              <div>
                <h4 className="text-sm font-medium mb-2">原文ハイライト</h4>
                <div className="p-4 bg-gray-50 rounded border max-h-64 overflow-y-auto">
                  {highlightedSourceText ? (
                    <div className="text-sm whitespace-pre-wrap">
                      {highlightedSourceText}
                    </div>
                  ) : highlightedStatement ? (
                    statements
                      .filter((s) => s.id === highlightedStatement)
                      .map((stmt) => (
                        <div
                          key={stmt.id}
                          id={`statement-${stmt.id}`}
                          className={`p-2 ${
                            highlightedStatement === stmt.id ? 'bg-yellow-200' : ''
                          }`}
                        >
                          <div className="text-xs text-gray-500 mb-1">
                            {stmt.source} {stmt.metadata?.lineNumber && `(line ${stmt.metadata.lineNumber})`}
                          </div>
                          <div className="text-sm">{stmt.text}</div>
                        </div>
                      ))
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
