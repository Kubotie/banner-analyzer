'use client';

import { useState, useCallback, useEffect } from 'react';
import { Extraction } from '@/types/schema';
import BannerImage from './BannerImage';
import { migrateComponent, migrateExtractionComponents } from '@/lib/component-migrator';
import { isReanalysisTarget, isLowPriorityType, type BBoxTypeKey, BBOX_TYPE, getBBoxTypeLabel } from '@/lib/bbox-types';
import { detectBannerPatterns } from '@/lib/banner-pattern-detector';

interface AnalysisResultProps {
  extraction: Extraction;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onSave?: () => void; // 「このバナーを保存」コールバック
  ocrComponents?: Extraction['components']; // OCR由来のcomponents（表示用）
  imageId?: string; // ImageAsset.imageId（レイアウト保存用）
  originalFile?: File; // 元のFileオブジェクト（自動検出用）
  bannerId?: string; // Banner.id（自動検出用）
  productId?: string; // Product.productId（自動検出用、任意）
  onExtractionUpdate?: (extraction: Extraction) => void; // Extraction更新コールバック
}

// BBox用の色定義
const COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

/**
 * type文字列を内部キーに正規化
 * 日本語と英語の両方を吸収し、内部キー（logo/product_image/headline/cta/annotation）に統一
 */
function normalizeType(type: string): 'logo' | 'product_image' | 'headline' | 'cta' | 'annotation' {
  const s = (type ?? '').trim().toLowerCase();
  
  // ロゴ判定
  if (s === 'ロゴ' || s === 'logo') return 'logo';
  
  // 商品画像判定
  if (s === '商品画像' || s === 'product_image' || s === 'product') return 'product_image';
  
  // キャッチコピー/headline判定
  if (s === 'キャッチコピー' || s === 'headline' || s === 'catchcopy' || s.includes('headline')) return 'headline';
  
  // CTA判定
  if (s === 'cta' || s.startsWith('cta:')) return 'cta';
  
  // 注釈判定（価格、期間限定など）
  if (s === '注釈' || s === 'annotation' || s.includes('価格') || s.includes('期間') || s.includes('annotation')) return 'annotation';
  
  // MVP: 不明なら注釈扱い
  return 'annotation';
}

/**
 * type文字列から内部キー（type）と表示用ラベル（label）を分離
 * 例: "CTA: 今すぐ購入" → { type: 'cta', label: 'CTA: 今すぐ購入' }
 */
// 旧形式互換用（後で削除予定）
function parseTypeAndLabel(comp: Extraction['components'][0]): { type: 'logo' | 'product_image' | 'headline' | 'cta' | 'annotation'; label: string } {
  const normalizedType = normalizeType(comp.type);
  // 既に正規化されている場合はそのまま、そうでなければtypeをそのままlabelに
  const label = comp.type; // 表示用ラベルは元のtype文字列を使用
  
  return { type: normalizedType, label };
}

export default function AnalysisResult({
  extraction,
  imageUrl,
  imageWidth,
  imageHeight,
  onSave,
  ocrComponents = [],
  imageId,
  originalFile,
  bannerId,
  productId,
  onExtractionUpdate,
}: AnalysisResultProps) {
  const [selectedBboxId, setSelectedBboxId] = useState<string | null>(null);
  const [showAddBboxDialog, setShowAddBboxDialog] = useState(false);
  const [newBboxKey, setNewBboxKey] = useState<BBoxTypeKey>('logo');
  const [newBboxLabel, setNewBboxLabel] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [editingBboxIndex, setEditingBboxIndex] = useState<number | null>(null);
  const [editingBboxKey, setEditingBboxKey] = useState<BBoxTypeKey>('logo');
  const [editingBboxLabel, setEditingBboxLabel] = useState('');
  const [hasAutoDetected, setHasAutoDetected] = useState(false);
  const [hasAutoReanalyzed, setHasAutoReanalyzed] = useState(false);
  const [currentAutoStep, setCurrentAutoStep] = useState<string | null>(null);

  // Componentを新形式に移行（typeKey必須化、source enum化）
  const migratedExtraction = (() => {
    return {
      ...extraction,
      components: migrateExtractionComponents(extraction.components),
    };
  })();

  // 再解析処理を関数として抽出
  const handleReanalyze = useCallback(async (isAuto: boolean = false) => {
    if (!originalFile || !onExtractionUpdate) {
      if (!isAuto) {
        alert('元画像が無いため再解析できません。画像を再アップロードしてください。');
      }
      return;
    }

    setIsReanalyzing(true);
    try {
      // 最新のextractionを取得（migratedExtractionに依存しない）
      const currentMigratedExtraction = (() => {
        return {
          ...extraction,
          components: migrateExtractionComponents(extraction.components),
        };
      })();

      // 1) OCR由来を除外（auto/manualどちらも対象）: bboxが存在し、w/h>0のもの
      const editableComponents = currentMigratedExtraction.components.filter((c) => 
        (c as any).source !== 'ocr' && c.bbox && c.bbox.w > 0 && c.bbox.h > 0
      );
      
      // 2) 再解析対象は新しいtypeKeyで判定（isReanalysisTarget使用）
      const { migrateType } = await import('@/lib/bbox-types');
      const ocrTargetComponents = editableComponents.filter((comp) => {
        const typeKey = (comp as any).typeKey;
        if (!typeKey) {
          // 旧形式の場合はmigrateTypeで判定
          const migratedKey = migrateType(comp.type);
          return isReanalysisTarget(migratedKey);
        }
        return isReanalysisTarget(typeKey as BBoxTypeKey);
      });
      
      if (ocrTargetComponents.length === 0) {
        if (isAuto) {
          console.log('[自動再解析] 再解析対象のBBoxがありません。');
        } else {
          alert('再解析対象のBBoxがありません。BBoxを追加してください。');
        }
        return;
      }
      
      // 5. 各BBox領域でOCRを実行
      const { runOcrOnBbox } = await import('@/lib/ocr-bbox');
      const updatedComponents = [...currentMigratedExtraction.components];
      
      for (const comp of ocrTargetComponents) {
        // コンポーネントIDで検索（安全策）
        const compId = (comp as any).id || `comp-${currentMigratedExtraction.components.indexOf(comp)}`;
        const compIndex = currentMigratedExtraction.components.findIndex(
          (c) => {
            const cId = (c as any).id || `comp-${currentMigratedExtraction.components.indexOf(c)}`;
            return cId === compId || c === comp;
          }
        );
        if (compIndex < 0) {
          console.warn('[自動再解析] component not found:', compId);
          continue;
        }
        
        try {
          // originalFileを使用（imageUrlではなくFileオブジェクト）
          const ocrText = await runOcrOnBbox(
            originalFile,
            comp.bbox,
            imageWidth,
            imageHeight
          );
          
          if (ocrText) {
            updatedComponents[compIndex] = {
              ...comp,
              text: ocrText,
            };
            const { type: normalizedType, label } = parseTypeAndLabel(comp);
            console.debug('[自動再解析] BBox OCR成功:', {
              normalizedType,
              originalType: comp.type,
              label,
              text: ocrText.substring(0, 50),
            });
          }
        } catch (ocrError) {
          const { type: normalizedType, label } = parseTypeAndLabel(comp);
          console.warn('[自動再解析] BBox OCR失敗（無視）:', {
            normalizedType,
            originalType: comp.type,
            label,
            error: ocrError,
          });
          // OCR失敗時はtextを空のまま（エラーで全体を落とさない）
        }
      }
      
      // 6. 更新済みcomponentsを入力に分析を再生成（ocrTargetComponentsを使用）
      const finalComponents = ocrTargetComponents.map(comp => {
        const compIndex = updatedComponents.findIndex(c => c === comp);
        return compIndex >= 0 ? updatedComponents[compIndex] : comp;
      });
      
      // 7. 分析に使うのはheadline/cta/annotationのtextのみ（既にocrTargetComponentsに含まれている）
      const analysisTexts = finalComponents
        .map((comp) => comp.text)
        .filter((text): text is string => text !== null && text.trim().length > 0);
      
      // 8. 簡易的な再解析ロジック（ダミー）
      const newAppealAxes = finalComponents
        .map((comp) => {
          const { type: normalizedType, label } = parseTypeAndLabel(comp);
          let appealType: string;
          if (normalizedType === 'headline') {
            appealType = '訴求';
          } else if (normalizedType === 'cta') {
            appealType = '行動喚起';
          } else if (normalizedType === 'annotation') {
            appealType = '情報';
          } else {
            appealType = 'その他';
          }
          
          return {
            type: appealType,
            evidence_text: comp.text || label,
            bbox: comp.bbox,
          };
        });
      
      const newNotes = `再解析BBox（${ocrTargetComponents.length}件）に基づく分析。\n` +
        ocrTargetComponents.map((c, i) => {
          const { type: normalizedType, label } = parseTypeAndLabel(c);
          return `${i + 1}. ${label}${c.text ? `: ${c.text}` : ''} (${normalizedType})`;
        }).join('\n') +
        (analysisTexts.length > 0 ? `\n\nOCR取得テキスト:\n${analysisTexts.join('\n')}` : '');
      
      // 9. Extractionを更新（ダミーの抽象テキストは生成しない）
      onExtractionUpdate({
        ...currentMigratedExtraction,
        components: updatedComponents,
        appeal_axes: newAppealAxes,
        notes: newNotes,
      });
      
      const logPrefix = isAuto ? '[自動再解析]' : '[再解析]';
      console.log(`${logPrefix} 完了: ${ocrTargetComponents.length}件のBBoxでOCRを実行しました。`);
      
      if (!isAuto) {
        alert(`再解析しました。${ocrTargetComponents.length}件のBBoxでOCRを実行しました。`);
      }
    } catch (error) {
      const logPrefix = isAuto ? '[自動再解析]' : '[再解析]';
      console.error(`${logPrefix} エラー:`, error);
      if (!isAuto) {
        alert('再解析でエラーが発生しました');
      }
    } finally {
      setIsReanalyzing(false);
    }
  }, [originalFile, imageWidth, imageHeight, extraction, onExtractionUpdate]);

  // 画像初回読み込み時に自動検出を実行
  useEffect(() => {
    if (!imageId || !originalFile || hasAutoDetected || !onExtractionUpdate) {
      return;
    }

    // KBに既存のbanner_auto_layoutがあるかチェック
    const checkAndRunAutoLayout = async () => {
      try {
        const { listKbItems, saveKbItem } = await import('@/kb/common-api');
        const existingLayouts = listKbItems({ 
          kind: 'banner_auto_layout', 
          imageId 
        });

        if (existingLayouts.length > 0) {
          // 既存のレイアウトを復元
          const existingLayout = existingLayouts[0];
          const payload = (existingLayout.payload as any);
          if (payload.bboxes && Array.isArray(payload.bboxes)) {
            // 新形式のBBoxタイプに対応
            const { migrateType, getBBoxTypeLabel } = await import('@/lib/bbox-types');
            const restoredComponents = payload.bboxes.map((b: any, idx: number) => {
              const typeKey = b.typeKey || migrateType(b.type || 'main_copy');
              const typeLabel = getBBoxTypeLabel(typeKey);
              return {
                id: b.id || `comp-restored-${idx}`,
                type: typeLabel, // 旧形式互換用
                typeKey, // 新形式
                typeLabel, // UI表示用
                text: b.textCandidate || null,
                bbox: {
                  ...b.bbox,
                  coord: 'normalized' as const,
                },
                source: 'auto' as const,
                confidence: b.confidence || 0.8,
              };
            });

            onExtractionUpdate({
              ...migratedExtraction,
              components: [...migratedExtraction.components, ...restoredComponents],
            });
          }
          setHasAutoDetected(true);
          return;
        }

        // 既存がなければ自動検出を実行
        setIsAutoDetecting(true);
        setHasAutoDetected(true);

        // 自動検出API呼び出し（既存のボタンクリック処理と同じロジック）
        const formData = new FormData();
        formData.append('file', originalFile);
        formData.append('width', String(imageWidth));
        formData.append('height', String(imageHeight));
        if (bannerId) formData.append('bannerId', bannerId);
        if (productId) formData.append('productId', productId);

        const res = await fetch('/api/banner/auto-layout', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[自動検出] 初回実行失敗:', errorText);
          setIsAutoDetecting(false);
          setCurrentAutoStep(null);
          return;
        }

        let data: any;
        try {
          const responseText = await res.text();
          console.log('[自動検出] レスポンス受信:', {
            length: responseText.length,
            prefix: responseText.substring(0, 200),
          });
          
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('[自動検出] JSONパースエラー:', parseError);
            console.error('[自動検出] レスポンス全文:', responseText);
            throw new Error(`JSONパースエラー: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          }
        } catch (error) {
          console.error('[自動検出] レスポンス取得エラー:', error);
          setIsAutoDetecting(false);
          setCurrentAutoStep(null);
          return;
        }
        
        if (!data || !Array.isArray(data.components)) {
          console.error('[自動検出] 無効なレスポンス:', data);
          setIsAutoDetecting(false);
          setCurrentAutoStep(null);
          return;
        }

        // 新形式のBBoxタイプに対応
        const { migrateType, getBBoxTypeLabel } = await import('@/lib/bbox-types');
        const autoComponents = data.components.map((comp: any, idx: number) => {
          const typeKey = migrateType(comp.type || 'main_copy');
          const typeLabel = getBBoxTypeLabel(typeKey);
          return {
            id: comp.id || `comp-auto-${idx}`,
            type: typeLabel, // 旧形式互換用
            typeKey, // 新形式
            typeLabel, // UI表示用
            text: comp.textCandidate || null,
            bbox: {
              x: Math.max(0, Math.min(1, comp.bbox.x || 0)),
              y: Math.max(0, Math.min(1, comp.bbox.y || 0)),
              w: Math.max(0.02, Math.min(1 - (comp.bbox.x || 0), comp.bbox.w || 0.2)),
              h: Math.max(0.02, Math.min(1 - (comp.bbox.y || 0), comp.bbox.h || 0.2)),
              coord: 'normalized' as const,
            },
            source: 'auto' as const,
            confidence: comp.confidence || 0.8,
          };
        });

        // Extractionに反映（更新されたextractionを保持）
        const updatedExtraction = {
          ...migratedExtraction,
          components: [...migratedExtraction.components, ...autoComponents],
        };
        onExtractionUpdate(updatedExtraction);

        // banner_auto_layoutをKBに保存
        try {
          const { BannerAutoLayoutPayloadSchema } = await import('@/kb/common-schemas');
          
          const autoLayoutPayload = {
            summary: `自動検出された${autoComponents.length}件のBBox`,
            confidence: 0.8,
            bboxes: autoComponents.map((comp: any) => ({
              id: comp.id || `bbox-${Date.now()}`,
              type: comp.typeKey, // 新形式：typeKey
              label: comp.typeLabel, // UI表示用
              bbox: comp.bbox,
              area: comp.bbox.w * comp.bbox.h,
              source: 'auto' as const,
              textCandidate: comp.text || undefined,
            })),
            imageSize: { width: imageWidth, height: imageHeight },
          };

          // Zod検証
          BannerAutoLayoutPayloadSchema.parse(autoLayoutPayload);

          await saveKbItem('banner_auto_layout', autoLayoutPayload, {
            title: `自動レイアウト_${new Date().toLocaleDateString('ja-JP')}`,
            imageId,
            productId,
          });

          console.log('[自動検出] banner_auto_layoutをKBに保存完了');
        } catch (saveError) {
          console.error('[自動検出] banner_auto_layout保存エラー:', saveError);
        }

        // banner_insightを生成（BBox + OCRテキストから）
        // 既存のbanner_insightをチェック
        const existingInsights = listKbItems({ 
          kind: 'banner_insight', 
          imageId 
        });

        if (existingInsights.length === 0) {
          try {
            // OCRテキストを取得（text-only、失敗してもOK）
            let ocrTexts: string[] = [];
            try {
              const { runOcrOnImage } = await import('@/lib/ocr-client');
              const ocrResults = await runOcrOnImage(originalFile, imageWidth, imageHeight);
              ocrTexts = ocrResults.map(r => r.text).filter(Boolean);
              console.log('[自動検出] OCRテキスト取得:', ocrTexts.length, '件');
            } catch (ocrErr) {
              console.warn('[自動検出] OCR取得失敗（続行）:', ocrErr);
            }

            // 面積統計を計算（autoComponentsから）
            const areaStats: Record<string, number> = {};
            const bboxTexts: Array<{ bboxId: string; text: string }> = [];
            const allTexts: string[] = [...ocrTexts];
            
            autoComponents.forEach((comp: any) => {
              const typeKey = (comp as any).typeKey || migrateType(comp.type || 'main_copy');
              const area = comp.bbox.w * comp.bbox.h;
              areaStats[typeKey] = (areaStats[typeKey] || 0) + area;
              
              if (comp.text && !isLowPriorityType(typeKey)) {
                const compId = comp.id || `comp-${autoComponents.indexOf(comp)}`;
                bboxTexts.push({
                  bboxId: compId,
                  text: comp.text,
                });
                allTexts.push(comp.text);
              }
            });
            
            // バナー構成の型を検出
            const patternSummary = detectBannerPatterns({
              texts: allTexts,
              areaStats,
            });
            
            // banner_insight生成API呼び出し用の入力データを構築
            // texts は { ocrTexts: string[], bboxTexts: Array<{ bboxId: string; text: string }> } の形式が必要
            const insightInputs = {
              layoutBboxes: autoComponents.map((comp: any) => ({
                id: comp.id || `comp-${autoComponents.indexOf(comp)}`,
                type: (comp as any).typeKey || migrateType(comp.type || 'main_copy'),
                bbox: comp.bbox,
                area: comp.bbox.w * comp.bbox.h,
                text: comp.text || undefined,
              })),
              texts: {
                ocrTexts: ocrTexts, // string[] をそのまま使用
                bboxTexts: bboxTexts, // Array<{ bboxId: string; text: string }> をそのまま使用
              },
              areas: {
                byType: areaStats,
                total: Object.values(areaStats).reduce((sum, val) => sum + val, 0),
              },
              patternScores: patternSummary.patterns,
              activeProduct: productId ? { productId, name: '', category: '' } : null,
              personaRefs: [],
              bannerContext: imageId ? {
                imageId,
                imageSize: { width: imageWidth, height: imageHeight },
              } : null,
            };

            // 送信前にデバッグログ
            console.debug('[自動検出] generate-insight 送信データ', {
              texts: insightInputs.texts,
              ocrTextsType: typeof insightInputs.texts.ocrTexts,
              ocrTextsIsArray: Array.isArray(insightInputs.texts.ocrTexts),
              ocrTextsLength: insightInputs.texts.ocrTexts.length,
              bboxTextsType: typeof insightInputs.texts.bboxTexts,
              bboxTextsIsArray: Array.isArray(insightInputs.texts.bboxTexts),
              bboxTextsLength: insightInputs.texts.bboxTexts.length,
            });
            
            // banner_insight生成API呼び出し
            const insightRes = await fetch('/api/banner/generate-insight', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                inputs: insightInputs,
              }),
            });

            if (!insightRes.ok) {
              const errorText = await insightRes.text();
              throw new Error(`Insight生成APIエラー: ${insightRes.status} ${errorText}`);
            }

            let insightData: any;
            try {
              const responseText = await insightRes.text();
              try {
                insightData = JSON.parse(responseText);
              } catch (parseError) {
                console.error('[自動検出] Insight JSONパースエラー:', parseError);
                console.error('[自動検出] Insightレスポンス全文:', responseText);
                throw new Error(`Insight JSONパースエラー: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
              }
            } catch (error) {
              console.error('[自動検出] Insightレスポンス取得エラー:', error);
              throw error;
            }
            
            const bannerInsight = insightData.insight;

            // banner_insightをKBに保存
            await saveKbItem('banner_insight', bannerInsight, {
              title: `バナーインサイト_${new Date().toLocaleDateString('ja-JP')}`,
              imageId,
              productId,
              relatedKbIds: [], // banner_auto_layoutのIDを関連付ける場合は後で実装
            });

            console.log('[自動検出] banner_insightをKBに保存完了');
          } catch (insightError) {
            console.warn('[自動検出] Insight生成失敗（続行）:', insightError);
          }
        } else {
          console.log('[自動検出] 既存のbanner_insightをスキップ');
        }

        console.log('[自動検出] すべての処理が完了しました。isAutoDetectingをfalseにします。');
        setIsAutoDetecting(false);
        setCurrentAutoStep(null);
      } catch (error) {
        console.error('[自動検出] 初回実行エラー:', error);
        console.error('[自動検出] エラー詳細:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        setIsAutoDetecting(false);
        setCurrentAutoStep(null);
        setHasAutoDetected(false); // リトライ可能にする
      }
    };

    console.log('[自動検出] checkAndRunAutoLayout を開始します');
    checkAndRunAutoLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId, originalFile, imageWidth, imageHeight, bannerId, productId, hasAutoDetected]);

  // 自動検出完了後、自動的に再解析を実行（別のuseEffectで分離）
  useEffect(() => {
    console.log('[自動再解析チェック] useEffect実行', {
      hasAutoDetected,
      hasAutoReanalyzed,
      hasOriginalFile: !!originalFile,
      hasOnExtractionUpdate: !!onExtractionUpdate,
      extractionComponentsCount: extraction.components.length,
    });

    if (!hasAutoDetected || hasAutoReanalyzed || !originalFile || !onExtractionUpdate) {
      console.log('[自動再解析チェック] 条件不満足のためスキップ');
      return;
    }

    // 自動検出が完了し、autoコンポーネントが存在する場合のみ実行
    const currentMigratedExtraction = (() => {
      return {
        ...extraction,
        components: migrateExtractionComponents(extraction.components),
      };
    })();
    
    const autoComponents = currentMigratedExtraction.components.filter((c) => (c as any).source === 'auto');
    console.log('[自動再解析チェック] autoコンポーネント数:', autoComponents.length);
    
    if (autoComponents.length === 0) {
      console.log('[自動再解析チェック] autoコンポーネントが0件のためスキップ（extraction更新待ち）');
      return;
    }

    console.log('[自動検出] 自動再解析を開始します...');
    setHasAutoReanalyzed(true);
    
    // 少し待ってから再解析を実行（Extraction更新が反映されるまで）
    const timer = setTimeout(() => {
      console.log('[自動再解析] タイマー発火、handleReanalyzeを呼び出します');
      handleReanalyze(true); // isAuto=true を渡す
    }, 1000);

    return () => {
      console.log('[自動再解析] クリーンアップ: タイマーをクリア');
      clearTimeout(timer);
    };
    // extraction.components.length を監視して、autoコンポーネントが追加されたら実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAutoDetected, hasAutoReanalyzed, originalFile, onExtractionUpdate, extraction.components.length]);

  // BBox更新ハンドラー
  const handleBboxUpdate = useCallback((bboxId: string, newBbox: Extraction['components'][0]['bbox']) => {
    if (!onExtractionUpdate) return;
    
    // bboxIdの形式: "comp-{index}" または "appeal-{index}"
    const match = bboxId.match(/^(comp|appeal)-(\d+)$/);
    if (!match) return;
    
    const [, type, indexStr] = match;
    const index = parseInt(indexStr);
    if (isNaN(index)) return;
    
    if (type === 'comp') {
      // componentsを更新（migratedExtractionを使用）
      const updatedComponents = [...migratedExtraction.components];
      if (updatedComponents[index]) {
        updatedComponents[index] = {
          ...updatedComponents[index],
          bbox: {
            ...newBbox,
            // 0..1にclamp
            x: Math.max(0, Math.min(1, newBbox.x)),
            y: Math.max(0, Math.min(1, newBbox.y)),
            w: Math.max(0.02, Math.min(1 - newBbox.x, newBbox.w)),
            h: Math.max(0.02, Math.min(1 - newBbox.y, newBbox.h)),
          },
        };
        
        onExtractionUpdate({
          ...migratedExtraction,
          components: updatedComponents,
        });
      }
    } else if (type === 'appeal') {
      // appeal_axesを更新
      const updatedAppealAxes = [...migratedExtraction.appeal_axes];
      if (updatedAppealAxes[index]) {
        updatedAppealAxes[index] = {
          ...updatedAppealAxes[index],
          bbox: {
            ...newBbox,
            // 0..1にclamp
            x: Math.max(0, Math.min(1, newBbox.x)),
            y: Math.max(0, Math.min(1, newBbox.y)),
            w: Math.max(0.02, Math.min(1 - newBbox.x, newBbox.w)),
            h: Math.max(0.02, Math.min(1 - newBbox.y, newBbox.h)),
          },
        };
        
        onExtractionUpdate({
          ...migratedExtraction,
          appeal_axes: updatedAppealAxes,
        });
      }
    }
  }, [migratedExtraction, onExtractionUpdate]);

  // keyとtypeのマッピング（新14種に対応）
  const keyToTypeMap: Record<BBoxTypeKey, string> = BBOX_TYPE;

  // BBox削除ハンドラー
  const handleDeleteBbox = useCallback((index: number) => {
    if (!onExtractionUpdate) return;
    
    const comp = migratedExtraction.components[index];
    const source = (comp as any).source;
    
    // ocr以外のBBox（manual、auto）は削除可能
    if (source === 'ocr') {
      console.warn('[BBox削除] OCR由来のBBoxは削除できません');
      return;
    }
    
    if (!window.confirm(`「${comp.type}」を削除しますか？`)) {
      return;
    }
    
    // 削除（immutable）
    const updatedComponents = migratedExtraction.components.filter((_, idx) => idx !== index);
    
    onExtractionUpdate({
      ...migratedExtraction,
      components: updatedComponents,
    });
    
    // 削除後の選択状態を更新（編集可能なBBox（manual/auto）を優先、なければnull）
    const editableIndices = updatedComponents
      .map((c, idx) => {
        const s = (c as any).source;
        return (s === 'manual' || s === 'auto') ? idx : -1;
      })
      .filter(idx => idx >= 0);
    
    if (editableIndices.length > 0) {
      // 削除したindexより前の編集可能BBoxを優先、なければ次の編集可能BBox
      const prevIndex = editableIndices.filter(idx => idx < index).pop();
      const nextIndex = editableIndices.find(idx => idx >= index);
      const newSelectedIndex = prevIndex !== undefined ? prevIndex : (nextIndex !== undefined ? nextIndex : editableIndices[0]);
      setSelectedBboxId(`comp-${newSelectedIndex}`);
    } else {
      setSelectedBboxId(null);
    }
  }, [migratedExtraction, onExtractionUpdate]);

  // BBox追加ハンドラー（直前のBBoxのkeyを引き継ぐ）
  const handleAddBbox = useCallback(() => {
    if (!onExtractionUpdate) return;
    
    // 直前の選択BBoxからkeyを取得
    let defaultKey: BBoxTypeKey = 'logo';
    if (selectedBboxId) {
      const match = selectedBboxId.match(/^comp-(\d+)$/);
      if (match) {
        const prevIndex = parseInt(match[1]);
        const prevComp = migratedExtraction.components[prevIndex];
        if (prevComp && ((prevComp as any).source === 'manual' || (prevComp as any).source === 'auto')) {
          // typeKeyがあればそれを使用、なければtypeから逆引き
          const prevTypeKey = (prevComp as any).typeKey;
          if (prevTypeKey && prevTypeKey in BBOX_TYPE) {
            defaultKey = prevTypeKey as BBoxTypeKey;
          } else {
            // 旧形式の場合はmigrateTypeで判定（事前にインポート済み）
            const { migrateType } = require('@/lib/bbox-types');
            defaultKey = migrateType(prevComp.type);
          }
        }
      }
    }
    
    const newComponent: Extraction['components'][0] = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: getBBoxTypeLabel(newBboxKey), // 旧形式互換用
      typeKey: newBboxKey, // 新形式
      typeLabel: getBBoxTypeLabel(newBboxKey), // UI表示用
      text: newBboxLabel || null,
      bbox: {
        x: 0.4, // 中央
        y: 0.4,
        w: 0.2, // 適当なサイズ
        h: 0.2,
        coord: 'normalized' as const,
      },
      source: 'manual' as const,
    };
    
    onExtractionUpdate({
      ...migratedExtraction,
      components: [...migratedExtraction.components, newComponent],
    });
    
    // 追加したBBoxを選択状態にする
    const newIndex = migratedExtraction.components.length;
    setSelectedBboxId(`comp-${newIndex}`);
    
    setShowAddBboxDialog(false);
    setNewBboxLabel('');
    setNewBboxKey(defaultKey); // 直前のkeyを引き継ぐ
  }, [migratedExtraction, onExtractionUpdate, newBboxKey, newBboxLabel, selectedBboxId]);

  // BBox名（key/label）更新ハンドラー
  const handleUpdateBboxName = useCallback((index: number, key: BBoxTypeKey, label: string) => {
    if (!onExtractionUpdate) return;
    
    const updatedComponents = [...migratedExtraction.components];
    if (updatedComponents[index]) {
      const typeLabel = label || getBBoxTypeLabel(key);
      updatedComponents[index] = {
        ...updatedComponents[index],
        type: typeLabel, // 旧形式互換用
        typeKey: key, // 新形式
        typeLabel, // UI表示用
      };
      
      onExtractionUpdate({
        ...migratedExtraction,
        components: updatedComponents,
      });
    }
    
    setEditingBboxIndex(null);
  }, [migratedExtraction, onExtractionUpdate]);


  // BBoxデータを準備（編集レイヤー用：source==='manual'または'auto'のみ）
  // OCR由来はOverlayでは描画しないが、components一覧では表示する
  const bboxItems: Array<{ bbox: Extraction['components'][0]['bbox']; label: string; color: string; id?: string; source?: string }> = [
    ...migratedExtraction.components
      .map((comp, idx) => {
        // source==='manual'または'auto'のみをBBoxOverlayに含める
        const source = (comp as any).source;
        if (source !== 'manual' && source !== 'auto') {
          return null; // OCR由来はOverlayに含めない
        }
        
        // 座標が0..1範囲外の場合は警告して除外
        const { bbox } = comp;
        if (bbox.x < 0 || bbox.x > 1 || bbox.y < 0 || bbox.y > 1 ||
            bbox.w < 0 || bbox.w > 1 || bbox.h < 0 || bbox.h > 1) {
          console.warn(`[AnalysisResult] components[${idx}] bbox座標が範囲外のため除外:`, {
            type: comp.type,
            text: comp.text,
            bbox: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h },
          });
          return null;
        }
        return {
          bbox: comp.bbox,
          label: `${comp.type}${comp.text ? `: ${comp.text}` : ''}`,
          color: COLORS[idx % COLORS.length],
          id: `comp-${idx}`,
          source: source as 'manual' | 'auto',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    // appeal_axesは編集対象外（表示のみ）なので、Overlayには含めない
  ];

  // 初期選択：manualの最初の要素を選択（初回のみ、manualが0件の場合はnull）
  useEffect(() => {
    if (!selectedBboxId && onExtractionUpdate && bboxItems.length > 0) {
      // bboxItemsの最初の要素を選択（manualのみが含まれている）
      setSelectedBboxId(bboxItems[0].id || null);
    }
  }, [bboxItems.length, onExtractionUpdate, selectedBboxId, bboxItems]);

  // デバッグログ: BBoxデータ準備完了時
  const manualCount = migratedExtraction.components.filter((c) => (c as any).source === 'manual').length;
  const ocrCount = migratedExtraction.components.filter((c) => (c as any).source === 'ocr').length;
  console.debug('[AnalysisResult] BBoxデータ準備:', {
    totalComponents: migratedExtraction.components.length,
    manualComponents: manualCount,
    ocrComponents: ocrCount,
    bboxItemsLength: bboxItems.length, // manualのみ
    selectedBboxId,
  });

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* 進行状況表示 */}
      {(isAutoDetecting || isReanalyzing || currentAutoStep) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div className="flex-1">
              <div className="font-semibold text-blue-900">
                {isAutoDetecting && '自動検出を実行中...'}
                {isReanalyzing && !isAutoDetecting && '再解析（初回解析）を実行中...'}
                {currentAutoStep && currentAutoStep}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {isAutoDetecting && 'BBoxを自動検出しています。しばらくお待ちください。'}
                {isReanalyzing && !isAutoDetecting && 'OCRテキストを取得し、分析を更新しています。'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">分析結果 (Extraction)</h2>
          <div className="flex gap-2">
            {onExtractionUpdate && (
              <button
                onClick={() => handleReanalyze(false)}
                disabled={isReanalyzing || !originalFile}
                className={`px-4 py-2 text-sm rounded ${
                  isReanalyzing || !originalFile
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
                title={!originalFile ? '元画像が無いため再解析できません（アップロード直後のみ可能）' : isReanalyzing ? '再解析中...' : '再解析'}
              >
                {isReanalyzing ? '再解析中...' : !originalFile ? '再解析（元画像なし）' : '再解析'}
              </button>
            )}
            {imageId && (
              <button
                onClick={async () => {
                  try {
                    // 手動BBoxのみを抽出（source==='manual'、autoは保存対象外）
                    const manualComponents = migratedExtraction.components.filter(
                      (comp) => (comp as any).source === 'manual'
                    );

                    if (manualComponents.length === 0) {
                      alert('保存する手動BBoxがありません。\nまずBBoxを編集してください。');
                      return;
                    }

                    const { saveBannerLayout } = await import('@/lib/layout-client');
                    const title = prompt(
                      'レイアウトのタイトルを入力してください:',
                      `レイアウト_${new Date().toLocaleDateString()}`
                    );
                    if (!title) return;

                    const kbId = await saveBannerLayout(imageId, manualComponents, {
                      title,
                    });

                    alert(`レイアウトを保存しました。\nKB ID: ${kbId}`);
                  } catch (error) {
                    console.error('レイアウト保存エラー:', error);
                    alert(
                      `保存でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
                    );
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                レイアウト保存
              </button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                このバナーを保存
              </button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">バナーID:</span> {migratedExtraction.banner_id}
            </div>
            {migratedExtraction.brand && (
              <div>
                <span className="font-medium">ブランド:</span> {migratedExtraction.brand}
              </div>
            )}
            {migratedExtraction.channel && (
              <div>
                <span className="font-medium">チャネル:</span> {migratedExtraction.channel}
              </div>
            )}
            {migratedExtraction.format && (
              <div>
                <span className="font-medium">フォーマット:</span> {migratedExtraction.format}
              </div>
            )}
            {migratedExtraction.tone && (
              <div>
                <span className="font-medium">トーン（候補）:</span> {migratedExtraction.tone}
              </div>
            )}
            <div>
              <span className="font-medium">信頼度:</span>{' '}
              <span className={migratedExtraction.confidence >= 0.7 ? 'text-green-600' : 'text-yellow-600'}>
                {(migratedExtraction.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 画像とBBox表示 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">画像分析（BBoxハイライト）</h3>
          {onExtractionUpdate && (
            <button
              onClick={() => {
                // 直前の選択BBoxからkeyを取得して初期値に設定
                let defaultKey: BBoxTypeKey = 'logo';
                if (selectedBboxId) {
                    const match = selectedBboxId.match(/^comp-(\d+)$/);
                    if (match) {
                      const prevIndex = parseInt(match[1]);
                      const prevComp = migratedExtraction.components[prevIndex];
                      if (prevComp && ((prevComp as any).source === 'manual' || (prevComp as any).source === 'auto')) {
                        // typeKeyがあればそれを使用、なければtypeから逆引き
                        const prevTypeKey = (prevComp as any).typeKey;
                        if (prevTypeKey && prevTypeKey in BBOX_TYPE) {
                          defaultKey = prevTypeKey as BBoxTypeKey;
                        } else {
                          // 旧形式の場合はmigrateTypeで判定（事前にインポート済み）
                          const { migrateType } = require('@/lib/bbox-types');
                          defaultKey = migrateType(prevComp.type);
                        }
                      }
                    }
                  }
                  setNewBboxKey(defaultKey);
                setNewBboxLabel('');
                setShowAddBboxDialog(true);
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              ＋BBox追加
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            {onExtractionUpdate 
              ? '手動BBox（青枠）はドラッグで移動、四隅のハンドルでリサイズできます。'
              : 'BBoxをクリックしてハイライト表示できます。'}
          </p>
          {onExtractionUpdate && (
            <button
              onClick={async () => {
                setIsAutoDetecting(true);
                let currentStep = '初期化';
                let responseStatus: number | null = null;
                
                try {
                  // Step A: 元のFileオブジェクトの確認
                  currentStep = 'Step A: Fileオブジェクト確認';
                  console.debug('[自動検出]', currentStep, { 
                    hasOriginalFile: !!originalFile,
                    imageWidth, 
                    imageHeight,
                    bannerId,
                    productId,
                  });
                  
                  if (!originalFile) {
                    throw new Error('元のFileオブジェクトが存在しません。画像を再アップロードしてください。');
                  }
                  
                  // Step B: FormDataを作成（blob URLを使わず、元のFileを直接使用）
                  currentStep = 'Step B: FormData作成';
                  console.debug('[自動検出]', currentStep, '開始', {
                    fileType: originalFile.type,
                    fileSize: originalFile.size,
                    fileName: originalFile.name,
                  });
                  
                  const formData = new FormData();
                  formData.append('file', originalFile); // blob URLではなく元のFileを直接使用
                  formData.append('width', String(imageWidth));
                  formData.append('height', String(imageHeight));
                  
                  if (bannerId) {
                    formData.append('bannerId', bannerId);
                  }
                  if (productId) {
                    formData.append('productId', productId);
                  }
                  
                  console.debug('[自動検出]', currentStep, '完了', {
                    fileType: originalFile.type,
                    fileSize: originalFile.size,
                    formDataKeys: Array.from(formData.keys()),
                  });
                  
                  // Step C: API呼び出し（multipart/form-data）
                  currentStep = 'Step C: API呼び出し';
                  console.debug('[自動検出]', currentStep, '開始', {
                    imageWidth,
                    imageHeight,
                    fileSize: originalFile.size,
                  });
                  
                  const res = await fetch('/api/banner/auto-layout', {
                    method: 'POST',
                    body: formData, // Content-Typeは自動設定される
                  });
                  
                  responseStatus = res.status;
                  
                  // Step D: レスポンス確認
                  currentStep = 'Step D: レスポンス確認';
                  console.debug('[自動検出]', currentStep, {
                    status: res.status,
                    statusText: res.statusText,
                    contentType: res.headers.get('content-type'),
                  });
                  
                  if (!res.ok) {
                    const errorText = await res.text();
                    console.error('[自動検出]', currentStep, '失敗', {
                      status: res.status,
                      errorText: errorText.substring(0, 500),
                    });
                    throw new Error(`API呼び出しに失敗しました (status: ${res.status}): ${errorText.substring(0, 200)}`);
                  }
                  
                  // Step E: JSON解析
                  currentStep = 'Step E: JSON解析';
                  const responseText = await res.text();
                  console.debug('[自動検出]', currentStep, '開始', {
                    responseLength: responseText.length,
                    responsePrefix: responseText.substring(0, 200),
                  });
                  
                  let data: any;
                  try {
                    data = JSON.parse(responseText);
                    console.debug('[自動検出]', currentStep, '完了', {
                      hasComponents: Array.isArray(data.components),
                      componentsLength: data.components?.length || 0,
                    });
                  } catch (parseError) {
                    console.error('[自動検出]', currentStep, 'JSON解析失敗', {
                      error: parseError instanceof Error ? parseError.message : String(parseError),
                      responseText: responseText.substring(0, 500),
                    });
                    throw new Error(`JSON解析に失敗しました: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
                  }
                  
                  // Step G: データ検証
                  currentStep = 'Step G: データ検証';
                  if (!data || !Array.isArray(data.components)) {
                    throw new Error(`無効なレスポンス形式: componentsが配列ではありません`);
                  }
                  
                  console.debug('[自動検出]', currentStep, '開始', {
                    componentsCount: data.components.length,
                  });
                  
                  // 新形式のBBoxタイプに対応
                  const { migrateType, getBBoxTypeLabel } = await import('@/lib/bbox-types');
                  const autoComponents = data.components.map((comp: any, idx: number) => {
                    if (!comp.type || !comp.bbox) {
                      console.warn('[自動検出]', currentStep, `無効なcomponent[${idx}]:`, comp);
                      return null;
                    }
                    
                    const typeKey = migrateType(comp.type || 'main_copy');
                    const typeLabel = getBBoxTypeLabel(typeKey);
                    
                    return {
                      id: comp.id || `comp-auto-${idx}`,
                      type: typeLabel, // 旧形式互換用
                      typeKey, // 新形式
                      typeLabel, // UI表示用
                      text: comp.textCandidate || null,
                      bbox: {
                        x: Math.max(0, Math.min(1, comp.bbox.x || 0)),
                        y: Math.max(0, Math.min(1, comp.bbox.y || 0)),
                        w: Math.max(0.02, Math.min(1 - (comp.bbox.x || 0), comp.bbox.w || 0.2)),
                        h: Math.max(0.02, Math.min(1 - (comp.bbox.y || 0), comp.bbox.h || 0.2)),
                        coord: 'normalized' as const,
                      },
                      source: 'auto' as const,
                      confidence: comp.confidence || 0.8,
                    };
                  }).filter((comp: any) => comp !== null);
                  
                  console.debug('[自動検出]', currentStep, '完了', {
                    validComponentsCount: autoComponents.length,
                    typeBreakdown: autoComponents.reduce((acc: Record<string, number>, comp: any) => {
                      acc[comp.type] = (acc[comp.type] || 0) + 1;
                      return acc;
                    }, {}),
                  });
                  
                  // Step G: state反映
                  currentStep = 'Step G: state反映';
                  console.debug('[自動検出]', currentStep, '開始', {
                    currentComponentsCount: migratedExtraction.components.length,
                    newComponentsCount: autoComponents.length,
                  });
                  
                  if (onExtractionUpdate) {
                    onExtractionUpdate({
                      ...migratedExtraction,
                      components: [...migratedExtraction.components, ...autoComponents],
                    });
                  }
                  
                  console.debug('[自動検出]', currentStep, '完了');
                  alert(`自動検出完了: ${autoComponents.length}件のBBoxを検出しました`);
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  const errorStack = error instanceof Error ? error.stack : undefined;
                  
                  console.error('[自動検出] エラー発生', {
                    step: currentStep,
                    errorMessage,
                    errorStack,
                    responseStatus,
                    hasOriginalFile: !!originalFile,
                    imageWidth,
                    imageHeight,
                  });
                  
                  alert(`自動検出に失敗しました (${currentStep}): ${errorMessage}`);
                } finally {
                  setIsAutoDetecting(false);
                }
              }}
              disabled={isAutoDetecting || !originalFile}
              className={`px-3 py-1 text-sm rounded ${
                isAutoDetecting || !originalFile
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={!originalFile ? '元画像がありません' : isAutoDetecting ? '自動検出中...' : '自動検出'}
            >
              {isAutoDetecting ? '自動検出中...' : !originalFile ? '自動検出（元画像なし）' : '自動検出'}
            </button>
          )}
        </div>
        <BannerImage
          imageUrl={imageUrl}
          width={imageWidth}
          height={imageHeight}
          bboxes={bboxItems}
          selectedBboxId={selectedBboxId}
          onBboxSelect={setSelectedBboxId}
          onBboxUpdate={handleBboxUpdate}
          editable={!!onExtractionUpdate}
        />
        
        {/* BBox追加ダイアログ */}
        {showAddBboxDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h4 className="text-lg font-semibold mb-4">BBox追加</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">タイプ</label>
                  <select
                    value={newBboxKey}
                    onChange={(e) => setNewBboxKey(e.target.value as BBoxTypeKey)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {Object.entries(BBOX_TYPE).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ラベル（任意）</label>
                  <input
                    type="text"
                    value={newBboxLabel}
                    onChange={(e) => setNewBboxLabel(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="例: ELIXIR ロゴ"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowAddBboxDialog(false);
                      setNewBboxLabel('');
                    }}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddBbox}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 抽出テキスト一覧（OCR由来） */}
      {ocrComponents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">抽出テキスト一覧（OCR結果）</h3>
          <div className="bg-white rounded-lg border">
            <div className="divide-y">
              {ocrComponents.map((comp, idx) => (
                <div key={`ocr-${idx}`} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-blue-600">{comp.type}</div>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          OCR
                        </span>
                      </div>
                      {comp.text && (
                        <div className="text-sm text-gray-700 mt-1">
                          <span className="font-medium">テキスト:</span> {comp.text}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        <div>ID: ocr_{idx + 1}</div>
                        {/* OCR text-onlyの場合はBBox座標を表示しない */}
                        {comp.bbox.x === 0 && comp.bbox.y === 0 && comp.bbox.w === 1 && comp.bbox.h === 1 ? (
                          <div>BBox: なし（text-only）</div>
                        ) : (
                          <div>BBox: ({comp.bbox.x.toFixed(3)}, {comp.bbox.y.toFixed(3)}) サイズ: {comp.bbox.w.toFixed(3)} × {comp.bbox.h.toFixed(3)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 構成要素 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">構成要素 (Components)</h3>
        <div className="bg-white rounded-lg border">
          <div className="divide-y">
            {migratedExtraction.components.map((comp, idx) => {
              const source = (comp as any).source;
              const isOcrComponent = source === 'ocr';
              const isManualComponent = source === 'manual';
              const isAutoComponent = source === 'auto';
              const bboxId = `comp-${idx}`;
              const isSelected = selectedBboxId === bboxId;
              
              return (
                <div 
                  key={idx} 
                  className={`p-4 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingBboxIndex === idx && isManualComponent ? (
                        // 編集モード
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-600">種類 (key):</label>
                            <select
                              value={editingBboxKey}
                              onChange={(e) => setEditingBboxKey(e.target.value as BBoxTypeKey)}
                              className="mt-1 block w-full text-sm border rounded px-2 py-1"
                            >
                              {Object.entries(BBOX_TYPE).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">表示名 (label):</label>
                            <input
                              type="text"
                              value={editingBboxLabel}
                              onChange={(e) => setEditingBboxLabel(e.target.value)}
                              className="mt-1 block w-full text-sm border rounded px-2 py-1"
                              placeholder="例: 商品画像"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateBboxName(idx, editingBboxKey, editingBboxLabel)}
                              className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => {
                                setEditingBboxIndex(null);
                                setEditingBboxLabel('');
                              }}
                              className="px-3 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 表示モード
                        <>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-blue-600">{comp.type}</div>
                            {isOcrComponent && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                OCR
                              </span>
                            )}
                        {isManualComponent && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            手動
                          </span>
                        )}
                        {isAutoComponent && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                            自動
                          </span>
                        )}
                          </div>
                          {comp.text && (
                            <div className="text-sm text-gray-700 mt-1">テキスト: {comp.text}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {/* OCR text-onlyの場合はBBox座標を「なし」と表示 */}
                            {isOcrComponent && comp.bbox.x === 0 && comp.bbox.y === 0 && comp.bbox.w === 1 && comp.bbox.h === 1 ? (
                              <div>BBox: なし（text-only）</div>
                            ) : (
                              <div>BBox: ({comp.bbox.x.toFixed(3)}, {comp.bbox.y.toFixed(3)}) サイズ: {comp.bbox.w.toFixed(3)} × {comp.bbox.h.toFixed(3)}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border-2"
                        style={{ borderColor: COLORS[idx % COLORS.length] }}
                      />
                      {(isManualComponent || isAutoComponent) && onExtractionUpdate && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (!isSelected) {
                                // 編集モード開始（選択状態も設定）
                                setSelectedBboxId(bboxId);
                                setEditingBboxIndex(idx);
                                setEditingBboxKey((() => {
                                  // typeKeyがあればそれを使用、なければtypeから逆引き
                                  const compTypeKey = (comp as any).typeKey;
                                  if (compTypeKey && compTypeKey in BBOX_TYPE) {
                                    return compTypeKey as BBoxTypeKey;
                                  } else {
                                    // 旧形式の場合はmigrateTypeで判定
                                    const { migrateType } = require('@/lib/bbox-types');
                                    return migrateType(comp.type);
                                  }
                                })());
                                setEditingBboxLabel(comp.type);
                              } else {
                                // 選択解除（編集モードも終了）
                                setSelectedBboxId(null);
                                setEditingBboxIndex(null);
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded ${
                              isSelected 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {isSelected ? '選択中' : '編集'}
                          </button>
                          {isSelected && (
                            <button
                              onClick={() => handleDeleteBbox(idx)}
                              className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                            >
                              削除
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 訴求軸 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">訴求軸 (Appeal Axes)</h3>
        <div className="bg-white rounded-lg border">
          <div className="divide-y">
            {migratedExtraction.appeal_axes.map((appeal, idx) => (
              <div key={idx} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-green-600">{appeal.type}</div>
                    <div className="text-sm text-gray-700 mt-1">
                      根拠テキスト: {appeal.evidence_text}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      BBox: ({appeal.bbox.x}, {appeal.bbox.y}) サイズ: {appeal.bbox.w} ×{' '}
                      {appeal.bbox.h}
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded border-2"
                    style={{
                      borderColor:
                        COLORS[(extraction.components.length + idx) % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 構造の読み取り：選ばれている理由 */}
      {extraction.selected_reason_hypothesis && (
        <div>
          <h3 className="text-lg font-semibold mb-3">この表現が選ばれている理由（仮説）</h3>
          <div className="bg-white rounded-lg border p-4 border-purple-300">
            <p className="text-sm text-purple-700">{extraction.selected_reason_hypothesis}</p>
          </div>
        </div>
      )}

      {/* 構造の読み取り：避けている表現 */}
      {extraction.avoided_expressions_hypothesis && (
        <div>
          <h3 className="text-lg font-semibold mb-3">避けている表現（仮説）</h3>
          <div className="bg-white rounded-lg border p-4 border-orange-300">
            <p className="text-sm text-orange-700">{extraction.avoided_expressions_hypothesis}</p>
          </div>
        </div>
      )}

      {/* 備考 */}
      {extraction.notes && (
        <div>
          <h3 className="text-lg font-semibold mb-3">備考 (Notes)</h3>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-700">{extraction.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
