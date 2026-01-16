'use client';

import { usePersonaStore } from '@/store/usePersonaStore';

export default function Header() {
  const { currentStep, setCurrentStep, isExtractionFinalized } = usePersonaStore();

  const steps = [
    { id: 'input', label: 'データ入力' },
    { id: 'extraction', label: 'Extraction生成' },
    { id: 'extraction-review', label: 'Extraction確認' },
    { id: 'aggregation', label: 'Aggregation' },
    { id: 'persona-axis', label: 'ペルソナ軸設定' },
    { id: 'summary', label: 'Persona' },
    { id: 'comparison', label: '比較' },
    { id: 'knowledge-base', label: 'ナレッジベース' },
  ];

  return (
    <header className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold mb-4">ペルソナ要約・比較アプリ</h1>
        <nav className="flex gap-2">
          {steps.map((step) => {
            // Aggregation以降は、Extraction確定済みの場合のみ有効
            const isDisabled = 
              (step.id === 'aggregation' || step.id === 'persona-axis' || step.id === 'summary' || step.id === 'comparison') &&
              !isExtractionFinalized();
            
            return (
              <button
                key={step.id}
                onClick={() => {
                  if (isDisabled) {
                    alert('Extraction Recordを確定してから進んでください。');
                    return;
                  }
                  setCurrentStep(step.id as any);
                }}
                disabled={isDisabled}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : isDisabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isDisabled ? 'Extraction Recordを確定してください' : ''}
              >
                {step.label}
                {isDisabled && ' 🔒'}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
