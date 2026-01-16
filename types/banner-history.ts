/**
 * バナー分析の履歴（画像読み込み以降の状態を保存）
 */

import { Extraction, Aggregation, MarketInsight, StrategyOption, PlanningHook } from './schema';

export interface BannerHistory {
  historyId: string; // 履歴ID（UUID）
  title: string; // 履歴タイトル（自動生成またはユーザー入力）
  currentTab: 'analysis' | 'aggregation' | 'insight' | 'strategy' | 'planning' | 'persona' | 'summary' | 'images'; // 現在のタブ
  createdAt: string; // 作成日時
  updatedAt: string; // 更新日時
  
  // バナー分析のデータ
  banners: Array<{
    id: string;
    extraction: Extraction;
    imageWidth: number;
    imageHeight: number;
    imageAssetId?: string; // ImageAsset.imageId（画像取得用）
  }>;
  selectedId: string | null; // 選択中のバナーID
  
  // 集計・分析データ
  aggregation: Aggregation | null; // Aggregationデータ
  aiMarketInsights: any[]; // C1: 市場インサイト（AI生成）
  aiStrategyOptions: any[]; // C2: 戦略オプション（AI生成）
  aiPlanningHooks: any[]; // D: 企画フック（AI生成）
  fullInsights: MarketInsight[] | null; // 市場インサイト（旧形式）
  strategyOptions: StrategyOption[] | null; // 戦略オプション（旧形式）
  planningHooks: PlanningHook[] | null; // D: 企画フック（旧形式）
  
  // メタデータ
  bannerCount: number; // バナー数（表示用）
  lastTabName: string; // 最後に進んだタブ名（表示用）
}
