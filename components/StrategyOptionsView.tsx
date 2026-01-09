'use client';

import { StrategyOption, Persona } from '@/types/schema';

interface StrategyOptionsViewProps {
  options: StrategyOption[];
  personas?: Persona[];
  onSelectOption?: (option: StrategyOption) => void;
}

export default function StrategyOptionsView({ options, personas = [], onSelectOption }: StrategyOptionsViewProps) {
  const getOptionColor = (optionType: StrategyOption['option_type']) => {
    switch (optionType) {
      case 'A':
        return 'border-blue-500 bg-blue-50';
      case 'B':
        return 'border-green-500 bg-green-50';
      case 'C':
        return 'border-orange-500 bg-orange-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {options.length === 0 ? (
        <div className="text-center text-gray-500 py-8">戦略オプションがありません</div>
      ) : (
        options.map((option, idx) => (
          <div
            key={idx}
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              onSelectOption ? 'hover:shadow-lg' : ''
            } ${getOptionColor(option.option_type)}`}
            onClick={() => onSelectOption?.(option)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl font-bold">Option {option.option_type}</div>
              <div className="text-lg font-semibold">{option.title}</div>
            </div>

            {/* 合理性/リスク評価 */}
            {(option.rationality_assessment || option.risk_assessment) && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                {option.rationality_assessment && (
                  <div className="p-3 bg-white rounded border">
                    <div className="text-xs font-medium text-gray-600 mb-1">合理性</div>
                    <div className={`text-sm font-bold mb-1 ${
                      option.rationality_assessment.level === 'high' ? 'text-green-600' :
                      option.rationality_assessment.level === 'medium' ? 'text-yellow-600' :
                      option.rationality_assessment.level === 'low' ? 'text-red-600' :
                      'text-gray-400'
                    }`}>
                      {option.rationality_assessment.level === 'high' ? '高' :
                       option.rationality_assessment.level === 'medium' ? '中' :
                       option.rationality_assessment.level === 'low' ? '低' :
                       '判断不可'}
                    </div>
                    <div className="text-xs text-gray-600">{option.rationality_assessment.reasoning}</div>
                  </div>
                )}
                {option.risk_assessment && (
                  <div className="p-3 bg-white rounded border">
                    <div className="text-xs font-medium text-gray-600 mb-1">リスク</div>
                    <div className={`text-sm font-bold mb-1 ${
                      option.risk_assessment.level === 'high' ? 'text-red-600' :
                      option.risk_assessment.level === 'medium' ? 'text-yellow-600' :
                      option.risk_assessment.level === 'low' ? 'text-green-600' :
                      'text-gray-400'
                    }`}>
                      {option.risk_assessment.level === 'high' ? '高' :
                       option.risk_assessment.level === 'medium' ? '中' :
                       option.risk_assessment.level === 'low' ? '低' :
                       '判断不可'}
                    </div>
                    <div className="text-xs text-gray-600">{option.risk_assessment.reasoning}</div>
                  </div>
                )}
              </div>
            )}

            {/* 参考にしている競合要素 */}
            {(option.referenced_elements.components && option.referenced_elements.components.length > 0) ||
            (option.referenced_elements.appeal_axes && option.referenced_elements.appeal_axes.length > 0) ? (
              <div className="mb-4 p-3 bg-white rounded border">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  参考にしている競合要素
                </div>
                {option.referenced_elements.components && option.referenced_elements.components.length > 0 && (
                  <div className="text-sm text-gray-600 mb-1">
                    要素: {option.referenced_elements.components.join(', ')}
                  </div>
                )}
                {option.referenced_elements.appeal_axes && option.referenced_elements.appeal_axes.length > 0 && (
                  <div className="text-sm text-gray-600">
                    訴求軸: {option.referenced_elements.appeal_axes.join(', ')}
                  </div>
                )}
              </div>
            ) : null}

            {/* あえて使わない要素 */}
            {(option.avoided_elements.components && option.avoided_elements.components.length > 0) ||
            (option.avoided_elements.appeal_axes && option.avoided_elements.appeal_axes.length > 0) ? (
              <div className="mb-4 p-3 bg-white rounded border">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  あえて使わない要素
                </div>
                {option.avoided_elements.components && option.avoided_elements.components.length > 0 && (
                  <div className="text-sm text-gray-600 mb-1">
                    要素: {option.avoided_elements.components.join(', ')}
                  </div>
                )}
                {option.avoided_elements.appeal_axes && option.avoided_elements.appeal_axes.length > 0 && (
                  <div className="text-sm text-gray-600">
                    訴求軸: {option.avoided_elements.appeal_axes.join(', ')}
                  </div>
                )}
              </div>
            ) : null}

            {/* 想定されるメリット */}
            {option.potential_benefits.length > 0 && (
              <div className="mb-4 p-3 bg-white rounded border border-green-300">
                <div className="text-sm font-medium text-green-700 mb-2">
                  想定されるメリット（仮説）
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {option.potential_benefits.map((benefit, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 想定されるリスク */}
            {option.potential_risks.length > 0 && (
              <div className="mb-4 p-3 bg-white rounded border border-red-300">
                <div className="text-sm font-medium text-red-700 mb-2">
                  想定されるリスク（仮説）
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {option.potential_risks.map((risk, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ペルソナ別のリスク感とOverlay（分岐表示） */}
            {option.persona_risk_assessment && option.persona_risk_assessment.length > 0 && (
              <div className="p-3 bg-white rounded border">
                <div className="text-sm font-medium text-gray-700 mb-3">ペルソナ別のリスク感とOverlay</div>
                <div className="space-y-3">
                  {option.persona_risk_assessment.map((assessment, idx) => {
                    const persona = personas.find((p) => p.id === assessment.persona_id);
                    const riskColor =
                      assessment.risk_level === 'low'
                        ? 'border-green-300 bg-green-50'
                        : assessment.risk_level === 'medium'
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-red-300 bg-red-50';
                    const riskLabel =
                      assessment.risk_level === 'low'
                        ? '低リスク'
                        : assessment.risk_level === 'medium'
                        ? '中リスク'
                        : '高リスク';

                    // Persona Overlayの表示（◎◯△？）
                    const getOverlaySymbol = (overlay: 'high' | 'medium' | 'low' | 'unknown') => {
                      switch (overlay) {
                        case 'high':
                          return '◎';
                        case 'medium':
                          return '◯';
                        case 'low':
                          return '△';
                        default:
                          return '？';
                      }
                    };

                    const getOverlayColor = (overlay: 'high' | 'medium' | 'low' | 'unknown') => {
                      switch (overlay) {
                        case 'high':
                          return 'text-green-600';
                        case 'medium':
                          return 'text-blue-600';
                        case 'low':
                          return 'text-yellow-600';
                        default:
                          return 'text-gray-400';
                      }
                    };

                    const overlaySymbol = assessment.persona_overlay
                      ? getOverlaySymbol(assessment.persona_overlay)
                      : '？';
                    const overlayColor = assessment.persona_overlay
                      ? getOverlayColor(assessment.persona_overlay)
                      : 'text-gray-400';

                    return (
                      <div key={idx} className={`p-3 rounded border ${riskColor}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg font-bold ${overlayColor}`}>
                            {overlaySymbol}
                          </span>
                          <span className={`text-sm font-bold ${riskColor.includes('green') ? 'text-green-700' : riskColor.includes('yellow') ? 'text-yellow-700' : 'text-red-700'}`}>
                            {riskLabel}
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {persona ? persona.name : `ペルソナID: ${assessment.persona_id}`}
                          </span>
                        </div>
                        <div className="text-xs text-gray-700">{assessment.reasoning}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
