/**
 * クライアントサイドOCR実行ユーティリティ（MVP）
 * 画像全体に対してOCRを実行し、正規化座標（0..1）で結果を返す
 */

import { OCRResult } from '@/types/ocr';

/**
 * 画像をCanvas→Blobに変換してTesseractに渡す（安定化）
 * @param imageInput - 画像URL、Fileオブジェクト、またはBlob
 * @returns { blob: Blob, naturalWidth: number, naturalHeight: number }
 */
async function prepareImageBlob(imageInput: string | File | Blob): Promise<{
  blob: Blob;
  naturalWidth: number;
  naturalHeight: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        console.debug('[OCR] 画像読み込み完了:', {
          naturalWidth,
          naturalHeight,
        });

        // Canvasを作成（画像と同じサイズ）
        const canvas = document.createElement('canvas');
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas context取得失敗');
        }

        // 画像をCanvasに描画
        ctx.drawImage(img, 0, 0);
        console.debug('[OCR] Canvas描画完了:', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        });

        // CanvasをBlobに変換
        canvas.toBlob((blob) => {
          // objectUrlをクリーンアップ（メモリリーク防止）
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }

          if (!blob) {
            reject(new Error('Canvas→Blob変換失敗'));
            return;
          }

          console.debug('[OCR] Canvas→Blob変換完了:', {
            blobSize: blob.size,
            blobType: blob.type,
          });

          resolve({
            blob,
            naturalWidth,
            naturalHeight,
          });
        }, 'image/png'); // PNG形式でBlob化
      } catch (error) {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        reject(error);
      }
    };

    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('画像読み込みエラー: img.onerror'));
    };

    // 画像ソースを設定（BlobもURL.createObjectURLで処理）
    if (typeof imageInput === 'string') {
      // stringの場合: dataURL / http(s) URL
      img.crossOrigin = 'anonymous'; // CORS対応
      img.src = imageInput;
    } else {
      // File または Blob の場合: objectURL化
      objectUrl = URL.createObjectURL(imageInput);
      img.src = objectUrl;
    }
  });
}

/**
 * 画像に対してOCRを実行（Canvas→Blob方式で安定化）
 * @param imageInput - 画像URL、Fileオブジェクト、またはBlob
 * @param imageWidth - 画像の幅（ピクセル、参考値。実際はnaturalWidthを使用）
 * @param imageHeight - 画像の高さ（ピクセル、参考値。実際はnaturalHeightを使用）
 * @returns OCR結果の配列（正規化座標）
 */
export async function runOcrOnImage(
  imageInput: string | File | Blob,
  imageWidth: number,
  imageHeight: number
): Promise<OCRResult[]> {
  // ① 再解析時のOCR入力タイプのログ（最重要）
  const inputType = typeof imageInput === 'string' 
    ? 'string' 
    : imageInput instanceof File 
    ? 'File' 
    : imageInput instanceof Blob 
    ? 'Blob' 
    : 'unknown';
  console.debug('[BBox OCR] inputType', inputType, imageInput);
  
  // 入力情報のデバッグログ（inputTypeを正確に判定）
  console.debug('[OCR] 実行開始:', {
    inputType,
    providedSize: { width: imageWidth, height: imageHeight },
    ...(imageInput instanceof File ? {
      fileName: imageInput.name,
      fileSize: imageInput.size,
      fileType: imageInput.type,
    } : imageInput instanceof Blob ? {
      blobSize: imageInput.size,
      blobType: imageInput.type,
    } : {}),
  });

  let worker: any = null;
  let imageBlob: Blob | null = null;
  let actualImageWidth = imageWidth;
  let actualImageHeight = imageHeight;

  try {
    // 画像をCanvas→Blobに変換
    console.debug('[OCR] 画像をCanvas→Blobに変換中...');
    const { blob, naturalWidth, naturalHeight } = await prepareImageBlob(imageInput);
    imageBlob = blob;
    actualImageWidth = naturalWidth;
    actualImageHeight = naturalHeight;
    console.debug('[OCR] 画像準備完了:', {
      naturalWidth: actualImageWidth,
      naturalHeight: actualImageHeight,
      blobSize: blob.size,
      blobType: blob.type,
    });

    // Tesseract.jsを動的インポート
    const Tesseract = await import('tesseract.js');
    const { createWorker } = Tesseract;
    
    // バージョン情報をログに出力
    const tesseractVersion = (Tesseract as any).version || 'unknown';
    console.debug('[OCR] Tesseract.jsバージョン:', tesseractVersion);
    console.debug('[OCR] package.jsonバージョン: ^7.0.0');
    
    // Tesseract.jsのWASM内部警告を一時的に抑制（開発環境のみ）
    // 注意: これらの警告は機能に影響しませんが、コンソールが汚れます
    const originalConsoleWarn = console.warn;
    const suppressTesseractWarnings = () => {
      console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        // "Parameter not found"警告を抑制（Tesseract.jsのWASM内部警告）
        if (message.includes('Parameter not found:') || 
            message.includes('tesseract-core') ||
            message.includes('wasm.js')) {
          return; // 警告を無視
        }
        // その他の警告は通常通り表示
        originalConsoleWarn.apply(console, args);
      };
    };
    const restoreConsoleWarn = () => {
      console.warn = originalConsoleWarn;
    };
    
    // 警告抑制を有効化
    suppressTesseractWarnings();
    
    console.debug('[OCR] Worker作成中...', {
      tesseractVersion,
    });
    
    try {
      // createWorkerを明示的に初期化（日本語対応）
      // tesseract.js 5.0.0以降では、createWorkerの引数で言語を指定
      // 形式: createWorker(lang, oem)
      // lang: 'jpn+eng' (日本語+英語)
      // oem: 1 (LSTM OCR Engine Mode)
      console.debug('[OCR] Worker作成中... (jpn+eng, OEM=1)');
      worker = await createWorker('jpn+eng', 1);
      console.debug('[OCR] Worker作成完了 (jpn+eng, OEM=1)');
      // ここで必ず確認ログ（重要）
      console.debug('[OCR] initialized langs:', 'jpn+eng');
      
      // Worker APIの存在チェック
      console.debug('[OCR] Worker API確認:', {
        hasRecognize: typeof worker.recognize === 'function',
        hasTerminate: typeof worker.terminate === 'function',
      });
      
      // OCRを実行（Blobを渡す）- jpn+engで実行
      console.debug('[OCR] 画像認識実行中... (jpn+eng, Blob使用)');
      const { data } = await worker.recognize(imageBlob);
      console.debug('[OCR] 画像認識完了 (jpn+eng)');
      
      // 警告抑制を解除（OCR処理完了後）
      restoreConsoleWarn();
      
      // デバッグログ: dataの構造を確認
      const dataKeys = Object.keys(data);
      const rawText = data.text || '';
      const wordsCount = data.words?.length || 0;
      const linesCount = data.lines?.length || 0;
      const textLength = rawText.length;
      const textTrimmedLength = rawText.trim().length;
      
      console.debug('[OCR] Tesseract raw出力（構造確認）:', {
        dataKeys,
        textSlice: rawText.substring(0, 200),
        textLength,
        textTrimmedLength,
        wordsLength: wordsCount,
        linesLength: linesCount,
        symbolsLength: data.symbols?.length || 0,
        paragraphsLength: data.paragraphs?.length || 0,
        blocksLength: data.blocks?.length || 0,
      });

      // OCR成功判定をtext依存に変更（words/linesに依存しない）
      const isOcrSuccess = textTrimmedLength > 0;
      
      if (!isOcrSuccess) {
        console.warn('[OCR] ⚠️ OCR失敗: textが空です:', {
          inputType,
          ...(imageInput instanceof File ? {
            fileName: imageInput.name,
            fileSize: imageInput.size,
            fileType: imageInput.type,
          } : {}),
          actualImageSize: { width: actualImageWidth, height: actualImageHeight },
          blobInfo: {
            blobSize: imageBlob.size,
            blobType: imageBlob.type,
          },
          tesseractRaw: {
            dataKeys,
            text: rawText,
            textLength,
            wordsLength: wordsCount,
            linesLength: linesCount,
          },
        });
        // textが空の場合は空配列を返す
        return [];
      }

      console.debug('[OCR] ✅ OCR成功: textが取得できました。textLength:', textTrimmedLength);

      // OCRResult生成: 行単位で生成し、bboxは暫定で全体(0,0,1,1)に固定（MVP）
      // data.textを行分割して使用（words/linesは使用しない）
      console.debug('[OCR] textを行単位でOCRResult生成中（MVP: 行単位、bbox全体固定）...');
      
      // テキストを行分割（改行で分割）
      const textLines = rawText.trim().split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      
      // ノイズ除去関数
      const cleanedLines = textLines
        // 前後空白と連続スペースを正規化
        .map(line => line.replace(/\s+/g, ' ').trim())
        // 1〜2文字の行を除外
        .filter(line => line.length > 2)
        // 記号比率が高い行を除外（英数字/日本語より記号が多い）
        .filter(line => {
          const symbolCount = (line.match(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
          const alphanumericCount = (line.match(/[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
          // 記号が英数字/日本語より多い場合は除外
          return symbolCount < alphanumericCount;
        })
        // 同一行を重複排除（大文字小文字を区別）
        .filter((line, index, array) => array.indexOf(line) === index);
      
      console.debug('[OCR] ノイズ除去:', {
        元の行数: textLines.length,
        ノイズ除去後: cleanedLines.length,
        除外された行数: textLines.length - cleanedLines.length,
        除外された行: textLines.filter((line, i) => {
          const cleaned = line.replace(/\s+/g, ' ').trim();
          return cleaned.length <= 2 || !cleanedLines.includes(cleaned.replace(/\s+/g, ' ').trim());
        }),
      });
      
      // 行単位でOCRResultを生成（bboxは全体固定）
      const ocrResults: OCRResult[] = cleanedLines.map((lineText, idx) => {
        return {
          id: `ocr_line_${idx + 1}`,
          text: lineText,
          bbox: {
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            coord: 'normalized' as const,
          },
          confidence: 0.4, // 暫定値（MVP）
        };
      });
      
      // デバッグログ
      console.debug(`[OCR] OCRResult生成完了: ${ocrResults.length}件`);
      if (ocrResults.length > 0) {
        // bboxが全体でない場合のみレンジを計算
        const validBboxes = ocrResults.filter(r => !(r.bbox.x === 0 && r.bbox.y === 0 && r.bbox.w === 1 && r.bbox.h === 1));
        if (validBboxes.length > 0) {
          const xValues = validBboxes.map(r => r.bbox.x);
          const yValues = validBboxes.map(r => r.bbox.y);
          console.debug(`[OCR] bboxレンジ: x=[${Math.min(...xValues).toFixed(3)}, ${Math.max(...xValues).toFixed(3)}], y=[${Math.min(...yValues).toFixed(3)}, ${Math.max(...yValues).toFixed(3)}]`);
        } else {
          console.debug('[OCR] すべてのbboxが全体（text-onlyモード）です');
        }
        
        // 先頭3件のサマリをログ
        console.debug('[OCR] 先頭3件のサマリ:', ocrResults.slice(0, 3).map((r, idx) => ({
          id: r.id,
          text: r.text.substring(0, 30),
          bbox: { x: r.bbox.x, y: r.bbox.y, w: r.bbox.w, h: r.bbox.h },
          confidence: r.confidence,
        })));
      } else {
        console.warn('[OCR] ⚠️ OCRResult生成後も0件です:', {
          hasText: !!rawText && rawText.trim().length > 0,
          textLength: textLength,
          wordsLength: wordsCount,
          linesLength: linesCount,
          rawTextPreview: rawText.substring(0, 100),
        });
      }
      
      // Worker終了（API存在チェック付き）
      if (worker && typeof worker.terminate === 'function') {
        await worker.terminate().catch((e) => {
          console.warn('[OCR] Worker終了時にエラー（無視）:', e);
        });
      }
      worker = null;
      // 警告抑制を解除
      restoreConsoleWarn();
      return ocrResults;
    } catch (ocrError) {
      // 警告抑制を解除（エラー時も確実に復元）
      restoreConsoleWarn();
      console.error('[OCR] 認識処理エラー:', {
        error: ocrError instanceof Error ? ocrError.message : String(ocrError),
        stack: ocrError instanceof Error ? ocrError.stack : undefined,
        inputType,
        actualImageSize: { width: actualImageWidth, height: actualImageHeight },
        ...(imageInput instanceof File ? {
          fileName: imageInput.name,
          fileSize: imageInput.size,
          fileType: imageInput.type,
        } : {}),
      });
      if (worker && typeof worker.terminate === 'function') {
        await worker.terminate().catch((e) => {
          console.warn('[OCR] Worker終了時にエラー（無視）:', e);
        });
      }
      throw ocrError;
    }
  } catch (error) {
    // 警告抑制を解除（エラー時も確実に復元）
    restoreConsoleWarn();
    console.error('[OCR] 実行エラー（詳細）:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      inputType,
      actualImageSize: { width: actualImageWidth, height: actualImageHeight },
      ...(imageInput instanceof File ? {
        fileName: imageInput.name,
        fileSize: imageInput.size,
        fileType: imageInput.type,
      } : {}),
    });
    if (worker && typeof worker.terminate === 'function') {
      try {
        await worker.terminate();
      } catch (terminateError) {
        console.warn('[OCR] Worker終了時にエラー（無視）:', terminateError);
      }
    }
    throw error;
  }
}
