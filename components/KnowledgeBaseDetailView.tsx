'use client';

import { KnowledgeBase, KB_Banner, KB_Insight, KB_Report } from '@/types/schema';
import AnalysisResult from './AnalysisResult';
import AggregationView from './AggregationView';
import MarketInsightView from './MarketInsightView';
import { MarketInsight } from '@/types/schema';

interface KnowledgeBaseDetailViewProps {
  kb: KnowledgeBase;
  onNavigateToBanner?: (bannerId: string) => void;
  onNavigateToInsight?: (insightIndex: number) => void;
}

export default function KnowledgeBaseDetailView({
  kb,
  onNavigateToBanner,
  onNavigateToInsight,
}: KnowledgeBaseDetailViewProps) {
  // KB-Bannerの場合
  if (kb.type === 'banner' && kb.data.type === 'banner') {
    const kbBanner = kb.data as KB_Banner;
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">{kb.name}</h2>
          <div className="text-sm text-gray-600">
            保存日時: {new Date(kb.created_at).toLocaleString('ja-JP')}
          </div>
        </div>
        {kbBanner.image_url && (
          <div className="mb-4">
            <img
              src={kbBanner.image_url}
              alt={kbBanner.banner_id}
              className="max-w-full h-auto rounded border"
            />
          </div>
        )}
        <AnalysisResult
          extraction={kbBanner.extraction}
          imageUrl={kbBanner.image_url || ''}
          imageWidth={800}
          imageHeight={600}
        />
      </div>
    );
  }

  // KB-Insightの場合
  if (kb.type === 'insight' && kb.data.type === 'insight') {
    const kbInsight = kb.data as KB_Insight;
    // KB_InsightをMarketInsight形式に変換
    const marketInsight: MarketInsight = {
      persona_assumption: kbInsight.persona_premise,
      competitor_choice: {
        choice: kbInsight.observed_facts.choice,
        evidence: kbInsight.observed_facts.evidence,
        bbox_references: kbInsight.observed_facts.bbox_references,
      },
      rationality_hypothesis: kbInsight.rationale_hypothesis,
      taken_for_granted_risk: kbInsight.market_constraints,
      supporting_banners: kbInsight.evidence_links.target_banner_ids,
      category: kbInsight.category,
      persona_relevance: kbInsight.persona_relevance || [],
      planning_hooks: kbInsight.planning_hooks,
    };

    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">{kb.name}</h2>
          <div className="text-sm text-gray-600">
            保存日時: {new Date(kb.created_at).toLocaleString('ja-JP')}
          </div>
        </div>
        <MarketInsightView
          insights={[marketInsight]}
          onHighlightBanners={() => {}}
          highlightedBannerIds={new Set()}
          onNavigateToPersona={() => {}}
        />
      </div>
    );
  }

  // KB-Reportの場合
  if (kb.type === 'report' && kb.data.type === 'report') {
    const kbReport = kb.data as KB_Report;
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">{kb.name}</h2>
          <div className="text-sm text-gray-600">
            保存日時: {new Date(kb.created_at).toLocaleString('ja-JP')}
            <br />
            バナー数: {kbReport.total_banners}件
          </div>
        </div>
        <AggregationView
          aggregation={kbReport.aggregation}
          filters={{}}
          onFilterChange={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="text-center text-gray-500 py-8">
        このナレッジの詳細を表示できません
      </div>
    </div>
  );
}
