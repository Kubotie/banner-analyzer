'use client';

import { useEffect, useState, useRef } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import UnifiedLayout from '@/components/UnifiedLayout';
import InputScreen from '@/components/screens/InputScreen';
import ExtractionScreen from '@/components/screens/ExtractionScreen';
import AggregationScreen from '@/components/screens/AggregationScreen';
import PersonaAxisScreen from '@/components/screens/PersonaAxisScreen';
import PersonaScreen from '@/components/screens/PersonaScreen';
import SummaryScreen from '@/components/screens/SummaryScreen';
import ComparisonScreen from '@/components/screens/ComparisonScreen';
import KBView from '@/components/KBView';
import KBDetailView from '@/components/KBDetailView';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PersonaAppPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stepParam = searchParams.get('step');
  const { currentStep, setCurrentStep } = usePersonaStore();
  const [selectedKBItem, setSelectedKBItem] = useState<any>(null);
  const isUpdatingFromUrl = useRef(false);
  const isUpdatingFromStore = useRef(false);

  // URLからステップを読み込む（URLが変更されたときのみ）
  useEffect(() => {
    if (isUpdatingFromStore.current) {
      isUpdatingFromStore.current = false;
      return;
    }
    
    if (stepParam && stepParam !== currentStep) {
      isUpdatingFromUrl.current = true;
      setCurrentStep(stepParam as any);
      setTimeout(() => {
        isUpdatingFromUrl.current = false;
      }, 0);
    } else if (!stepParam && currentStep) {
      // URLにstepパラメータがない場合は、デフォルトでinputに設定
      if (currentStep !== 'input') {
        isUpdatingFromUrl.current = true;
        setCurrentStep('input');
        setTimeout(() => {
          isUpdatingFromUrl.current = false;
        }, 0);
      }
    }
  }, [stepParam, currentStep, setCurrentStep]);

  // currentStepが変更されたときにURLを更新（URLから読み込んだ場合を除く）
  useEffect(() => {
    if (isUpdatingFromUrl.current) {
      return;
    }
    
    if (currentStep && currentStep !== stepParam) {
      isUpdatingFromStore.current = true;
      router.replace(`/persona-app?step=${currentStep}`, { scroll: false });
    }
  }, [currentStep, stepParam, router]);

  return (
    <UnifiedLayout>
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
