/**
 * BBox領域単位のOCR実行ユーティリティ
 * 画像の特定領域を切り出してOCRを実行
 */

import { runOcrOnImage } from './ocr-client';
import { BBox } from '@/types/schema';

/**
 * 画像の特定BBox領域を切り出してOCRを実行
 * @param imageInput - 画像URL、Fileオブジェクト、またはBlob
 * @param bbox - 正規化座標（0..1）のBBox
 * @param imageWidth - 画像の幅（ピクセル）
 * @param imageHeight - 画像の高さ（ピクセル）
 * @returns OCRテキスト（失敗時はnull）
 */
export async function runOcrOnBbox(
  imageInput: string | File | Blob,
  bbox: BBox,
  imageWidth: number,
  imageHeight: number
): Promise<string | null> {
  try {
    // blob URL文字列の場合は警告（File/Blobを使うべき）
    if (typeof imageInput === 'string' && imageInput.startsWith('blob:')) {
      console.warn('[BBox OCR] blob URLが渡されました。File/Blobオブジェクトを使用することを推奨します。', {
        imageInputPreview: imageInput.slice(0, 50),
      });
      // 警告を出すが、処理は続行（保険として動作させる）
    }
    
    // 正規化座標をピクセル座標に変換
    const pxX = Math.floor(bbox.x * imageWidth);
    const pxY = Math.floor(bbox.y * imageHeight);
    const pxW = Math.floor(bbox.w * imageWidth);
    const pxH = Math.floor(bbox.h * imageHeight);
    
    // 画像を読み込んでBBox領域を切り出す
    const img = new Image();
    let objectUrl: string | null = null;
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          // Canvasを作成（BBox領域のサイズ）
          const canvas = document.createElement('canvas');
          canvas.width = pxW;
          canvas.height = pxH;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            reject(new Error('Canvas context取得失敗'));
            return;
          }
          
          // BBox領域をCanvasに描画
          ctx.drawImage(
            img,
            pxX, pxY, pxW, pxH, // ソース領域
            0, 0, pxW, pxH      // 描画先領域
          );
          
          // ② BBox切り出し直後のサイズログ（重要）
          console.debug('[BBox OCR] crop size', {
            x: pxX,
            y: pxY,
            w: pxW,
            h: pxH,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
          });
          
          // CanvasをBlobに変換
          canvas.toBlob(async (blob) => {
            // objectUrlをクリーンアップ（メモリリーク防止）
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
            }
            
            if (!blob) {
              reject(new Error('Blob変換失敗'));
              return;
            }
            
            try {
              // OCR実行（切り出した画像に対して）
              // Blobを直接渡す（prepareImageBlobでobjectURL化される）
              console.debug('[BBox OCR] OCR実行開始', {
                blobSize: blob.size,
                blobType: blob.type,
                bboxSize: { width: pxW, height: pxH },
              });
              const ocrResults = await runOcrOnImage(blob, pxW, pxH);
              
              // テキストを結合（行単位）
              const text = ocrResults
                .map((result) => result.text)
                .filter((t) => t.trim().length > 0)
                .join(' ');
              
              resolve(text || null);
            } catch (ocrError) {
              console.warn('[BBox OCR] OCR失敗:', ocrError);
              resolve(null); // 失敗時はnullを返す（エラーで全体を落とさない）
            }
          }, 'image/png');
        } catch (error) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          console.warn('[BBox OCR] 画像処理エラー:', error);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        console.warn('[BBox OCR] 画像読み込みエラー');
        resolve(null);
      };
      
      // 画像ソースを設定（Blob/Fileの場合はobjectURL化）
      if (typeof imageInput === 'string') {
        // stringの場合: dataURL / http(s) URL / blob URL
        img.crossOrigin = 'anonymous';
        img.src = imageInput;
      } else {
        // File または Blob の場合: objectURL化
        objectUrl = URL.createObjectURL(imageInput);
        img.src = objectUrl;
      }
    });
  } catch (error) {
    console.warn('[BBox OCR] エラー:', error);
    return null;
  }
}
