'use client';

import { ReactNode } from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { usePersonaStore } from '@/store/usePersonaStore';

export type StepType = 'persona' | 'banner' | null;

interface Step {
  id: string;
  label: string;
  locked?: boolean;
  unlockCondition?: () => boolean;
  completed?: boolean;
}

interface RightStepNavProps {
  stepType: StepType;
  currentStepId?: string;
  onStepClick?: (stepId: string) => void;
}

/**
 * 右ナビゲーション（ステップナビ）
 * 「いま何をしているか（プロセス）」を示す
 * 同一画面内のステップ遷移 or 状態表示を担当
 */
export default function RightStepNav({ 
  stepType, 
  currentStepId,
  onStepClick 
}: RightStepNavProps) {
  const { isExtractionFinalized, aggregation, personas, personaAxes } = usePersonaStore();
  
  // ステップ定義（画面種別に応じて動的に変更）
  const getSteps = (): Step[] => {
    if (stepType === 'persona') {
      return [
        { id: 'input', label: 'Step 1: データ入力' },
        { id: 'extraction', label: 'Step 2: Extraction生成・確認' },
        { 
          id: 'aggregation', 
          label: 'Step 3: Aggregation',
          locked: true,
          unlockCondition: () => isExtractionFinalized()
        },
        { 
          id: 'persona-axis', 
          label: 'Step 4: ペルソナ軸設定',
          locked: true,
          unlockCondition: () => !!aggregation && aggregation.clusters.length > 0
        },
        { 
          id: 'summary', 
          label: 'Step 5: Persona生成',
          locked: true,
          unlockCondition: () => !!aggregation && personaAxes.length > 0
        },
        { 
          id: 'comparison', 
          label: 'Step 6: 比較',
          locked: true,
          unlockCondition: () => personas.length >= 2
        },
      ];
    } else if (stepType === 'banner') {
      return [
        { id: 'analyze', label: 'Step A: 画像読み込み' },
        { id: 'analysis', label: 'Step B: 個別分析' },
        { id: 'insight', label: 'Step C1: 市場インサイト' },
        { id: 'strategy', label: 'Step C2: 戦略オプション' },
        { id: 'planning', label: 'Step D: 企画フック' },
      ];
    }
    return [];
  };

  const steps = getSteps();

  // ステップが表示されない場合は何も表示しない
  if (!stepType || steps.length === 0) {
    return null;
  }

  const handleStepClick = (step: Step) => {
    if (step.locked && step.unlockCondition && !step.unlockCondition()) {
      // ロックされている場合は警告
      let message = 'この機能を使用するには、前のステップを完了する必要があります。';
      if (step.id === 'aggregation') {
        message = 'Extraction Recordを確定してから進んでください。';
      } else if (step.id === 'persona-axis') {
        message = 'Aggregationを生成してから進んでください。';
      } else if (step.id === 'summary') {
        message = 'Aggregationとペルソナ軸を設定してから進んでください。';
      } else if (step.id === 'comparison') {
        message = 'Personaを2つ以上生成してから進んでください。';
      }
      alert(message);
      return;
    }
    if (onStepClick) {
      onStepClick(step.id);
    }
  };

  return (
    <div className="w-64 bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
          作業ステップ
        </h3>
        <nav className="space-y-1">
          {steps.map((step, idx) => {
            const isActive = currentStepId === step.id;
            const isLocked = step.locked && step.unlockCondition && !step.unlockCondition();
            const isClickable = !isLocked && onStepClick;
            
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                disabled={isLocked}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : isLocked
                    ? 'text-gray-400 cursor-not-allowed'
                    : isClickable
                    ? 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                    : 'text-gray-600'
                }`}
                title={isLocked ? '前のステップを完了してください' : undefined}
              >
                {isLocked && (
                  <Lock className="w-4 h-4 flex-shrink-0" />
                )}
                {step.completed && !isLocked && (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                )}
                <span className="text-left">{step.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
