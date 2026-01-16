'use client';

import { useState } from 'react';
import { usePersonaStore } from '@/store/usePersonaStore';
import { SummaryItem } from '@/types';

export default function SummaryScreen() {
  const { personaSummaries, selectedPersona, setSelectedPersona, setSelectedEvidence, statements, setCurrentStep } = usePersonaStore();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // タブが選択されていない場合は最初のペルソナを選択
  if (!activeTab && personaSummaries.length > 0) {
    setActiveTab(personaSummaries[0].personaId);
  }

  const handleEvidenceClick = (evidenceId: string) => {
    setSelectedEvidence(evidenceId);
    // 発言一覧にスクロール
    const element = document.getElementById(`statement-${evidenceId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-4', 'ring-blue-500');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-blue-500');
      }, 2000);
    }
  };

  const renderSummaryItem = (item: SummaryItem, category: string) => (
    <div key={item.text} className="p-3 bg-gray-50 rounded-lg mb-2">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium">{item.text}</span>
      </div>
      <div className="mt-2">
        <span className="text-xs text-gray-600">根拠:</span>
        <div className="mt-1 space-y-1">
          {item.evidences?.map((evidence, idx) => (
            <button
              key={idx}
              onClick={() => handleEvidenceClick(evidence.statementId)}
              className="block text-xs text-blue-600 hover:text-blue-800 hover:underline text-left"
            >
              「{evidence.quoteText}」 [{evidence.source}]
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const currentSummary = personaSummaries.find((s) => s.personaId === activeTab);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ペルソナ要約</h2>
          <button
            onClick={() => setCurrentStep('comparison')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            比較画面へ
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-6 border-b">
          {personaSummaries.map((summary) => (
            <button
              key={summary.personaId}
              onClick={() => setActiveTab(summary.personaId)}
              className={`px-4 py-2 font-medium ${
                activeTab === summary.personaId
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ペルソナ{summary.personaId} ({summary.statementCount}件)
            </button>
          ))}
        </div>

        {/* 要約内容 */}
        {currentSummary && (
          <div className="space-y-6">
            {/* 課題 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">課題</h3>
              {currentSummary.summary.challenges.length > 0 ? (
                <div>
                  {currentSummary.summary.challenges.map((item) => renderSummaryItem(item, '課題'))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg text-sm text-gray-600">
                  ⚠️ 情報不足: 課題に関する発言が見つかりませんでした
                </div>
              )}
            </div>

            {/* 感情 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">感情</h3>
              {currentSummary.summary.emotions.length > 0 ? (
                <div>
                  {currentSummary.summary.emotions.map((item) => renderSummaryItem(item, '感情'))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg text-sm text-gray-600">
                  ⚠️ 情報不足: 感情に関する発言が見つかりませんでした
                </div>
              )}
            </div>

            {/* 意思決定トリガー */}
            <div>
              <h3 className="text-lg font-semibold mb-3">意思決定トリガー</h3>
              {currentSummary.summary.decisionTriggers.length > 0 ? (
                <div>
                  {currentSummary.summary.decisionTriggers.map((item) => renderSummaryItem(item, '意思決定トリガー'))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg text-sm text-gray-600">
                  ⚠️ 情報不足: 意思決定トリガーに関する発言が見つかりませんでした
                </div>
              )}
            </div>

            {/* NG表現 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">NG表現</h3>
              {currentSummary.summary.ngExpressions.length > 0 ? (
                <div>
                  {currentSummary.summary.ngExpressions.map((item) => renderSummaryItem(item, 'NG表現'))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg text-sm text-gray-600">
                  ⚠️ 情報不足: NG表現に関する発言が見つかりませんでした
                </div>
              )}
            </div>
          </div>
        )}

        {/* 次の思考への橋渡し */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">次に考えるとよい観点</h3>
          <ul className="space-y-2 text-sm">
            <li>
              • このペルソナで、競合はどんな表現をしているか
              <button className="ml-2 text-blue-600 hover:underline">→ 競合バナー分析アプリへ</button>
            </li>
            <li>
              • このペルソナ前提で、今回の訴求はどう設計するか
              <button className="ml-2 text-blue-600 hover:underline">→ クリエイティブ戦略整理アプリへ</button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
