'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BBox } from '@/types/schema';

interface BannerImageProps {
  imageUrl: string;
  width: number; // 画像の元の幅（ピクセル）
  height: number; // 画像の元の高さ（ピクセル）
  bboxes: Array<{ bbox: BBox; label: string; color: string; id?: string; source?: string }>;
  selectedBboxId?: string | null; // 選択中のBBox ID
  onBboxSelect?: (bboxId: string | null) => void; // BBox選択コールバック
  onBboxUpdate?: (bboxId: string, bbox: BBox) => void; // BBox更新コールバック（source='manual'のみ）
  editable?: boolean; // 編集可能かどうか
}

/**
 * バナー画像とBBoxを表示するコンポーネント（MVP: 表示とクリックハイライトのみ）
 * - BBox座標は正規化座標（0..1）で統一
 * - object-fit: contain を考慮した表示位置計算
 * - 固定サイズのプレビュー領域で無限スクロールを防ぐ
 */
export default function BannerImage({ 
  imageUrl, 
  width, 
  height, 
  bboxes,
  selectedBboxId,
  onBboxSelect,
  onBboxUpdate,
  editable = false,
}: BannerImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // ドラッグ/リサイズ状態
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    isResizing: boolean;
    bboxId: string;
    startX: number;
    startY: number;
    startBbox: BBox;
    resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | null;
  } | null>(null);
  
  // 画像の実際の表示サイズと位置を計算
  const [imageDisplayInfo, setImageDisplayInfo] = useState<{
    renderWidth: number;
    renderHeight: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // 画像の読み込みと表示サイズの計算
  useEffect(() => {
    const updateImageDisplayInfo = () => {
      if (!imageRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const img = imageRef.current;
      
      // コンテナのサイズ（固定）
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // 画像のアスペクト比
      const imageAspect = width / height;
      const containerAspect = containerWidth / containerHeight;
      
      let renderWidth: number;
      let renderHeight: number;
      let offsetX: number;
      let offsetY: number;
      
      // object-fit: contain の計算
      if (imageAspect > containerAspect) {
        // 画像が横長：幅に合わせる
        renderWidth = containerWidth;
        renderHeight = containerWidth / imageAspect;
        offsetX = 0;
        offsetY = (containerHeight - renderHeight) / 2;
      } else {
        // 画像が縦長：高さに合わせる
        renderWidth = containerHeight * imageAspect;
        renderHeight = containerHeight;
        offsetX = (containerWidth - renderWidth) / 2;
        offsetY = 0;
      }
      
      setImageDisplayInfo({
        renderWidth,
        renderHeight,
        offsetX,
        offsetY,
      });
    };

    // 初期計算
    updateImageDisplayInfo();
    
    // リサイズ時にも再計算
    window.addEventListener('resize', updateImageDisplayInfo);
    const img = imageRef.current;
    if (img) {
      img.addEventListener('load', updateImageDisplayInfo);
    }
    
    return () => {
      window.removeEventListener('resize', updateImageDisplayInfo);
      if (img) {
        img.removeEventListener('load', updateImageDisplayInfo);
      }
    };
  }, [width, height]);

  // Pointer移動/アップイベント（windowイベントリスナー方式）
  useEffect(() => {
    if (!dragState || !imageDisplayInfo || !containerRef.current) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !imageDisplayInfo) return;

      e.preventDefault();

      // 画像表示領域のrectを取得
      const rect = containerRef.current.getBoundingClientRect();
      
      // 現在のpointer座標を画像表示領域内の相対座標に変換
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      // 開始位置も画像表示領域内の相対座標に変換
      const startXRel = dragState.startX - rect.left;
      const startYRel = dragState.startY - rect.top;
      
      // 差分を計算
      const deltaX = currentX - startXRel;
      const deltaY = currentY - startYRel;

      // 表示座標から正規化座標への変換係数（画像表示サイズ基準）
      const scaleX = 1 / imageDisplayInfo.renderWidth;
      const scaleY = 1 / imageDisplayInfo.renderHeight;

      let newBbox: BBox = { ...dragState.startBbox };

      if (dragState.isResizing && dragState.resizeHandle) {
        // リサイズ処理
        const deltaXNorm = deltaX * scaleX;
        const deltaYNorm = deltaY * scaleY;

        console.debug('[resize-handle] move', { 
          corner: dragState.resizeHandle, 
          deltaXNorm, 
          deltaYNorm,
          startBbox: dragState.startBbox,
        });

        switch (dragState.resizeHandle) {
          case 'nw':
            newBbox = {
              x: Math.max(0, Math.min(1, dragState.startBbox.x + deltaXNorm)),
              y: Math.max(0, Math.min(1, dragState.startBbox.y + deltaYNorm)),
              w: Math.max(0.02, Math.min(1 - (dragState.startBbox.x + deltaXNorm), dragState.startBbox.w - deltaXNorm)),
              h: Math.max(0.02, Math.min(1 - (dragState.startBbox.y + deltaYNorm), dragState.startBbox.h - deltaYNorm)),
            };
            break;
          case 'ne':
            newBbox = {
              x: dragState.startBbox.x,
              y: Math.max(0, Math.min(1, dragState.startBbox.y + deltaYNorm)),
              w: Math.max(0.02, Math.min(1 - dragState.startBbox.x, dragState.startBbox.w + deltaXNorm)),
              h: Math.max(0.02, Math.min(1 - (dragState.startBbox.y + deltaYNorm), dragState.startBbox.h - deltaYNorm)),
            };
            break;
          case 'sw':
            newBbox = {
              x: Math.max(0, Math.min(1, dragState.startBbox.x + deltaXNorm)),
              y: dragState.startBbox.y,
              w: Math.max(0.02, Math.min(1 - (dragState.startBbox.x + deltaXNorm), dragState.startBbox.w - deltaXNorm)),
              h: Math.max(0.02, Math.min(1 - dragState.startBbox.y, dragState.startBbox.h + deltaYNorm)),
            };
            break;
          case 'se':
            newBbox = {
              x: dragState.startBbox.x,
              y: dragState.startBbox.y,
              w: Math.max(0.02, Math.min(1 - dragState.startBbox.x, dragState.startBbox.w + deltaXNorm)),
              h: Math.max(0.02, Math.min(1 - dragState.startBbox.y, dragState.startBbox.h + deltaYNorm)),
            };
            break;
        }
      } else if (dragState.isDragging) {
        // ドラッグ処理
        newBbox = {
          x: Math.max(0, Math.min(1 - dragState.startBbox.w, dragState.startBbox.x + deltaX * scaleX)),
          y: Math.max(0, Math.min(1 - dragState.startBbox.h, dragState.startBbox.y + deltaY * scaleY)),
          w: dragState.startBbox.w,
          h: dragState.startBbox.h,
        };
      }

      // 0..1にclamp（x+w<=1, y+h<=1を満たす）
      newBbox.x = Math.max(0, Math.min(1 - newBbox.w, newBbox.x));
      newBbox.y = Math.max(0, Math.min(1 - newBbox.h, newBbox.y));
      newBbox.w = Math.max(0.02, Math.min(1 - newBbox.x, newBbox.w));
      newBbox.h = Math.max(0.02, Math.min(1 - newBbox.y, newBbox.h));

      // 更新コールバックを呼び出し
      onBboxUpdate?.(dragState.bboxId, newBbox);
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();

      console.debug('[resize-handle] up', { 
        wasResizing: dragState.isResizing,
        wasDragging: dragState.isDragging,
      });

      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, imageDisplayInfo, onBboxUpdate]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full bg-gray-100 rounded-lg overflow-hidden"
      style={{ height: '520px' }}
    >
      {/* 画像とBBoxオーバーレイを同階層に配置 */}
      <div className="relative w-full h-full">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="バナー画像"
          className="block"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        
        {/* BBox オーバーレイ（source==='manual'のみ描画） */}
        {(() => {

          // bbox座標がnormalized(0..1)であることを検証（範囲外のものは除外済み）
          // ここでは警告のみ（AnalysisResultで既に除外されている）

          // 編集レイヤー：source==='manual'または'auto'のみ表示（OCR由来は除外）
          const manualBboxes = bboxes.filter((item) => {
            // source==='manual'または'auto'のみ
            if (item.source !== 'manual' && item.source !== 'auto') {
              return false;
            }
            
            // 座標範囲チェック
            const { bbox } = item;
            const isValid = bbox.x >= 0 && bbox.x <= 1 && bbox.y >= 0 && bbox.y <= 1 &&
                           bbox.w >= 0 && bbox.w <= 1 && bbox.h >= 0 && bbox.h <= 1;
            if (!isValid) {
              console.warn('[BBoxOverlay] 範囲外bboxを除外:', { label: item.label, bbox });
            }
            return isValid;
          });

          return manualBboxes.length > 0 && imageDisplayInfo ? (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
              {manualBboxes.map((item, index) => {
                const { bbox, label, color, id, source } = item;
                const bboxId = id || `bbox-${index}`;
                const isSelected = selectedBboxId === bboxId;
                const isManual = source === 'manual';
                const isAuto = source === 'auto';
                const isEditable = editable && (isManual || isAuto); // autoも編集可能
                
                // 正規化座標（0..1）を表示座標（ピクセル）に変換
                const left = imageDisplayInfo.offsetX + (bbox.x * imageDisplayInfo.renderWidth);
                const top = imageDisplayInfo.offsetY + (bbox.y * imageDisplayInfo.renderHeight);
                const bboxWidth = bbox.w * imageDisplayInfo.renderWidth;
                const bboxHeight = bbox.h * imageDisplayInfo.renderHeight;
                
                // ドラッグ開始ハンドラー（BBox本体）
                const handleBboxPointerDown = isEditable ? (e: React.PointerEvent) => {
                  // リサイズハンドルでない場合のみドラッグ開始
                  if ((e.target as HTMLElement).classList.contains('resize-handle')) {
                    return; // リサイズハンドルのイベントは無視
                  }
                  
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect || !imageDisplayInfo) return;
                  
                  const clientX = e.clientX;
                  const clientY = e.clientY;
                  
                  console.debug('[bbox] drag start', { bboxId });
                  
                  // ドラッグ開始
                  setDragState({
                    isDragging: true,
                    isResizing: false,
                    bboxId,
                    startX: clientX,
                    startY: clientY,
                    startBbox: { ...bbox },
                    resizeHandle: null,
                  });
                  onBboxSelect?.(bboxId);
                  
                  // Pointer capture
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }
                } : undefined;

                // リサイズハンドル用ハンドラー
                const createResizeHandleHandler = (corner: 'nw' | 'ne' | 'sw' | 'se') => {
                  return isEditable ? (e: React.PointerEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.debug('[resize-handle] down', { corner, bboxId });
                    
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect || !imageDisplayInfo) return;
                    
                    const clientX = e.clientX;
                    const clientY = e.clientY;
                    
                    // リサイズ開始
                    setDragState({
                      isDragging: false,
                      isResizing: true,
                      bboxId,
                      startX: clientX,
                      startY: clientY,
                      startBbox: { ...bbox },
                      resizeHandle: corner,
                    });
                    onBboxSelect?.(bboxId);
                    
                    // Pointer capture
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }
                  } : undefined;
                };
                
                return (
                  <div
                    key={bboxId}
                    className={`absolute border-2 ${isEditable ? 'cursor-move' : 'cursor-pointer'} ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${bboxWidth}px`,
                      height: `${bboxHeight}px`,
                      border: isSelected ? '2px solid #3B82F6' : '2px solid #EF4444',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      zIndex: isSelected ? 1001 : 1000,
                      transition: dragState?.bboxId === bboxId ? 'none' : 'all 0.1s',
                      pointerEvents: 'auto',
                    }}
                    onClick={() => !isEditable && onBboxSelect?.(isSelected ? null : bboxId)}
                    onPointerDown={handleBboxPointerDown}
                  >
                    {/* ラベル */}
                    <div
                      className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded pointer-events-none"
                      style={{ backgroundColor: isSelected ? '#3B82F6' : '#EF4444' }}
                    >
                      {label}
                    </div>
                    
                    {/* リサイズハンドル（選択中かつ編集可能な場合のみ） */}
                    {isSelected && isEditable && (
                      <>
                        {/* 四隅のリサイズハンドル */}
                        <div
                          className="resize-handle absolute w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-nw-resize"
                          style={{ 
                            left: -8, 
                            top: -8,
                            pointerEvents: 'auto',
                            zIndex: 1002,
                          }}
                          onPointerDown={createResizeHandleHandler('nw')}
                        />
                        <div
                          className="resize-handle absolute w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-ne-resize"
                          style={{ 
                            right: -8, 
                            top: -8,
                            pointerEvents: 'auto',
                            zIndex: 1002,
                          }}
                          onPointerDown={createResizeHandleHandler('ne')}
                        />
                        <div
                          className="resize-handle absolute w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-sw-resize"
                          style={{ 
                            left: -8, 
                            bottom: -8,
                            pointerEvents: 'auto',
                            zIndex: 1002,
                          }}
                          onPointerDown={createResizeHandleHandler('sw')}
                        />
                        <div
                          className="resize-handle absolute w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-se-resize"
                          style={{ 
                            right: -8, 
                            bottom: -8,
                            pointerEvents: 'auto',
                            zIndex: 1002,
                          }}
                          onPointerDown={createResizeHandleHandler('se')}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null;
        })()}
        
        {/* 手動BBoxが0件の場合の空状態メッセージ */}
        {(() => {
          // 編集可能なBBox（source === 'manual' または 'auto'）をカウント
          const editableBboxCount = bboxes.filter(
            (item) => item.source === 'manual' || item.source === 'auto'
          ).length;
          if (editableBboxCount === 0 && editable) {
            return (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80">
                <div className="text-center text-gray-500">
                  <p className="text-sm">編集できるBBoxがありません。</p>
                  <p className="text-sm">「＋BBox追加」ボタンでBBoxを追加してください。</p>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}
