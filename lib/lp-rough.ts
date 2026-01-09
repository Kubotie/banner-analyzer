import { StrategyOption, MarketInsight, Persona, LPRough } from '@/types/schema';

/**
 * LPラフ生成ロジック
 * Strategy Optionに応じて、LP構成の骨子を生成
 */
export function generateLPRough(
  strategyOption: StrategyOption,
  marketInsights: MarketInsight[],
  personas: Persona[]
): LPRough {
  const sections: LPRough['sections'] = [];
  const cautions: LPRough['cautions'] = [];
  const planningHooks: LPRough['planning_hooks'] = [];

  // Option A: 市場に同調する
  // 当たり前→安心→納得→CTA→FAQの順を基本
  if (strategyOption.option_type === 'A') {
    // 1. 当たり前の提示
    const highFreqInsights = marketInsights.filter((mi) => mi.category === 'high_frequency');
    sections.push({
      section_name: '当たり前の提示',
      order: 1,
      purpose: '市場で当たり前になっている要素を提示することで、ペルソナの期待に応える可能性がある',
      include: [
        '市場で高頻度の要素（商品画像、ロゴ、価格など）を含める可能性がある',
        '市場で高頻度の訴求軸（価格、限定など）を含める可能性がある',
      ],
      evidence_links: {
        related_insights: highFreqInsights.map((_, idx) => String(idx)),
        related_persona_ids: strategyOption.persona_risk_assessment
          .filter((pra) => pra.persona_overlay === 'high')
          .map((pra) => pra.persona_id),
      },
    });

    // 2. 安心の提示
    const personaHighRelevance = personas.filter((p) =>
      strategyOption.persona_risk_assessment.some(
        (pra) => pra.persona_id === p.id && pra.persona_overlay === 'high'
      )
    );
    sections.push({
      section_name: '安心の提示',
      order: 2,
      purpose: 'ペルソナの不安（品質の不確実性、失敗リスクなど）を解消する可能性がある',
      include: [
        '社会的証明（レビュー、評価など）を含める可能性がある',
        '保証・アフターサービス情報を含める可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personaHighRelevance.map((p) => p.id),
        related_insights: marketInsights
          .filter((mi) =>
            mi.persona_relevance.some((pr) =>
              personaHighRelevance.some((p) => p.id === pr.persona_id && pr.relevance_level === 'high')
            )
          )
          .map((_, idx) => String(idx)),
      },
    });

    // 3. 納得の提示
    sections.push({
      section_name: '納得の提示',
      order: 3,
      purpose: 'ペルソナの判断基準（価格の明確さ、効果など）に応える可能性がある',
      include: [
        '詳細情報（効果、仕組みなど）を含める可能性がある',
        '比較情報（他社との違いなど）を含める可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });

    // 4. CTA
    sections.push({
      section_name: 'CTA（行動喚起）',
      order: 4,
      purpose: 'ペルソナの行動パターン（すぐに判断、試しやすいなど）に応える可能性がある',
      include: [
        '明確な行動指示を含める可能性がある',
        'リスクを下げる要素（無料お試し、返金保証など）を含める可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });

    // 5. FAQ
    sections.push({
      section_name: 'FAQ（よくある質問）',
      order: 5,
      purpose: 'ペルソナの不安や疑問を事前に解消する可能性がある',
      include: [
        'よくある質問と回答を含める可能性がある',
        '誤解されやすいポイントを明確にする可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });
  }

  // Option B: 部分的にずらす
  // 当たり前＋差分→差分説明→安心→CTA→FAQ
  else if (strategyOption.option_type === 'B') {
    // 1. 当たり前＋差分の提示
    const highFreqInsights = marketInsights.filter((mi) => mi.category === 'high_frequency');
    sections.push({
      section_name: '当たり前＋差分の提示',
      order: 1,
      purpose: '市場の前提を維持しつつ、一部で差別化を示す可能性がある',
      include: [
        '市場で高頻度の要素を含める可能性がある',
        '市場と異なる要素（差別化ポイント）を含める可能性がある',
      ],
      evidence_links: {
        related_insights: highFreqInsights.map((_, idx) => `insight-${idx}`),
        related_persona_ids: strategyOption.persona_risk_assessment
          .filter((pra) => pra.persona_overlay === 'medium')
          .map((pra) => pra.persona_id),
      },
    });

    // 2. 差分説明
    sections.push({
      section_name: '差分説明',
      order: 2,
      purpose: '市場の期待と異なる部分を、ペルソナに誤解なく伝える可能性がある',
      include: [
        '市場で一般的な要素を使わない理由を含める可能性がある',
        '代替手段や新しい価値を説明する可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
        related_insights: marketInsights
          .filter((mi) => mi.category === 'low_frequency')
          .map((_, idx) => String(idx)),
      },
    });

    // 3. 安心の提示
    sections.push({
      section_name: '安心の提示',
      order: 3,
      purpose: 'ペルソナの不安を解消する可能性がある',
      include: [
        '社会的証明を含める可能性がある',
        '保証・アフターサービス情報を含める可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });

    // 4. CTA
    sections.push({
      section_name: 'CTA（行動喚起）',
      order: 4,
      purpose: 'ペルソナの行動パターンに応える可能性がある',
      include: [
        '明確な行動指示を含める可能性がある',
        'リスクを下げる要素を含める可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });

    // 5. FAQ
    sections.push({
      section_name: 'FAQ（よくある質問）',
      order: 5,
      purpose: 'ペルソナの不安や疑問を事前に解消する可能性がある',
      include: [
        'よくある質問と回答を含める可能性がある',
        '誤解されやすいポイントを明確にする可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });
  }

  // Option C: あえて外す
  // 前提転換→理由→代替安心→具体→CTA→FAQ
  else if (strategyOption.option_type === 'C') {
    // 1. 前提転換
    const lowFreqInsights = marketInsights.filter((mi) => mi.category === 'low_frequency');
    sections.push({
      section_name: '前提転換',
      order: 1,
      purpose: '市場の前提から外れることを、ペルソナに理解してもらう可能性がある',
      include: [
        '市場で一般的な要素を使わないことを明示する可能性がある',
        '新しい前提・価値を提示する可能性がある',
      ],
      evidence_links: {
        related_insights: lowFreqInsights.map((_, idx) => `insight-${idx}`),
        related_persona_ids: strategyOption.persona_risk_assessment
          .filter((pra) => pra.persona_overlay === 'low')
          .map((pra) => pra.persona_id),
      },
    });

    // 2. 理由
    sections.push({
      section_name: '理由',
      order: 2,
      purpose: '市場の前提から外れる理由を、ペルソナに納得してもらう可能性がある',
      include: [
        '市場の前提から外れる理由を含める可能性がある',
        '新しい価値やメリットを説明する可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
        related_insights: marketInsights.map((_, idx) => `insight-${idx}`),
      },
    });

    // 3. 代替安心
    sections.push({
      section_name: '代替安心',
      order: 3,
      purpose: '市場の一般的な安心要素がない場合の、代替的な安心要素を提示する可能性がある',
      include: [
        '市場で一般的な安心要素の代替手段を含める可能性がある',
        '新しい安心要素（独自の保証、実績など）を含める可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });

    // 4. 具体
    sections.push({
      section_name: '具体',
      order: 4,
      purpose: '新しい価値を具体的に示す可能性がある',
      include: [
        '具体的な効果や結果を含める可能性がある',
        '事例や実績を含める可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });

    // 5. CTA
    sections.push({
      section_name: 'CTA（行動喚起）',
      order: 5,
      purpose: 'ペルソナの行動パターンに応える可能性がある',
      include: [
        '明確な行動指示を含める可能性がある',
        'リスクを下げる要素を含める可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });

    // 6. FAQ
    sections.push({
      section_name: 'FAQ（よくある質問）',
      order: 6,
      purpose: 'ペルソナの不安や疑問を事前に解消する可能性がある',
      include: [
        'よくある質問と回答を含める可能性がある',
        '誤解されやすいポイントを明確にする可能性がある',
      ],
      evidence_links: {
        related_persona_ids: personas.map((p) => p.id),
      },
    });
  }

  // 注意点を生成
  const highRiskPersonas = strategyOption.persona_risk_assessment.filter(
    (pra) => pra.risk_level === 'high'
  );
  if (highRiskPersonas.length > 0) {
    cautions.push({
      point: '高リスクペルソナに対して、市場の前提から外れる場合の説明が不十分だと誤解される可能性がある',
      condition: '高リスクペルソナの不安・判断基準に応えられない場合、離脱リスクが高まる可能性がある',
      evidence_links: {
        related_persona_ids: highRiskPersonas.map((pra) => pra.persona_id),
        related_insights: marketInsights
          .filter((mi) =>
            mi.persona_relevance.some((pr) =>
              highRiskPersonas.some((pra) => pra.persona_id === pr.persona_id)
            )
          )
          .map((_, idx) => String(idx)),
      },
    });
  }

  // Planning Hooksを生成
  sections.forEach((section) => {
    planningHooks.push({
      question: `${section.section_name}で、どのペルソナにどう伝えるべきか？`,
      context: `${section.section_name}の目的は「${section.purpose}」である可能性がある`,
      related_section_order: section.order,
    });
  });

  return {
    strategy_option: strategyOption.option_type,
    sections,
    cautions,
    planning_hooks: planningHooks,
  };
}
