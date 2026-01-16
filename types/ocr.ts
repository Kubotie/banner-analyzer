/**
 * OCR結果の型定義
 */
export interface OCRResult {
  id: string; // OCR結果ID（例: "ocr_001"）
  text: string; // 抽出されたテキスト
  bbox: {
    x: number; // 左上のx座標（normalized 0..1）
    y: number; // 左上のy座標（normalized 0..1）
    w: number; // 幅（normalized 0..1）
    h: number; // 高さ（normalized 0..1）
    coord: 'normalized'; // 座標系を明示
  };
  confidence: number; // 信頼度（0.0-1.0）
}
