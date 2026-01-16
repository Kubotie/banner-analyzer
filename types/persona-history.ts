/**
 * ペルソナ分析の履歴（Extraction以降の状態を保存）
 */

import { ExtractionRecord, Aggregation, Persona, PersonaAxis, PersonaComparison } from './index';

export interface PersonaHistory {
  historyId: string; // 履歴ID（UUID）
  title: string; // 履歴タイトル（自動生成またはユーザー入力）
  currentStep: 'extraction' | 'extraction-review' | 'aggregation' | 'persona-axis' | 'summary' | 'comparison' | 'knowledge-base'; // 現在のステップ
  createdAt: string; // 作成日時
  updatedAt: string; // 更新日時
  
  // Extraction以降のデータ
  extractionRecords: ExtractionRecord[]; // ExtractionRecordリスト
  aggregation: Aggregation | null; // Aggregationデータ
  personas: Persona[]; // Personaデータ
  personaAxes: PersonaAxis[]; // ペルソナ軸
  comparison: PersonaComparison | null; // 比較データ
  
  // メタデータ
  extractionCount: number; // Extraction数（表示用）
  lastStepName: string; // 最後に進んだステップ名（表示用）
}
