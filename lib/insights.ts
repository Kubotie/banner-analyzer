import { Aggregation, Extraction, MarketInsight, StrategyOption, PlanningHook, Persona } from '@/types/schema';
import { assessPersonaRelevance } from './persona';

/**
 * Market Insight (C1) 生成
 * 構造の読み取り：4要素必須 + ペルソナ関連性
 */
export function generateMarketInsights(
  aggregation: Aggregation,
  extractions: Extraction[],
  personas: Persona[] = []
): MarketInsight[] {
  const insights: MarketInsight[] = [];

  // 高頻度要素から構造を読み取る
  aggregation.component_frequencies
    .filter((cf) => cf.percentage >= 70)
    .forEach((cf) => {
      const supportingBanners = extractions
        .filter((e) => e.components.some((c) => c.type === cf.type))
        .map((e) => e.banner_id);

      // BBox参照を取得
      const bboxReferences = extractions
        .filter((e) => e.components.some((c) => c.type === cf.type))
        .flatMap((e) =>
          e.components
            .filter((c) => c.type === cf.type)
            .map((c) => ({
              banner_id: e.banner_id,
              bbox: c.bbox,
            }))
        )
        .slice(0, 3); // 最大3件まで

      const insight: MarketInsight = {
        // 1. 想定されているペルソナ前提（人の不安・制約）
        persona_assumption: {
          assumption: `ペルソナは${cf.type}がないと不安を感じる、または${cf.type}の存在を前提として期待している可能性がある`,
          evidence: `${cf.percentage}%のバナーで使用（${cf.count}件）`,
        },
        // 2. 観測された競合の選択（事実 + 根拠）
        competitor_choice: {
          choice: `${cf.type}を使用している`,
          evidence: `${cf.percentage}%のバナーで使用（${cf.count}件）`,
          bbox_references: bboxReferences.length > 0 ? bboxReferences : undefined,
        },
        // 3. なぜその選択が合理的か（仮説）
        rationality_hypothesis: `ペルソナの期待や不安に応えるため、${cf.type}を含める選択が合理的である可能性がある`,
        // 4. 当たり前になっている可能性（外すとリスク）
        taken_for_granted_risk: `${cf.type}は当たり前になっている可能性があり、外すとペルソナの期待に応えられず、離脱リスクが高まる可能性がある`,
        supporting_banners: supportingBanners,
        category: 'high_frequency',
        // どのペルソナに強く効いているか（後で設定）
        persona_relevance: [],
        // バナー/LP企画に使うための問い（ペルソナ × 市場前提を起点）
        planning_hooks: [
          {
            question: `${cf.type}を外す場合、各ペルソナのどの不安・期待にどう応えるか？`,
            context: `${cf.type}は${cf.percentage}%のバナーで使用されている。外す場合、ペルソナごとに異なる代替手段を検討する必要がある可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
          {
            question: `${cf.type}を含める場合、どのペルソナにどう伝えるべきか？`,
            context: `市場で一般的な${cf.type}だが、ペルソナごとに重視するポイントが異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
        ],
      };

      // ペルソナ関連性を判定
      insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

      insights.push(insight);
    });

  // 高頻度訴求軸から構造を読み取る
  aggregation.appeal_axis_frequencies
    .filter((af) => af.percentage >= 70)
    .forEach((af) => {
      const supportingBanners = extractions
        .filter((e) => e.appeal_axes.some((a) => a.type === af.type))
        .map((e) => e.banner_id);

      // BBox参照を取得
      const bboxReferences = extractions
        .filter((e) => e.appeal_axes.some((a) => a.type === af.type))
        .flatMap((e) =>
          e.appeal_axes
            .filter((a) => a.type === af.type)
            .map((a) => ({
              banner_id: e.banner_id,
              bbox: a.bbox,
            }))
        )
        .slice(0, 3); // 最大3件まで

      const insight: MarketInsight = {
        // 1. 想定されているペルソナ前提（人の不安・制約）
        persona_assumption: {
          assumption: `ペルソナは${af.type}訴求を重視している、または${af.type}がないと判断できない可能性がある`,
          evidence: `${af.percentage}%のバナーで使用（${af.count}件）`,
        },
        // 2. 観測された競合の選択（事実 + 根拠）
        competitor_choice: {
          choice: `${af.type}訴求を採用している`,
          evidence: `${af.percentage}%のバナーで使用（${af.count}件）`,
          bbox_references: bboxReferences.length > 0 ? bboxReferences : undefined,
        },
        // 3. なぜその選択が合理的か（仮説）
        rationality_hypothesis: `ペルソナの重視ポイントや判断基準に合わせるため、${af.type}訴求を選択している可能性がある`,
        // 4. 当たり前になっている可能性（外すとリスク）
        taken_for_granted_risk: `${af.type}訴求は当たり前になっている可能性があり、外すとペルソナの判断材料が不足し、離脱リスクが高まる可能性がある`,
        supporting_banners: supportingBanners,
        category: 'high_frequency',
        // どのペルソナに強く効いているか（後で設定）
        persona_relevance: [],
        // バナー/LP企画に使うための問い（ペルソナ × 市場前提を起点）
        planning_hooks: [
          {
            question: `${af.type}訴求を外す場合、各ペルソナの判断基準にどう応えるか？`,
            context: `${af.type}訴求は${af.percentage}%のバナーで使用されている。外す場合、ペルソナごとに異なる判断基準に応える必要がある可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
          {
            question: `${af.type}訴求を伝える場合、どのペルソナにどう伝えるべきか？`,
            context: `市場で一般的な${af.type}訴求だが、ペルソナごとに重視する表現が異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
        ],
      };

      // ペルソナ関連性を判定
      insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

      insights.push(insight);
    });

  // 低頻度要素から構造を読み取る
  aggregation.component_frequencies
    .filter((cf) => cf.percentage <= 20 && cf.count >= 2)
    .forEach((cf) => {
      const supportingBanners = extractions
        .filter((e) => e.components.some((c) => c.type === cf.type))
        .map((e) => e.banner_id);

      const insight: MarketInsight = {
        // 1. 想定されているペルソナ前提（人の不安・制約）
        persona_assumption: {
          assumption: `ペルソナは${cf.type}に対して否定的、無関心、または不要と感じている可能性がある`,
          evidence: `${cf.percentage}%のバナーのみ使用（${cf.count}件）`,
        },
        // 2. 観測された競合の選択（事実 + 根拠）
        competitor_choice: {
          choice: `${cf.type}を避けている`,
          evidence: `${cf.percentage}%のバナーのみ使用（${cf.count}件）`,
        },
        // 3. なぜその選択が合理的か（仮説）
        rationality_hypothesis: `ペルソナの反応を避ける、または不要と判断するため、${cf.type}を使わない選択が合理的である可能性がある`,
        // 4. 当たり前になっている可能性（外すとリスク）
        taken_for_granted_risk: `${cf.type}を避けることが当たり前になっている可能性があり、使うとペルソナの反発や混乱を招くリスクがある可能性がある`,
        supporting_banners: supportingBanners,
        category: 'low_frequency',
        // どのペルソナに強く効いているか（後で設定）
        persona_relevance: [],
        // バナー/LP企画に使うための問い（ペルソナ × 市場前提を起点）
        planning_hooks: [
          {
            question: `${cf.type}を使う場合、各ペルソナの反発をどう回避するか？`,
            context: `${cf.type}は${cf.percentage}%のバナーのみ使用されている。使う場合、ペルソナごとに異なる説明・文脈を検討する必要がある可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
          {
            question: `${cf.type}を避ける場合、各ペルソナの機能をどう代替するか？`,
            context: `市場で避けられている要素だが、ペルソナごとに必要な機能が異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
        ],
      };

      // ペルソナ関連性を判定
      insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

      insights.push(insight);
    });

  // よくある組み合わせから構造を読み取る
  aggregation.component_appeal_combinations
    .filter((combo) => combo.percentage >= 50)
    .forEach((combo) => {
      const insight: MarketInsight = {
        // 1. 想定されているペルソナ前提（人の不安・制約）
        persona_assumption: {
          assumption: `ペルソナは特定の要素と訴求の組み合わせを期待している、または組み合わせがないと判断できない可能性がある`,
          evidence: `${combo.percentage}%のバナーで組み合わせ使用（${combo.count}件）`,
        },
        // 2. 観測された競合の選択（事実 + 根拠）
        competitor_choice: {
          choice: `${combo.components.join(' + ')} と ${combo.appeal_axes.join(' + ')} を組み合わせている`,
          evidence: `${combo.percentage}%のバナーで組み合わせ使用（${combo.count}件）`,
        },
        // 3. なぜその選択が合理的か（仮説）
        rationality_hypothesis: `ペルソナの期待する組み合わせに合わせるため、このセットで使用する選択が合理的である可能性がある`,
        // 4. 当たり前になっている可能性（外すとリスク）
        taken_for_granted_risk: `この組み合わせは当たり前になっている可能性があり、片方だけではペルソナの期待に応えられず、離脱リスクが高まる可能性がある`,
        supporting_banners: combo.banner_ids,
        category: 'combination',
        // どのペルソナに強く効いているか（後で設定）
        persona_relevance: [],
        // バナー/LP企画に使うための問い（ペルソナ × 市場前提を起点）
        planning_hooks: [
          {
            question: `この組み合わせを外す場合、各ペルソナの期待にどう応えるか？`,
            context: `${combo.components.join(' + ')} と ${combo.appeal_axes.join(' + ')} は${combo.percentage}%のバナーで組み合わせ使用されている。外す場合、ペルソナごとに異なる代替手段を検討する必要がある可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
          {
            question: `この組み合わせを使う場合、どのペルソナにどう提示すべきか？`,
            context: `市場で一般的な組み合わせだが、ペルソナごとに重視する順序・配置が異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
        ],
      };

      // ペルソナ関連性を判定
      insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

      insights.push(insight);
    });

  // ブランド別差分から構造を読み取る
  if (aggregation.brand_differences) {
    aggregation.brand_differences.forEach((bd) => {
      bd.differences.forEach((diff) => {
        const supportingBanners = extractions
          .filter((e) => e.brand === bd.brand)
          .map((e) => e.banner_id);

          const insight: MarketInsight = {
            // 1. 想定されているペルソナ前提（人の不安・制約）
            persona_assumption: {
              assumption: `${bd.brand}のターゲットペルソナは、他のブランドとは異なる前提・不安・制約を持っている可能性がある`,
              evidence: `${bd.brand}のみの特徴`,
            },
            // 2. 観測された競合の選択（事実 + 根拠）
            competitor_choice: {
              choice: diff.detail,
              evidence: `${bd.brand}のみの特徴`,
            },
            // 3. なぜその選択が合理的か（仮説）
            rationality_hypothesis: `${bd.brand}は独自のペルソナ理解に基づき、異なる構成を選択している可能性がある`,
            // 4. 当たり前になっている可能性（外すとリスク）
            taken_for_granted_risk: `${bd.brand}の選択は、そのペルソナ層では当たり前になっている可能性があり、他のブランドと同じ構成では期待に応えられないリスクがある可能性がある`,
            supporting_banners: supportingBanners,
            category: 'brand_difference',
            // どのペルソナに強く効いているか（後で設定）
            persona_relevance: [],
            // バナー/LP企画に使うための問い（ペルソナ × 市場前提を起点）
            planning_hooks: [
              {
                question: `${bd.brand}の選択を参考にする場合、各ペルソナとの違いをどう考慮するか？`,
                context: `${bd.brand}は独自の構成を採用している。自社のペルソナごとに異なる調整が必要な可能性がある`,
                related_persona_ids: personas.map((p) => p.id),
              },
              {
                question: `${bd.brand}と異なる選択をする場合、各ペルソナにどう説明するか？`,
                context: `市場の一般的な選択と異なる場合、ペルソナごとに異なる説明が必要な可能性がある`,
                related_persona_ids: personas.map((p) => p.id),
              },
            ],
          };

          // ペルソナ関連性を判定
          insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

          insights.push(insight);
        });
      });
    });
  }

  return insights;
}

/**
 * Strategy Options (C2) 生成
 * C1のMarket Insightから、自社の選択肢を生成
 * ペルソナ別に「同調/ずらす/外す」のリスク感を変えて提示
 */
export function generateStrategyOptions(
  marketInsights: MarketInsight[],
  aggregation: Aggregation,
  personas: Persona[] = []
): StrategyOption[] {
  const options: StrategyOption[] = [];

  // 高頻度要素・訴求軸を抽出
  const highFreqComponents = aggregation.component_frequencies
    .filter((cf) => cf.percentage >= 70)
    .map((cf) => cf.type);
  const highFreqAppeals = aggregation.appeal_axis_frequencies
    .filter((af) => af.percentage >= 70)
    .map((af) => af.type);

  const lowFreqComponents = aggregation.component_frequencies
    .filter((cf) => cf.percentage <= 20)
    .map((cf) => cf.type);
  const lowFreqAppeals = aggregation.appeal_axis_frequencies
    .filter((af) => af.percentage <= 20)
    .map((af) => af.type);

  // Option A: 市場に同調する
  const optionA: StrategyOption = {
    option_type: 'A',
    title: '市場に同調する',
    referenced_elements: {
      components: highFreqComponents,
      appeal_axes: highFreqAppeals,
    },
    avoided_elements: {
      components: lowFreqComponents,
      appeal_axes: lowFreqAppeals,
    },
    potential_benefits: [
      '市場の期待に応えやすい可能性がある',
      'ユーザーが理解しやすい構成になる可能性がある',
    ],
    potential_risks: [
      '差別化が難しくなる可能性がある',
      '競合と同じに見える可能性がある',
    ],
    persona_risk_assessment: personas.map((persona) => {
      // 高頻度要素・訴求軸がペルソナの不安・判断基準と一致する場合、リスクは低い
      const hasHighRelevance = marketInsights.some(
        (mi) =>
          mi.persona_relevance.some(
            (pr) => pr.persona_id === persona.id && pr.relevance_level === 'high'
          )
      );
      return {
        persona_id: persona.id,
        risk_level: hasHighRelevance ? 'low' : 'medium',
        reasoning: hasHighRelevance
          ? `${persona.name}の不安・判断基準と市場の選択が一致している可能性があるため、同調するリスクは低い可能性がある`
          : `${persona.name}との一致度が中程度のため、同調するリスクは中程度である可能性がある`,
      };
    }),
  };
  options.push(optionA);

  // Option B: 部分的にずらす
  const optionB: StrategyOption = {
    option_type: 'B',
    title: '部分的にずらす',
    referenced_elements: {
      components: highFreqComponents.slice(0, Math.ceil(highFreqComponents.length / 2)),
      appeal_axes: highFreqAppeals.slice(0, Math.ceil(highFreqAppeals.length / 2)),
    },
    avoided_elements: {
      components: highFreqComponents.slice(Math.ceil(highFreqComponents.length / 2)),
      appeal_axes: highFreqAppeals.slice(Math.ceil(highFreqAppeals.length / 2)),
    },
    potential_benefits: [
      '市場の前提を維持しつつ、一部で差別化できる可能性がある',
      '理解しやすさと独自性のバランスを取りやすい可能性がある',
    ],
    potential_risks: [
      '中途半端に見える可能性がある',
      '何が違うのか伝わりにくい可能性がある',
    ],
    persona_risk_assessment: personas.map((persona) => {
      // 部分的にずらす場合、リスクは中程度
      return {
        persona_id: persona.id,
        risk_level: 'medium',
        reasoning: `${persona.name}に対して、市場の前提を一部維持しつつ差別化する場合、リスクは中程度である可能性がある`,
      };
    }),
  };
  options.push(optionB);

  // Option C: あえて外す
  const optionC: StrategyOption = {
    option_type: 'C',
    title: 'あえて外す',
    referenced_elements: {
      components: lowFreqComponents,
      appeal_axes: lowFreqAppeals,
    },
    avoided_elements: {
      components: highFreqComponents,
      appeal_axes: highFreqAppeals,
    },
    potential_benefits: [
      '明確な差別化ができる可能性がある',
      '独自性を打ち出しやすい可能性がある',
    ],
    potential_risks: [
      'ユーザーが理解しにくくなる可能性がある',
      '期待外れと感じられる可能性がある',
    ],
    persona_risk_assessment: personas.map((persona) => {
      // 高頻度要素・訴求軸がペルソナの不安・判断基準と一致する場合、外すリスクは高い
      const hasHighRelevance = marketInsights.some(
        (mi) =>
          mi.persona_relevance.some(
            (pr) => pr.persona_id === persona.id && pr.relevance_level === 'high'
          )
      );
      return {
        persona_id: persona.id,
        risk_level: hasHighRelevance ? 'high' : 'medium',
        reasoning: hasHighRelevance
          ? `${persona.name}の不安・判断基準と市場の選択が一致している可能性があるため、外すリスクは高い可能性がある`
          : `${persona.name}との一致度が中程度のため、外すリスクは中程度である可能性がある`,
      };
    }),
  };
  options.push(optionC);

  return options;
}

/**
 * Planning Hooks (D) 生成
 * 各Strategy Optionから、バナー/LP企画に使える"問い"を生成
 * 「ペルソナ × 市場前提」を起点とした問い
 */
export function generatePlanningHooks(
  strategyOptions: StrategyOption[],
  marketInsights: MarketInsight[],
  personas: Persona[] = []
): PlanningHook[] {
  return strategyOptions.map((option) => {
    const hooks: PlanningHook['hooks'] = [];

    // Option A: 市場に同調する場合の問い
    if (option.option_type === 'A') {
      hooks.push({
        question: '市場の期待に応えるため、各ペルソナのFVで何を最初に伝えるべきか？',
        context: `参考にする訴求軸: ${option.referenced_elements.appeal_axes?.join(', ') || 'なし'}。市場で高頻度の訴求軸を採用する場合、ペルソナごとに最初に期待する情報が異なる可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
        related_insights: marketInsights
          .filter((mi) => mi.category === 'high_frequency')
          .map((_, idx) => `insight-${idx}`),
      });

      hooks.push({
        question: '市場で説明不要とされている要素は何か？各ペルソナに対して、それ以外はどう説明すべきか？',
        context: `参考にする要素: ${option.referenced_elements.components?.join(', ') || 'なし'}。市場で高頻度の要素は説明不要の可能性があるが、ペルソナごとに説明が必要な要素が異なる可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
        related_insights: marketInsights
          .filter((mi) => mi.category === 'high_frequency')
          .map((_, idx) => `insight-${idx}`),
      });
    }

    // Option B: 部分的にずらす場合の問い
    if (option.option_type === 'B') {
      hooks.push({
        question: '市場の前提を維持しつつ、各ペルソナに対してどこで差別化を打ち出すか？',
        context: `参考にする要素: ${option.referenced_elements.components?.join(', ') || 'なし'}。使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。市場の期待を満たしつつ、ペルソナごとに異なる独自性を示すポイントがある可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
      });

      hooks.push({
        question: '市場の期待と異なる部分を、各ペルソナにどう説明すれば誤解を避けられるか？',
        context: `使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。市場で一般的な要素を使わない場合、ペルソナごとに異なる説明が必要な可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
      });
    }

    // Option C: あえて外す場合の問い
    if (option.option_type === 'C') {
      hooks.push({
        question: '市場の期待を外すことで、各ペルソナに対してどのような新しい価値を提示できるか？',
        context: `参考にする要素: ${option.referenced_elements.components?.join(', ') || 'なし'}。使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。市場の前提から外れることで、ペルソナごとに異なる新しいメッセージを伝えられる可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
      });

      hooks.push({
        question: '市場の期待と異なる表現を選ぶ場合、各ペルソナにどう理解してもらうか？',
        context: `使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。市場で一般的な要素を避ける場合、ペルソナごとに異なる説明・表現が必要な可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
      });
    }

    // 共通の問い（ペルソナ × 市場前提を起点）
    hooks.push({
      question: 'このOptionを選ぶ場合、各ペルソナのどの前提・期待に応え、どこで独自性を示すか？',
      context: `市場の前提と自社の独自性のバランスを、ペルソナごとに異なる形で取る必要がある可能性がある`,
      related_persona_ids: personas.map((p) => p.id),
      related_insights: marketInsights.map((_, idx) => `insight-${idx}`),
    });

    return {
      strategy_option: option.option_type,
      hooks,
    };
  });
}
