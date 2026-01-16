/**
 * ImageAsset（画像アセット）型定義
 */

export interface ImageAsset {
  imageId: string; // UUID
  storageRef: string; // URLまたはfileId
  productId?: string; // 任意
  tags?: string[];
  title?: string;
  notes?: string;
  // リンク状態
  hasExtraction: boolean;
  lastExtractionId?: string;
  // レイアウト状態
  hasManualLayout?: boolean; // 手動レイアウトがあるか
  lastLayoutKbId?: string; // 最新のレイアウトKBアイテムID
  // メタデータ
  createdAt: string; // ISO 8601形式
  updatedAt: string; // ISO 8601形式
  deletedAt?: string; // 論理削除用
}
