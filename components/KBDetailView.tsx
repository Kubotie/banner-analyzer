'use client';

import { KBItem, PersonaPayload } from '@/kb/types';
import { Persona } from '@/types';

interface KBDetailViewProps {
  item: KBItem;
  onNavigateToPersona?: (personaId: string) => void;
}

export default function KBDetailView({
  item,
  onNavigateToPersona,
}: KBDetailViewProps) {
  // Personaの場合
  if (item.type === 'persona' && item.payload.type === 'persona') {
    const payload = item.payload as PersonaPayload;
    
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">{item.title}</h2>
          <div className="text-sm text-gray-600">
            保存日時: {new Date(item.created_at).toLocaleString('ja-JP')}
            <br />
            種別: ペルソナ
            <br />
            ペルソナID: {payload.persona_id}
          </div>
        </div>

        {/* 仮説ペルソナラベル */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-xs font-medium text-yellow-800">
            ※{payload.hypothesis_label}（一次情報に基づく現時点の判断）
          </div>
        </div>

        {/* 1行要約 */}
        <div className="mb-6 p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 mb-2">1行要約</h3>
          <p className="text-base text-gray-900">{payload.summary}</p>
        </div>

        {/* 背景ストーリー */}
        <div className="mb-6 p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 mb-2">背景ストーリー</h3>
          <p className="text-base text-gray-900">{payload.story}</p>
        </div>

        {/* 代理購入構造 */}
        <div className="mb-6 p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 mb-2">代理購入構造</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">誰の課題か:</span> {payload.proxy_structure.whose_problem}
            </div>
            <div>
              <span className="font-medium">誰が解決するか:</span> {payload.proxy_structure.who_solves}
            </div>
            <div>
              <span className="font-medium">どう解決しているか:</span> {payload.proxy_structure.how}
            </div>
          </div>
        </div>

        {/* Job to be Done */}
        <div className="mb-6 p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 mb-3">Job to be Done</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">機能面のJTBD</div>
              <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                {payload.jtbd.functional.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">感情面のJTBD</div>
              <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                {payload.jtbd.emotional.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">社会面のJTBD</div>
              <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                {payload.jtbd.social.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 判断基準TOP5 */}
        {payload.decision_criteria_top5.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-3">判断基準TOP5</h3>
            <div className="space-y-2">
              {payload.decision_criteria_top5.map((criterion, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-900">{criterion.criterion}</span>
                  <span className="text-xs text-gray-600">重み: {(criterion.weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 典型的なジャーニー */}
        <div className="mb-6 p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 mb-3">典型的なジャーニー</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">きっかけ:</span> {payload.journey.trigger}
            </div>
            <div>
              <span className="font-medium">検討:</span> {payload.journey.consider}
            </div>
            <div>
              <span className="font-medium">購入:</span> {payload.journey.purchase}
            </div>
            <div>
              <span className="font-medium">継続:</span> {payload.journey.continue}
            </div>
          </div>
        </div>

        {/* 誤解しやすいポイント */}
        {payload.pitfalls.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-red-200 bg-red-50">
            <h3 className="text-sm font-medium text-red-700 mb-3">誤解しやすいポイント</h3>
            <ul className="list-disc list-inside text-sm text-red-900 space-y-1">
              {payload.pitfalls.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 効果的な戦略 */}
        {(payload.tactics.message?.length || payload.tactics.route?.length || payload.tactics.offer?.length) && (
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-3">効果的な戦略</h3>
            {payload.tactics.message && payload.tactics.message.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-500 mb-1">メッセージ案</div>
                <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                  {payload.tactics.message.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {payload.tactics.route && payload.tactics.route.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-500 mb-1">導線案</div>
                <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                  {payload.tactics.route.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {payload.tactics.offer && payload.tactics.offer.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">オファー案</div>
                <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                  {payload.tactics.offer.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 根拠 */}
        <div className="mb-6 p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 mb-3">根拠</h3>
          <div className="text-sm text-gray-900 mb-2">
            引用件数: {payload.evidence.count}件
          </div>
          {payload.evidence.quotes.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {payload.evidence.quotes.map((quote, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="text-gray-600 mb-1">
                    【{quote.category}】{quote.respondent_id}
                  </div>
                  <div className="text-gray-900">{quote.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 根拠引用（詳細） */}
        {payload.evidence_quotes.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-3">根拠引用（詳細）</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {payload.evidence_quotes.map((quote, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="text-gray-600 mb-1">
                    【{quote.category}】{quote.source_file}
                    {quote.line_number && ` (行: ${quote.line_number})`}
                  </div>
                  <div className="text-gray-900">{quote.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Reportタイプ（比較データを含む可能性がある）
  if (item.type === 'report' && item.payload.type === 'report') {
    const payload = item.payload;
    const comparisonData = (payload as any).comparison_data;
    
    if (comparisonData) {
      // 比較データの表示
      return (
        <div className="h-full overflow-y-auto p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
            <div className="text-sm text-gray-600">
              保存日時: {new Date(item.created_at).toLocaleString('ja-JP')}
              <br />
              種別: ペルソナ比較
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">比較データ</h3>
            <div className="space-y-4">
              {comparisonData.commonPoints && comparisonData.commonPoints.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">共通点</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {comparisonData.commonPoints.map((point: string, idx: number) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {comparisonData.differences && comparisonData.differences.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">相違点</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {comparisonData.differences.map((point: string, idx: number) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  // MarketInsight/StrategyOption/PlanningHookタイプ（meta/payload構造）
  if ((item.type === 'insight' || item.type === 'option' || item.type === 'plan') && 
      item.payload && typeof item.payload === 'object' && 'meta' in item.payload && 'payload' in item.payload) {
    const payload = item.payload as any;
    const meta = payload.meta;
    const payloadData = payload.payload;
    const kind = payload._kind || (item.type === 'insight' ? 'market_insight' : item.type === 'option' ? 'strategy_option' : 'planning_hook');
    
    const typeLabel = kind === 'market_insight' ? '市場インサイト' : 
                     kind === 'strategy_option' ? '戦略オプション' : 
                     '企画フック';
    
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">{item.title}</h2>
          <div className="text-sm text-gray-600">
            保存日時: {new Date(item.created_at).toLocaleString('ja-JP')}
            <br />
            種別: {typeLabel}
            {meta?.kb_type && <><br />KBタイプ: {meta.kb_type}</>}
            {meta?.confidence !== undefined && <><br />信頼度: {(meta.confidence * 100).toFixed(0)}%</>}
            {meta?.generatedAt && <><br />生成日時: {new Date(meta.generatedAt).toLocaleString('ja-JP')}</>}
          </div>
        </div>

        {/* サマリー */}
        {payloadData?.summary && (
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">サマリー</h3>
            <p className="text-base text-gray-900">{payloadData.summary}</p>
          </div>
        )}

        {/* インサイト一覧 */}
        {payloadData?.insights && Array.isArray(payloadData.insights) && payloadData.insights.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-3">インサイト</h3>
            <div className="space-y-4">
              {payloadData.insights.map((insight: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 rounded">
                  <h4 className="font-semibold text-sm mb-2">{insight.title}</h4>
                  <p className="text-sm text-gray-700 mb-2">{insight.hypothesis}</p>
                  {insight.appeal_axes && insight.appeal_axes.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-600">訴求軸: </span>
                      <span className="text-xs text-gray-900">{insight.appeal_axes.join(', ')}</span>
                    </div>
                  )}
                  {insight.structure_type && insight.structure_type.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-600">構造タイプ: </span>
                      <span className="text-xs text-gray-900">{insight.structure_type.join(', ')}</span>
                    </div>
                  )}
                  {insight.evidence && Array.isArray(insight.evidence) && insight.evidence.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">根拠:</div>
                      <div className="space-y-1">
                        {insight.evidence.map((ev: any, evIdx: number) => (
                          <div key={evIdx} className="text-xs text-gray-700 pl-2">
                            {ev.text && <span>{ev.text}</span>}
                            {ev.bbox_type && <span className="text-gray-500"> ({ev.bbox_type})</span>}
                            {ev.areaRatio !== undefined && <span className="text-gray-500"> - 面積比: {(ev.areaRatio * 100).toFixed(1)}%</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 企画フック（PlanningHookのみ） */}
        {kind === 'planning_hook' && payloadData?.hooks && Array.isArray(payloadData.hooks) && payloadData.hooks.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-3">企画フック</h3>
            <div className="space-y-3">
              {payloadData.hooks.map((hook: any, idx: number) => (
                <div key={idx} className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="font-semibold text-sm mb-1 text-blue-900">{hook.question}</div>
                  <div className="text-sm text-gray-700">{hook.context}</div>
                  {hook.relatedPersonaIds && hook.relatedPersonaIds.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      関連ペルソナ: {hook.relatedPersonaIds.join(', ')}
                    </div>
                  )}
                  {hook.relatedSectionOrder !== undefined && (
                    <div className="mt-1 text-xs text-gray-600">
                      関連セクション順序: {hook.relatedSectionOrder}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // その他のタイプ（将来的に実装）
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="text-center text-gray-500 py-8">
        <h2 className="text-xl font-bold mb-2">{item.title}</h2>
        <div className="text-sm text-gray-600">
          保存日時: {new Date(item.created_at).toLocaleString('ja-JP')}
          <br />
          種別: {item.type}
        </div>
        <p className="mt-4">このタイプの詳細表示はまだ実装されていません</p>
      </div>
    </div>
  );
}
