import { Extraction, Aggregation, MarketInsight, Persona } from '@/types/schema';
import { generateAggregation } from './aggregation';
import { assessPersonaRelevance } from './persona';
import { generateStrategyOptions, generatePlanningHooks } from './insights';

/**
 * デモ用：企画1本を通すためのダミー案件データ
 */

/**
 * デモ用のペルソナデータ
 */
export function generateDemoPersonas(): Persona[] {
  return [
    {
      id: 'persona-demo-1',
      name: 'コスト意識の高い30代女性',
      concerns: ['無駄な出費', 'コストパフォーマンス', '割引・特典'],
      decision_criteria: ['価格の明確さ', '割引率', 'コスパ', '期間限定'],
      behavior_patterns: ['価格比較', 'セール情報を重視', '即決しにくい', '期間限定に反応'],
      notes: '価格訴求と限定訴求に敏感',
    },
    {
      id: 'persona-demo-2',
      name: '品質重視の40代男性',
      concerns: ['品質の不確実性', '失敗リスク', '信頼性'],
      decision_criteria: ['レビュー・評価', '社会的証明', '保証・アフターサービス', '効果'],
      behavior_patterns: ['詳細情報を確認', 'レビューを重視', '慎重に判断', '比較検討に時間をかける'],
      notes: '効果訴求と社会的証明を重視',
    },
    {
      id: 'persona-demo-3',
      name: '時短重視の20代女性',
      concerns: ['時間の無駄', '手間', '複雑さ'],
      decision_criteria: ['手軽さ', 'スピード', '簡単さ', '時短'],
      behavior_patterns: ['すぐに判断', '手続きの簡便性を重視', '試しやすい', '即決しやすい'],
      notes: '時短訴求と安心訴求を重視',
    },
  ];
}

/**
 * デモ用のExtractionデータ（より具体的な案件を想定）
 */
export function generateDemoExtractions(): Extraction[] {
  return [
    // バナー1: 価格訴求中心
    {
      banner_id: 'demo-banner-1',
      brand: 'ブランドA',
      channel: 'Facebook',
      format: '静止画',
      components: [
        { type: '商品画像', text: null, bbox: { x: 50, y: 50, w: 300, h: 300 } },
        { type: 'ロゴ', text: null, bbox: { x: 20, y: 20, w: 100, h: 40 } },
        { type: '価格', text: '¥9,800', bbox: { x: 400, y: 200, w: 120, h: 40 } },
        { type: 'CTA', text: '今すぐ購入', bbox: { x: 400, y: 300, w: 150, h: 50 } },
        { type: '期間限定', text: '期間限定30%OFF', bbox: { x: 50, y: 380, w: 200, h: 30 } },
      ],
      appeal_axes: [
        { type: '価格', evidence_text: '期間限定30%OFF', bbox: { x: 50, y: 380, w: 200, h: 30 } },
        { type: '限定', evidence_text: '期間限定30%OFF', bbox: { x: 50, y: 380, w: 200, h: 30 } },
      ],
      tone: '強め',
      notes: '価格訴求のテキストが確認できた。期間限定の表示あり。',
      confidence: 0.9,
      selected_reason_hypothesis: '価格訴求と期間限定の組み合わせは、コスト意識の高いペルソナの「お得感」への期待に応えるため選択されている可能性がある',
      avoided_expressions_hypothesis: '社会的証明やレビュー要素を避けている可能性がある。価格訴求に集中するため、他の訴求を削減している',
    },
    // バナー2: 価格訴求中心（類似）
    {
      banner_id: 'demo-banner-2',
      brand: 'ブランドA',
      channel: 'Instagram',
      format: '静止画',
      components: [
        { type: '商品画像', text: null, bbox: { x: 50, y: 50, w: 300, h: 300 } },
        { type: 'ロゴ', text: null, bbox: { x: 20, y: 20, w: 100, h: 40 } },
        { type: '価格', text: '¥8,900', bbox: { x: 400, y: 200, w: 120, h: 40 } },
        { type: 'CTA', text: '今すぐ購入', bbox: { x: 400, y: 300, w: 150, h: 50 } },
        { type: '期間限定', text: '初回50%OFF', bbox: { x: 50, y: 380, w: 200, h: 30 } },
      ],
      appeal_axes: [
        { type: '価格', evidence_text: '初回50%OFF', bbox: { x: 50, y: 380, w: 200, h: 30 } },
        { type: '限定', evidence_text: '初回50%OFF', bbox: { x: 50, y: 380, w: 200, h: 30 } },
      ],
      tone: '強め',
      notes: '価格訴求のテキストが確認できた。初回割引の表示あり。',
      confidence: 0.9,
      selected_reason_hypothesis: '初回割引は、コスト意識の高いペルソナの「試しやすさ」への期待に応えるため選択されている可能性がある',
      avoided_expressions_hypothesis: '品質訴求や社会的証明を避けている可能性がある。価格訴求に集中するため、他の訴求を削減している',
    },
    // バナー3: 効果訴求中心
    {
      banner_id: 'demo-banner-3',
      brand: 'ブランドB',
      channel: 'Facebook',
      format: '静止画',
      components: [
        { type: '商品画像', text: null, bbox: { x: 50, y: 50, w: 300, h: 300 } },
        { type: 'ロゴ', text: null, bbox: { x: 20, y: 20, w: 100, h: 40 } },
        { type: 'CTA', text: '詳細を見る', bbox: { x: 350, y: 350, w: 150, h: 50 } },
        { type: 'バッジ', text: 'おすすめ', bbox: { x: 50, y: 30, w: 100, h: 30 } },
        { type: 'レビュー', text: '★★★★★ 4.8', bbox: { x: 50, y: 400, w: 150, h: 30 } },
      ],
      appeal_axes: [
        { type: '効果', evidence_text: 'おすすめ', bbox: { x: 50, y: 30, w: 100, h: 30 } },
        { type: '社会的証明', evidence_text: '★★★★★ 4.8', bbox: { x: 50, y: 400, w: 150, h: 30 } },
      ],
      tone: 'やわらかめ',
      notes: '効果訴求と社会的証明のテキストが確認できた。',
      confidence: 0.85,
      selected_reason_hypothesis: '効果訴求と社会的証明の組み合わせは、品質重視のペルソナの「信頼性」への期待に応えるため選択されている可能性がある',
      avoided_expressions_hypothesis: '価格表示や期間限定要素を避けている可能性がある。効果訴求に集中するため、価格訴求を削減している',
    },
    // バナー4: 効果訴求中心（類似）
    {
      banner_id: 'demo-banner-4',
      brand: 'ブランドB',
      channel: 'Instagram',
      format: '静止画',
      components: [
        { type: '商品画像', text: null, bbox: { x: 50, y: 50, w: 300, h: 300 } },
        { type: 'ロゴ', text: null, bbox: { x: 20, y: 20, w: 100, h: 40 } },
        { type: 'CTA', text: '詳細を見る', bbox: { x: 350, y: 350, w: 150, h: 50 } },
        { type: 'バッジ', text: '人気No.1', bbox: { x: 50, y: 30, w: 100, h: 30 } },
        { type: 'レビュー', text: '★★★★★', bbox: { x: 50, y: 400, w: 150, h: 30 } },
      ],
      appeal_axes: [
        { type: '効果', evidence_text: '人気No.1', bbox: { x: 50, y: 30, w: 100, h: 30 } },
        { type: '社会的証明', evidence_text: '★★★★★', bbox: { x: 50, y: 400, w: 150, h: 30 } },
      ],
      tone: 'やわらかめ',
      notes: '効果訴求と社会的証明のテキストが確認できた。',
      confidence: 0.85,
      selected_reason_hypothesis: '人気No.1とレビューの組み合わせは、品質重視のペルソナの「安心感」への期待に応えるため選択されている可能性がある',
      avoided_expressions_hypothesis: '価格表示を避けている可能性がある。効果訴求に集中するため、価格訴求を削減している',
    },
    // バナー5: 時短・安心訴求中心
    {
      banner_id: 'demo-banner-5',
      brand: 'ブランドC',
      channel: 'Facebook',
      format: '静止画',
      components: [
        { type: '商品画像', text: null, bbox: { x: 50, y: 50, w: 300, h: 300 } },
        { type: 'ロゴ', text: null, bbox: { x: 20, y: 20, w: 100, h: 40 } },
        { type: '価格', text: '¥12,800', bbox: { x: 400, y: 200, w: 120, h: 40 } },
        { type: 'CTA', text: '無料お試し', bbox: { x: 400, y: 300, w: 150, h: 50 } },
        { type: '保証', text: '30日返金保証', bbox: { x: 50, y: 380, w: 200, h: 30 } },
      ],
      appeal_axes: [
        { type: '安心', evidence_text: '30日返金保証', bbox: { x: 50, y: 380, w: 200, h: 30 } },
        { type: '時短', evidence_text: '無料お試し', bbox: { x: 400, y: 300, w: 150, h: 50 } },
      ],
      tone: null,
      notes: '安心訴求と時短訴求のテキストが確認できた。',
      confidence: 0.8,
      selected_reason_hypothesis: '安心訴求と時短訴求の組み合わせは、時短重視のペルソナの「リスク回避」と「手軽さ」への期待に応えるため選択されている可能性がある',
      avoided_expressions_hypothesis: '期間限定や割引要素を避けている可能性がある。安心訴求に集中するため、緊急性を削減している',
    },
  ];
}

/**
 * デモ用のMarket Insightを3枚作成
 * 人の前提×市場の観測×制約
 */
export function generateDemoMarketInsights(
  aggregation: Aggregation,
  personas: Persona[]
): MarketInsight[] {
  const insights: MarketInsight[] = [];

  // Market Insight 1: 価格訴求の当たり前
  const insight1: MarketInsight = {
    persona_assumption: {
      assumption: 'コスト意識の高いペルソナは「価格が明確でないと不安を感じる」「割引がないと損をした気分になる」という前提を持っている可能性がある',
      evidence: '価格訴求が80%のバナーで使用（4件）',
    },
    competitor_choice: {
      choice: '価格訴求と期間限定を組み合わせている',
      evidence: '80%のバナーで価格訴求を使用、60%で期間限定要素を使用（4件中3件）',
      bbox_references: [
        { banner_id: 'demo-banner-1', bbox: { x: 50, y: 380, w: 200, h: 30 } },
        { banner_id: 'demo-banner-2', bbox: { x: 50, y: 380, w: 200, h: 30 } },
      ],
    },
    rationality_hypothesis: 'コスト意識の高いペルソナの不安（無駄な出費）と判断基準（価格の明確さ、割引率）に応えるため、価格訴求と期間限定を組み合わせる選択が合理的である可能性がある',
    taken_for_granted_risk: '価格訴求と期間限定の組み合わせは当たり前になっている可能性があり、外すとコスト意識の高いペルソナの期待に応えられず、離脱リスクが高まる可能性がある',
    supporting_banners: ['demo-banner-1', 'demo-banner-2'],
    category: 'high_frequency',
    persona_relevance: [],
    planning_hooks: [
      {
        question: '価格訴求と期間限定を外す場合、コスト意識の高いペルソナのどの不安・期待にどう応えるか？',
        context: '価格訴求は80%のバナーで使用されている。外す場合、ペルソナごとに異なる代替手段を検討する必要がある可能性がある',
        related_persona_ids: personas.map((p) => p.id),
      },
      {
        question: '価格訴求と期間限定を含める場合、どのペルソナにどう伝えるべきか？',
        context: '市場で一般的な組み合わせだが、ペルソナごとに重視するポイントが異なる可能性がある',
        related_persona_ids: personas.map((p) => p.id),
      },
    ],
  };
  insight1.persona_relevance = assessPersonaRelevance(insight1, personas);
  insights.push(insight1);

  // Market Insight 2: 社会的証明の当たり前
  const insight2: MarketInsight = {
    persona_assumption: {
      assumption: '品質重視のペルソナは「レビューや評価がないと判断できない」「社会的証明がないと不安を感じる」という前提を持っている可能性がある',
      evidence: '社会的証明が40%のバナーで使用（2件）',
    },
    competitor_choice: {
      choice: '効果訴求と社会的証明を組み合わせている',
      evidence: '40%のバナーで効果訴求と社会的証明を組み合わせ使用（2件）',
      bbox_references: [
        { banner_id: 'demo-banner-3', bbox: { x: 50, y: 400, w: 150, h: 30 } },
        { banner_id: 'demo-banner-4', bbox: { x: 50, y: 400, w: 150, h: 30 } },
      ],
    },
    rationality_hypothesis: '品質重視のペルソナの不安（品質の不確実性、失敗リスク）と判断基準（レビュー・評価、社会的証明）に応えるため、効果訴求と社会的証明を組み合わせる選択が合理的である可能性がある',
    taken_for_granted_risk: '効果訴求と社会的証明の組み合わせは、品質重視のペルソナ層では当たり前になっている可能性があり、外すと判断材料が不足し、離脱リスクが高まる可能性がある',
    supporting_banners: ['demo-banner-3', 'demo-banner-4'],
    category: 'combination',
    persona_relevance: [],
    planning_hooks: [
      {
        question: '効果訴求と社会的証明を外す場合、品質重視のペルソナの判断基準にどう応えるか？',
        context: '効果訴求と社会的証明は40%のバナーで組み合わせ使用されている。外す場合、ペルソナごとに異なる判断基準に応える必要がある可能性がある',
        related_persona_ids: personas.map((p) => p.id),
      },
      {
        question: '効果訴求と社会的証明を伝える場合、どのペルソナにどう伝えるべきか？',
        context: '市場で一般的な組み合わせだが、ペルソナごとに重視する表現が異なる可能性がある',
        related_persona_ids: personas.map((p) => p.id),
      },
    ],
  };
  insight2.persona_relevance = assessPersonaRelevance(insight2, personas);
  insights.push(insight2);

  // Market Insight 3: 価格表示を避ける傾向
  const insight3: MarketInsight = {
    persona_assumption: {
      assumption: '品質重視のペルソナは「価格が最初に目に入ると、品質への不安が高まる」「価格表示は品質重視のメッセージと矛盾する」という前提を持っている可能性がある',
      evidence: '効果訴求を使用するバナーで価格表示が0%（2件中0件）',
    },
    competitor_choice: {
      choice: '効果訴求を使用する場合、価格表示を避けている',
      evidence: '効果訴求を使用するバナーで価格表示が0%（2件中0件）',
    },
    rationality_hypothesis: '品質重視のペルソナの判断基準（レビュー・評価、社会的証明）に集中するため、価格表示を避ける選択が合理的である可能性がある',
    taken_for_granted_risk: '効果訴求を使用する場合、価格表示を避けることが当たり前になっている可能性があり、使うと品質重視のペルソナの混乱や反発を招くリスクがある可能性がある',
    supporting_banners: ['demo-banner-3', 'demo-banner-4'],
    category: 'low_frequency',
    persona_relevance: [],
    planning_hooks: [
      {
        question: '効果訴求と価格表示を組み合わせる場合、品質重視のペルソナの反発をどう回避するか？',
        context: '効果訴求を使用するバナーで価格表示が0%。使う場合、ペルソナごとに異なる説明・文脈を検討する必要がある可能性がある',
        related_persona_ids: personas.map((p) => p.id),
      },
      {
        question: '価格表示を避ける場合、各ペルソナの機能をどう代替するか？',
        context: '市場で避けられている要素だが、ペルソナごとに必要な機能が異なる可能性がある',
        related_persona_ids: personas.map((p) => p.id),
      },
    ],
  };
  insight3.persona_relevance = assessPersonaRelevance(insight3, personas);
  insights.push(insight3);

  return insights;
}

/**
 * デモ用の完全なデータセットを生成
 */
export function generateDemoFullData() {
  const personas = generateDemoPersonas();
  const extractions = generateDemoExtractions();
  const aggregation = generateAggregation(extractions);
  const marketInsights = generateDemoMarketInsights(aggregation, personas);
  const strategyOptions = generateStrategyOptions(marketInsights, aggregation, personas);
  const planningHooks = generatePlanningHooks(strategyOptions, marketInsights, personas);

  return {
    personas,
    extractions,
    aggregation,
    marketInsights,
    strategyOptions,
    planningHooks,
  };
}
