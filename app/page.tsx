'use client';

import { useState, useCallback } from 'react';
import ImageUpload from '@/components/ImageUpload';
import ImageList from '@/components/ImageList';
import AnalysisResult from '@/components/AnalysisResult';
import AggregationView from '@/components/AggregationView';
import MarketInsightView from '@/components/MarketInsightView';
import StrategyOptionsView from '@/components/StrategyOptionsView';
import PlanningHooksView from '@/components/PlanningHooksView';
import PersonaView from '@/components/PersonaView';
import { Extraction, Aggregation, Persona, MarketInsight, StrategyOption, PlanningHook } from '@/types/schema';
import {
  generateDummyExtraction,
  generateDummyAggregation,
  generateFullInsights,
} from '@/lib/dummy-data';
import {
  generateDemoExtractions,
  generateDemoPersonas,
  generateDemoMarketInsights,
} from '@/lib/demo-data';
import { generateStrategyOptions, generatePlanningHooks } from '@/lib/insights';
import { getImageSize } from '@/lib/image-utils';

interface Banner {
  id: string;
  imageUrl: string;
  extraction: Extraction;
  imageWidth: number;
  imageHeight: number;
}

export default function Home() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ appealAxis?: string; component?: string }>({});
  const [aggregationFilters, setAggregationFilters] = useState<{
    appealAxis?: string;
    component?: string;
    brand?: string;
  }>({});
  const [activeTab, setActiveTab] = useState<
    'analysis' | 'aggregation' | 'insight' | 'strategy' | 'planning' | 'persona'
  >('analysis');
  const [highlightedBannerIds, setHighlightedBannerIds] = useState<Set<string>>(new Set());
  const [selectedInsightIndex, setSelectedInsightIndex] = useState<number | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  const handleUpload = useCallback(async (files: File[]) => {
    const newBanners: Banner[] = await Promise.all(
      files.map(async (file, index) => {
        const imageUrl = URL.createObjectURL(file);
        const bannerId = `banner_${Date.now()}_${index}`;
        
        // 画像サイズを取得
        const { width, height } = await getImageSize(imageUrl);

        const extraction = generateDummyExtraction(bannerId, imageUrl);

        return {
          id: bannerId,
          imageUrl,
          extraction,
          imageWidth: width,
          imageHeight: height,
        };
      })
    );

    setBanners((prev) => [...prev, ...newBanners]);
    if (newBanners.length > 0 && !selectedId) {
      setSelectedId(newBanners[0].id);
    }
  }, [selectedId]);

  const selectedBanner = banners.find((b) => b.id === selectedId);

  // デモモードのデータを生成
  const [demoFullData, setDemoFullData] = useState<{
    personas: Persona[];
    marketInsights: MarketInsight[];
    strategyOptions: StrategyOption[];
    planningHooks: PlanningHook[];
    aggregation: Aggregation;
  } | null>(null);

  const loadDemoData = useCallback(() => {
    const demoExtractions = generateDemoExtractions();
    const demoPersonas = generateDemoPersonas();
    const demoAggregation = generateDummyAggregation(demoExtractions);
    const demoMarketInsights = generateDemoMarketInsights(demoAggregation, demoPersonas);
    const demoStrategyOptions = generateStrategyOptions(demoMarketInsights, demoAggregation, demoPersonas);
    const demoPlanningHooks = generatePlanningHooks(demoStrategyOptions, demoMarketInsights, demoPersonas);

    // デモ用のバナー画像URL（ダミー）
    const demoBanners: Banner[] = demoExtractions.map((ext, idx) => ({
      id: ext.banner_id,
      imageUrl: `https://via.placeholder.com/800x600/4A90E2/FFFFFF?text=Demo+Banner+${idx + 1}`,
      extraction: ext,
      imageWidth: 800,
      imageHeight: 600,
    }));

    setBanners(demoBanners);
    if (demoBanners.length > 0) {
      setSelectedId(demoBanners[0].id);
    }
    setDemoMode(true);

    const data = {
      personas: demoPersonas,
      marketInsights: demoMarketInsights,
      strategyOptions: demoStrategyOptions,
      planningHooks: demoPlanningHooks,
      aggregation: demoAggregation,
    };
    setDemoFullData(data);
    return data;
  }, []);

  // 集計データ（B）とC1, C2, Dを生成
  const aggregation = demoMode && demoFullData
    ? demoFullData.aggregation
    : banners.length > 0
    ? generateDummyAggregation(banners.map((b) => b.extraction))
    : null;
  
  const fullInsights = demoMode && demoFullData
    ? {
        personas: demoFullData.personas,
        marketInsights: demoFullData.marketInsights,
        strategyOptions: demoFullData.strategyOptions,
        planningHooks: demoFullData.planningHooks,
      }
    : aggregation && banners.length > 0
    ? generateFullInsights(banners.map((b) => b.extraction), aggregation)
    : null;

  const handleExport = () => {
    if (banners.length === 0) return;

    const exportData = {
      extractions: banners.map((b) => b.extraction), // A
      aggregation: aggregation, // B
      // C1, C2, D は必要に応じて追加可能
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banner-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">競合バナー分析アプリ</h1>
        <div className="flex items-center gap-4">
          {banners.length === 0 && (
            <button
              onClick={loadDemoData}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              デモデータを読み込む
            </button>
          )}
          {banners.length > 0 && (
            <>
              {demoMode && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
                  デモモード
                </span>
              )}
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                エクスポート (A/B JSON)
              </button>
            </>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      {banners.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <ImageUpload onUpload={handleUpload} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* 左サイドバー: 画像一覧 + フィルタ */}
          <div className="w-80 bg-white border-r flex flex-col">
            <ImageList
              banners={banners}
              selectedId={selectedId}
              onSelect={setSelectedId}
              filters={filters}
              onFilterChange={setFilters}
              highlightedBannerIds={highlightedBannerIds}
            />
          </div>

          {/* 右側: 分析結果 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* タブ */}
            <div className="bg-white border-b flex overflow-x-auto">
              <button
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'analysis'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('analysis')}
              >
                個別分析 (A)
              </button>
              <button
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'aggregation'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('aggregation')}
              >
                集計 (B)
              </button>
              <button
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'insight'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('insight')}
              >
                市場インサイト (C1)
              </button>
              <button
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'strategy'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('strategy')}
              >
                戦略オプション (C2)
              </button>
              <button
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'planning'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('planning')}
              >
                企画フック (D)
              </button>
              <button
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'persona'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('persona')}
              >
                ペルソナ
              </button>
            </div>

            {/* タブコンテンツ */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'analysis' && selectedBanner ? (
                <AnalysisResult
                  extraction={selectedBanner.extraction}
                  imageUrl={selectedBanner.imageUrl}
                  imageWidth={selectedBanner.imageWidth}
                  imageHeight={selectedBanner.imageHeight}
                />
              ) : activeTab === 'aggregation' && aggregation ? (
                <div className="h-full overflow-y-auto p-6">
                  <h2 className="text-xl font-bold mb-4">集計結果 (Aggregation B)</h2>
                  <AggregationView
                    aggregation={aggregation}
                    filters={aggregationFilters}
                    onFilterChange={setAggregationFilters}
                  />
                </div>
              ) : activeTab === 'insight' && fullInsights ? (
                <div className="h-full overflow-y-auto p-6">
                  <h2 className="text-xl font-bold mb-4">市場インサイト (Market Insight C1)</h2>
                  <MarketInsightView
                    insights={fullInsights.marketInsights}
                    onHighlightBanners={(bannerIds) =>
                      setHighlightedBannerIds(new Set(bannerIds))
                    }
                    highlightedBannerIds={highlightedBannerIds}
                    personas={fullInsights.personas}
                    onNavigateToPersona={(personaId) => {
                      setActiveTab('persona');
                      // スクロール位置を調整（必要に応じて）
                    }}
                  />
                </div>
              ) : activeTab === 'persona' && fullInsights ? (
                <div className="h-full overflow-y-auto p-6">
                  <h2 className="text-xl font-bold mb-4">ペルソナ</h2>
                  <PersonaView
                    personas={fullInsights.personas}
                    marketInsights={fullInsights.marketInsights}
                    onNavigateToInsight={(insightIndex) => {
                      setSelectedInsightIndex(insightIndex);
                      setActiveTab('insight');
                    }}
                  />
                </div>
              ) : activeTab === 'strategy' && fullInsights ? (
                <div className="h-full overflow-y-auto p-6">
                  <h2 className="text-xl font-bold mb-4">戦略オプション (Strategy Options C2)</h2>
                  <StrategyOptionsView
                    options={fullInsights.strategyOptions}
                    personas={fullInsights.personas}
                  />
                </div>
              ) : activeTab === 'planning' && fullInsights ? (
                <div className="h-full overflow-y-auto p-6">
                  <h2 className="text-xl font-bold mb-4">企画フック (Planning Hooks D)</h2>
                  <PlanningHooksView hooks={fullInsights.planningHooks} />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  {activeTab === 'analysis'
                    ? '画像を選択してください'
                    : '分析結果がありません'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
