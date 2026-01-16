import { KnowledgeBase, KB_Banner, KB_Insight, KB_Report, Extraction, MarketInsight, Aggregation } from '@/types/schema';

/**
 * ナレッジベースのストレージ管理
 * ローカルストレージを使用（MVP）
 */
const STORAGE_KEY = 'banner-analyzer-knowledge-base';

/**
 * ナレッジベース一覧を取得
 */
export function getKnowledgeBaseList(): KnowledgeBase[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load knowledge base:', error);
    return [];
  }
}

/**
 * ナレッジベースを保存
 */
export function saveKnowledgeBase(kb: KnowledgeBase): void {
  if (typeof window === 'undefined') return;
  
  try {
    const list = getKnowledgeBaseList();
    const existingIndex = list.findIndex((item) => item.id === kb.id);
    
    if (existingIndex >= 0) {
      // 既存のナレッジを更新
      list[existingIndex] = kb;
    } else {
      // 新規追加
      list.push(kb);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Failed to save knowledge base:', error);
  }
}

/**
 * ナレッジベースを削除
 */
export function deleteKnowledgeBase(kbId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const list = getKnowledgeBaseList();
    const filtered = list.filter((item) => item.id !== kbId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete knowledge base:', error);
  }
}

/**
 * KB-Bannerを保存
 */
export function saveBannerAsKB(
  extraction: Extraction,
  imageUrl?: string,
  folderPath: string = 'My Files/Banners'
): KnowledgeBase {
  const kbId = `KB-Banner-${Date.now()}`;
  const now = new Date().toISOString();
  
  const kb: KnowledgeBase = {
    id: kbId,
    name: `バナー: ${extraction.banner_id}`,
    type: 'banner',
    owner: 'user',
    shared: false,
    folder_path: folderPath,
    created_at: now,
    updated_at: now,
    source_project_id: undefined,
    data: {
      type: 'banner',
      banner_id: extraction.banner_id,
      extraction,
      image_url: imageUrl,
    } as KB_Banner,
  };
  
  saveKnowledgeBase(kb);
  return kb;
}

/**
 * KB-Insightを保存
 */
export function saveInsightAsKB(
  insight: MarketInsight,
  folderPath: string = 'My Files/Insights'
): KnowledgeBase {
  const kbId = `KB-Insight-${Date.now()}`;
  const now = new Date().toISOString();
  
  // Market InsightからKB-Insight形式に変換
  const kbInsight: KB_Insight = {
    type: 'insight',
    insight_id: kbId,
    title: `${insight.competitor_choice.choice}に関するインサイト`,
    persona_premise: insight.persona_assumption,
    observed_facts: {
      choice: insight.competitor_choice.choice,
      evidence: insight.competitor_choice.evidence,
      bbox_references: insight.competitor_choice.bbox_references,
    },
    rationale_hypothesis: insight.rationality_hypothesis,
    market_constraints: insight.taken_for_granted_risk,
    planning_hooks: insight.planning_hooks,
    evidence_links: {
      target_banner_ids: insight.supporting_banners,
      target_bboxes: insight.competitor_choice.bbox_references,
    },
    category: insight.category,
    persona_relevance: insight.persona_relevance,
    created_at: now,
    updated_at: now,
    source_project_id: undefined,
  };
  
  const kb: KnowledgeBase = {
    id: kbId,
    name: `インサイト: ${insight.competitor_choice.choice}`,
    type: 'insight',
    owner: 'user',
    shared: false,
    folder_path: folderPath,
    created_at: now,
    updated_at: now,
    source_project_id: undefined,
    data: kbInsight,
  };
  
  saveKnowledgeBase(kb);
  return kb;
}

/**
 * KB-Reportを保存
 */
export function saveReportAsKB(
  aggregation: Aggregation,
  totalBanners: number,
  folderPath: string = 'My Files/Reports'
): KnowledgeBase {
  const kbId = `KB-Report-${Date.now()}`;
  const now = new Date().toISOString();
  
  const kbReport: KB_Report = {
    type: 'report',
    report_id: kbId,
    title: `集計レポート: ${totalBanners}件のバナー`,
    aggregation,
    total_banners: totalBanners,
    created_at: now,
    updated_at: now,
    source_project_id: undefined,
  };
  
  const kb: KnowledgeBase = {
    id: kbId,
    name: `レポート: ${totalBanners}件のバナー`,
    type: 'report',
    owner: 'user',
    shared: false,
    folder_path: folderPath,
    created_at: now,
    updated_at: now,
    source_project_id: undefined,
    data: kbReport,
  };
  
  saveKnowledgeBase(kb);
  return kb;
}

/**
 * ナレッジベースを検索
 */
export function searchKnowledgeBase(query: string): KnowledgeBase[] {
  const list = getKnowledgeBaseList();
  if (!query.trim()) return list;
  
  const lowerQuery = query.toLowerCase();
  return list.filter((kb) => kb.name.toLowerCase().includes(lowerQuery));
}

/**
 * フォルダ階層でフィルタ
 */
export function filterByFolder(folderPath: string): KnowledgeBase[] {
  const list = getKnowledgeBaseList();
  if (!folderPath) return list;
  
  return list.filter((kb) => kb.folder_path === folderPath);
}

/**
 * 種別でフィルタ
 */
export function filterByType(type: 'banner' | 'insight' | 'report'): KnowledgeBase[] {
  const list = getKnowledgeBaseList();
  return list.filter((kb) => kb.type === type);
}
