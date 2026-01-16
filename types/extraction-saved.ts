/**
 * 保存済みExtraction型定義
 */

import { ExtractionRecord } from './index';

export interface SavedExtraction {
  extractionId: string; // UUID
  title: string;
  productId?: string; // 任意（ペルソナは必須、バナーは任意）
  extractionRecords: ExtractionRecord[]; // 確定済みExtraction
  source: 'interview' | 'banner' | 'other';
  tags?: string[];
  notes?: string;
  createdAt: string; // ISO 8601形式
  updatedAt: string; // ISO 8601形式
  deletedAt?: string; // 論理削除用
}
