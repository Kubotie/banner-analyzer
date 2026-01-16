'use client';

import { useEffect, useState } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import UnifiedLayout from '@/components/UnifiedLayout';
import RightStepNav, { StepType } from '@/components/RightStepNav';
import InputScreen from '@/components/screens/InputScreen';
import ExtractionScreen from '@/components/screens/ExtractionScreen';
import AggregationScreen from '@/components/screens/AggregationScreen';
import PersonaAxisScreen from '@/components/screens/PersonaAxisScreen';
import PersonaScreen from '@/components/screens/PersonaScreen';
import SummaryScreen from '@/components/screens/SummaryScreen';
import ComparisonScreen from '@/components/screens/ComparisonScreen';
import KBView from '@/components/KBView';
import KBDetailView from '@/components/KBDetailView';

/**
 * ペルソナ登録・更新・AI分析ページ
 * /personas（/persona-appの置き換え）
 */
export default function PersonasPage() {
  const { currentStep, setCurrentStep } = usePersonaStore();
  const [selectedKBItem, setSelectedKBItem] = useState<any>(null);

  // デフォルトステップを設定
  useEffect(() => {
    if (!currentStep) {
      setCurrentStep('input');
    }
  }, [currentStep, setCurrentStep]);

  // ステップクリックハンドラー（右ナビから）
  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId as any);
  };

  // ステップIDをcurrentStepから取得（右ナビ表示用）
  const getCurrentStepId = (): string | undefined => {
    if (!currentStep) return 'input';
    // extraction-review は extraction として扱う
    if (currentStep === 'extraction-review') return 'extraction';
    // knowledge-base は右ナビに表示されない
    if (currentStep === 'knowledge-base') return undefined;
    return currentStep;
  };

  return (
    <UnifiedLayout
      stepType="persona"
      currentStepId={getCurrentStepId()}
      onStepClick={handleStepClick}
    >
      <div className="h-full overflow-y-auto p-6">
        {currentStep === 'input' && <InputScreen />}
        {(currentStep === 'extraction' || currentStep === 'extraction-review') && <ExtractionScreen />}
        {currentStep === 'aggregation' && <AggregationScreen />}
        {currentStep === 'persona-axis' && <PersonaAxisScreen />}
        {currentStep === 'summary' && <PersonaScreen />}
        {currentStep === 'comparison' && <ComparisonScreen />}
        {currentStep === 'knowledge-base' && (
          selectedKBItem ? (
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setSelectedKBItem(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← 一覧に戻る
                  </button>
                  <h2 className="text-xl font-bold">{selectedKBItem.title}</h2>
                  <div></div>
                </div>
              </div>
              <KBDetailView
                item={selectedKBItem}
                onNavigateToPersona={(personaId) => {
                  setSelectedKBItem(null);
                }}
              />
            </div>
          ) : (
            <KBView
              onUseData={(item) => {
                alert('データをactiveContextに設定しました。他のタブで使用できます。');
              }}
              onViewDetail={(item) => {
                setSelectedKBItem(item);
              }}
            />
          )
        )}
        {!currentStep && <InputScreen />}
      </div>
    </UnifiedLayout>
  );
}
