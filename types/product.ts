/**
 * Product（サービス・製品）型定義
 */

export interface Competitor {
  name: string;
  url?: string;
  notes?: string;
}

export interface Product {
  productId: string; // UUID
  name: string; // 必須
  category?: string;
  description?: string;
  competitors?: Competitor[];
  createdAt: string; // ISO 8601形式
  updatedAt: string; // ISO 8601形式
  deletedAt?: string; // 論理削除用
}
