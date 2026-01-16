'use client';

import { usePersonaStore } from '@/store/usePersonaStore';
import { Folder, FileText, Search } from 'lucide-react';

export default function Sidebar() {
  const { currentStep, setCurrentStep } = usePersonaStore();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-16 overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-2">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              ナレッジベース
            </h3>
            <button
              onClick={() => setCurrentStep('knowledge-base')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm ${
                currentStep === 'knowledge-base'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              ナレッジベース
            </button>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              分析
            </h3>
            <button
              onClick={() => setCurrentStep('input')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm ${
                currentStep === 'input'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              データ入力
            </button>
            <button
              onClick={() => setCurrentStep('summary')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm ${
                currentStep === 'summary'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Persona
            </button>
            <button
              onClick={() => setCurrentStep('comparison')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm ${
                currentStep === 'comparison'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              比較
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
