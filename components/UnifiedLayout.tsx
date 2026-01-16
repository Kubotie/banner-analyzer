'use client';

import { ReactNode } from 'react';
import LeftNav from './LeftNav';
import RightStepNav, { StepType } from './RightStepNav';
import { useProductStore } from '@/store/useProductStore';
import { useRouter, usePathname } from 'next/navigation';

interface UnifiedLayoutProps {
  children: ReactNode;
  stepType?: StepType; // 右ナビのステップタイプ
  currentStepId?: string; // 現在のステップID
  onStepClick?: (stepId: string) => void; // ステップクリックハンドラー
}

export default function UnifiedLayout({ 
  children, 
  stepType = null,
  currentStepId,
  onStepClick
}: UnifiedLayoutProps) {
  const { activeProduct } = useProductStore();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 黒いヘッダー */}
      <header className="bg-black text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">マーケティングAI β</h1>
        {activeProduct && (
          <div className="flex items-center gap-3">
            <span className="text-sm">
              選択中のサービス・製品: <span className="font-semibold">{activeProduct.name}</span>
            </span>
            <button
              onClick={() => router.push('/products')}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              変更
            </button>
          </div>
        )}
      </header>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左ナビゲーション */}
        <LeftNav />
        
        {/* 中央メインコンテンツ */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white min-w-0">
          {children}
        </main>

        {/* 右ステップナビゲーション */}
        <RightStepNav 
          stepType={stepType}
          currentStepId={currentStepId}
          onStepClick={onStepClick}
        />
      </div>
    </div>
  );
}
