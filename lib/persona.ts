import { Persona, PersonaRelevance, MarketInsight } from '@/types/schema';

/**
 * ダミーペルソナデータ生成
 */
export function generateDummyPersonas(): Persona[] {
  return [
    {
      id: 'persona-1',
      name: '価格重視型ペルソナ',
      concerns: ['コストパフォーマンス', '無駄な出費', '割引・特典'],
      decision_criteria: ['価格の明確さ', '割引率', 'コスパ'],
      behavior_patterns: ['価格比較', 'セール情報を重視', '即決しにくい'],
      notes: '価格訴求に敏感',
    },
    {
      id: 'persona-2',
      name: '品質重視型ペルソナ',
      concerns: ['品質の不確実性', '失敗リスク', '信頼性'],
      decision_criteria: ['レビュー・評価', '社会的証明', '保証・アフターサービス'],
      behavior_patterns: ['詳細情報を確認', 'レビューを重視', '慎重に判断'],
      notes: '効果訴求と社会的証明を重視',
    },
    {
      id: 'persona-3',
      name: '時短・便利重視型ペルソナ',
      concerns: ['時間の無駄', '手間', '複雑さ'],
      decision_criteria: ['手軽さ', 'スピード', '簡単さ'],
      behavior_patterns: ['すぐに判断', '手続きの簡便性を重視', '試しやすい'],
      notes: '時短訴求と安心訴求を重視',
    },
  ];
}

/**
 * Market InsightとPersonaの関連性を判定
 * ペルソナの不安・判断基準・行動パターンとの一致から判定
 */
export function assessPersonaRelevance(
  insight: MarketInsight,
  personas: Persona[]
): PersonaRelevance[] {
  return personas.map((persona) => {
    let relevanceLevel: PersonaRelevance['relevance_level'] = 'unknown';
    let reasoning = '';

    // ペルソナの不安・判断基準・行動パターンとMarket Insightの一致度を判定
    const personaAssumptionLower = insight.persona_assumption.assumption.toLowerCase();
    const competitorChoiceLower = insight.competitor_choice.choice.toLowerCase();
    const rationalityLower = insight.rationality_hypothesis.toLowerCase();
    const riskLower = insight.taken_for_granted_risk.toLowerCase();

    // 不安との一致（重要度: 高）
    const concernMatches = persona.concerns.filter((concern) => {
      const concernLower = concern.toLowerCase();
      return (
        personaAssumptionLower.includes(concernLower) ||
        competitorChoiceLower.includes(concernLower) ||
        rationalityLower.includes(concernLower) ||
        riskLower.includes(concernLower)
      );
    });

    // 判断基準との一致（重要度: 高）
    const criteriaMatches = persona.decision_criteria.filter((criteria) => {
      const criteriaLower = criteria.toLowerCase();
      return (
        personaAssumptionLower.includes(criteriaLower) ||
        competitorChoiceLower.includes(criteriaLower) ||
        rationalityLower.includes(criteriaLower) ||
        riskLower.includes(criteriaLower)
      );
    });

    // 行動パターンとの一致（重要度: 中）
    const behaviorMatches = persona.behavior_patterns.filter((behavior) => {
      const behaviorLower = behavior.toLowerCase();
      return (
        personaAssumptionLower.includes(behaviorLower) ||
        competitorChoiceLower.includes(behaviorLower) ||
        rationalityLower.includes(behaviorLower) ||
        riskLower.includes(behaviorLower)
      );
    });

    // 一致度から関連性を判定（不安・判断基準を重視）
    const concernWeight = concernMatches.length * 2; // 不安は2倍の重み
    const criteriaWeight = criteriaMatches.length * 2; // 判断基準は2倍の重み
    const behaviorWeight = behaviorMatches.length; // 行動パターンは1倍の重み
    const totalWeight = concernWeight + criteriaWeight + behaviorWeight;
    const maxWeight = (persona.concerns.length + persona.decision_criteria.length) * 2 + persona.behavior_patterns.length;

    // 判定理由を生成
    const matchedConcerns = concernMatches.length > 0 ? `不安（${concernMatches.join('、')}）` : '';
    const matchedCriteria = criteriaMatches.length > 0 ? `判断基準（${criteriaMatches.join('、')}）` : '';
    const matchedBehaviors = behaviorMatches.length > 0 ? `行動パターン（${behaviorMatches.join('、')}）` : '';
    const matchedItems = [matchedConcerns, matchedCriteria, matchedBehaviors].filter(Boolean);

    if (totalWeight >= maxWeight * 0.5) {
      relevanceLevel = 'high'; // ◎
      reasoning = `${persona.name}の${matchedItems.join('、')}と市場インサイトが一致している可能性がある`;
    } else if (totalWeight >= maxWeight * 0.3) {
      relevanceLevel = 'medium'; // ◯
      reasoning = `${persona.name}の${matchedItems.join('、')}と市場インサイトが一部一致している可能性がある`;
    } else if (totalWeight > 0) {
      relevanceLevel = 'low'; // △
      reasoning = `${persona.name}の${matchedItems.join('、')}と市場インサイトが限定的に一致している可能性がある`;
    } else {
      relevanceLevel = 'unknown'; // ？
      reasoning = `${persona.name}との関連性は不明である可能性がある`;
    }

    return {
      persona_id: persona.id,
      relevance_level: relevanceLevel,
      reasoning,
    };
  });
}
