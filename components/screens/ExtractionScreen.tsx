'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { useProductStore } from '@/store/useProductStore';
import { ExtractionRecord, Quote } from '@/types';
import { downloadJson } from '@/utils/exportJson';
import { validateQuoteIntegrity, QuoteIntegrityIssue } from '@/utils/extractionSchema';
import { X, Save } from 'lucide-react';
import { createSavedExtraction } from '@/lib/extraction-db';
import { useRouter } from 'next/navigation';

export default function ExtractionScreen() {
  const router = useRouter();
  const { activeProduct } = useProductStore();
  const { 
    inputSources,
    extractionRecords, 
    selectedExtractionRecord,
    setSelectedExtractionRecord,
    updateExtractionRecord,
    statements,
    inputSources: storeInputSources,
    setCurrentStep,
    finalizeExtractionRecords,
    isExtractionFinalized,
    quoteIntegrityIssues,
    generateExtractions
  } = usePersonaStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [highlightedStatement, setHighlightedStatement] = useState<string | null>(null);
  const [highlightedSourceText, setHighlightedSourceText] = useState<string | null>(null);
  const [highlightedQuoteText, setHighlightedQuoteText] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<boolean>(false);

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress('処理を開始しています...');
    setProgressPercent(0);
    cancelRef.current = false;
    
    try {
      // 進捗を監視するためのログリスナーを設定
      const originalLog = console.log;
      const originalWarn = console.warn;
      
      console.log = (...args) => {
        originalLog(...args);
        if (args[0] && typeof args[0] === 'string' && args[0].includes('Extraction生成中:')) {
          setProgress(args[0]);
          // 進捗パーセンテージを計算（例: "1/3" → 33%）
          const match = args[0].match(/(\d+)\/(\d+)/);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            setProgressPercent(Math.round((current / total) * 100));
          }
        }
      };
      
      console.warn = (...args) => {
        originalWarn(...args);
        if (args[0] && typeof args[0] === 'string' && args[0].includes('quotesが空です')) {
          setProgress(args[0]);
        }
      };
      
      await generateExtractions();
      
      if (cancelRef.current) {
        setProgress('キャンセルされました');
        return;
      }
      
      setGenerated(true);
      setProgress('完了しました！');
      setProgressPercent(100);
      
      // ログリスナーを元に戻す
      console.log = originalLog;
      console.warn = originalWarn;
    } catch (error) {
      console.error('Extraction生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // APIキーが設定されていない場合の特別な処理
      if (errorMessage.includes('APIキーが設定されていません')) {
        setProgress('APIキーが設定されていません。設定方法を確認してください。');
        const setupInfo = errorMessage.split('\n\n')[1] || '';
        alert(`APIキーが設定されていません。\n\n${setupInfo}\n\n詳細は README_LLM_SETUP.md を参照してください。`);
      } else {
        alert(`Extraction生成でエラーが発生しました: ${errorMessage}`);
      }
      setProgress('エラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setIsGenerating(false);
    setProgress('キャンセルされました');
  };

  const handleFieldChange = (field: keyof ExtractionRecord, value: any) => {
    if (!currentRecord) return;
    if (currentRecord.finalized) {
      alert('確定済みのExtraction Recordは編集できません。');
      return;
    }
    updateExtractionRecord(currentRecord.respondent_id, { [field]: value });
  };

  const handleQuoteClick = (quote: Quote) => {
    setSelectedQuote(quote.id);
    setHighlightedStatement(quote.statement_id);
    setHighlightedQuoteText(quote.text);
    
    // 入力ソースから原文を取得
    const source = storeInputSources.find((s) => s.id === quote.source_file);
    if (source) {
      setHighlightedSourceText(source.text);
      
      // ハイライト要素にスクロール（少し遅延させてDOM更新を待つ）
      setTimeout(() => {
        if (highlightRef.current) {
          highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      // Statementから取得を試みる
      const statement = statements.find((s) => s.id === quote.statement_id);
      if (statement) {
        setHighlightedSourceText(statement.text);
        
        setTimeout(() => {
          if (highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
    
    // 元のStatementをスクロール
    const element = document.getElementById(`statement-${quote.statement_id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 原文内で該当テキストをハイライトする関数
  const highlightTextInSource = (sourceText: string, quoteText: string) => {
    if (!quoteText || !sourceText) return <span>{sourceText}</span>;
    
    // 引用テキストをエスケープ
    const escapedQuote = quoteText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 引用テキストを検索（大文字小文字を区別しない）
    const regex = new RegExp(`(${escapedQuote})`, 'gi');
    const parts = sourceText.split(regex);
    
    return parts.map((part, index) => {
      // マッチした部分をチェック（大文字小文字を区別しない）
      if (part.toLowerCase() === quoteText.toLowerCase()) {
        return (
          <mark key={index} className="bg-yellow-300 px-1 rounded">
            {part}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleConfidenceChange = (newConfidence: number) => {
    if (!currentRecord) return;
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

  const handleSaveExtraction = () => {
    if (!activeProduct) {
      alert('サービス・製品が選択されていません。保存するには、まずサービス・製品を選択してください。');
      return;
    }

    const finalizedRecords = extractionRecords.filter((r) => r.finalized);
    if (finalizedRecords.length === 0) {
      alert('保存するには、まずExtraction Recordを確定してください。');
      return;
    }

    const title = prompt('Extractionのタイトルを入力してください:', `Extraction_${new Date().toLocaleDateString('ja-JP')}`);
    if (!title) return;

    try {
      createSavedExtraction({
        title,
        productId: activeProduct.productId, // ペルソナ作成は必須なので、activeProductがあるはず
        extractionRecords: finalizedRecords,
        source: 'interview',
        tags: [],
      });
      alert('Extractionを保存しました。');
      router.push('/extractions');
    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };
  
  const handleGoToAggregation = () => {
    if (!isExtractionFinalized()) {
      alert('Extraction Recordを確定してからAggregation生成へ進んでください。');
      return;
    }
    setCurrentStep('aggregation');
  };

  if (!generated && extractionRecords.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Extraction生成</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                発言から事実のみを抽出し、Extraction JSONを生成します。
              </p>
              <p className="text-sm text-gray-500 mb-4">
                入力ソース数: {inputSources.length}件
              </p>
              <p className="text-xs text-gray-400 mb-4">
                ※ LLMが入力テキストを分析し、回答者（respondent）を識別してExtractionを生成します
              </p>
            </div>

            {!isGenerating ? (
              <button
                onClick={handleGenerate}
                disabled={inputSources.length === 0}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                AIでExtraction生成
              </button>
            ) : (
              <div className="p-8 bg-blue-50 rounded-lg">
                {/* プログレスバー */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">進捗</span>
                    <span className="text-sm text-gray-600">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-semibold mb-2">Extraction生成中...</p>
                  {progress && (
                    <p className="text-sm text-gray-500 mb-4">{progress}</p>
                  )}
                  <p className="text-xs text-gray-400 mb-4">
                    この処理には時間がかかる場合があります。しばらくお待ちください。
                  </p>
                  
                  {/* キャンセルボタン（アンカー式） */}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCancel();
                    }}
                    className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    <X className="w-4 h-4" />
                    キャンセル
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="text-xl font-bold">Extraction生成・確認</h2>
          <div className="flex gap-2">
            {currentRecordIssues.length > 0 && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded flex items-center gap-1" title={`${currentRecordIssues.length}件のquotes整合性問題があります。詳細はquotes一覧で確認できます。`}>
                <span>⚠️</span>
                <span>{currentRecordIssues.length}件の整合性問題</span>
              </div>
            )}
            {isExtractionFinalized() && (
              <button
                onClick={handleSaveExtraction}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-2"
                title="確定済みExtractionを保存"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
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
                  + trigger追加
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
                  + barrier追加
                </button>
              </div>
            </div>

            {/* confidence */}
            <div>
              <label className="block text-sm font-medium mb-1">
                confidence: {currentRecord.confidence.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={currentRecord.confidence}
                onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
                disabled={currentRecord.finalized}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">
                quote_count: {currentRecord.confidence_breakdown.quote_count_score.toFixed(2)}, 
                field_completeness: {currentRecord.confidence_breakdown.field_completeness_score.toFixed(2)}, 
                quote_clarity: {currentRecord.confidence_breakdown.quote_clarity_score.toFixed(2)}
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
                <div 
                  ref={highlightRef}
                  className="p-4 bg-gray-50 rounded border max-h-64 overflow-y-auto"
                >
                  {highlightedSourceText ? (
                    <div className="text-sm whitespace-pre-wrap">
                      {highlightedQuoteText 
                        ? highlightTextInSource(highlightedSourceText, highlightedQuoteText)
                        : highlightedSourceText
                      }
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
