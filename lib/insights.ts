import { Aggregation, Extraction, MarketInsight, StrategyOption, PlanningHook, Persona } from '@/types/schema';
import { assessPersonaRelevance } from './persona';

/**
 * Market Insight (C1) 生成
 * 構造の読み取り：4要素必須 + ペルソナ関連性
 * ダミーのExtraction(A)を入力として、より深い内容のMarket Insightカードを生成
 */
export function generateMarketInsights(
  aggregation: Aggregation,
  extractions: Extraction[],
  personas: Persona[] = []
): MarketInsight[] {
  const insights: MarketInsight[] = [];

  // 高頻度要素から構造を読み取る（より深い内容で生成）
  aggregation.component_frequencies
    .filter((cf) => cf.percentage >= 60)
    .slice(0, 2) // 最大2件まで（最低3枚保証のため）
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

      // ペルソナの不安・制約を抽出（より具体的に）
      const relevantPersonas = personas.filter((p) => {
        // 価格関連要素の場合
        if (cf.type === '価格' || cf.type === '期間限定') {
          return p.concerns.some((c) => c.includes('コスト') || c.includes('価格') || c.includes('割引'));
        }
        // レビュー・社会的証明関連要素の場合
        if (cf.type === 'レビュー' || cf.type === 'バッジ') {
          return p.concerns.some((c) => c.includes('品質') || c.includes('信頼') || c.includes('不確実'));
        }
        // 保証関連要素の場合
        if (cf.type === '保証') {
          return p.concerns.some((c) => c.includes('リスク') || c.includes('失敗') || c.includes('不安'));
        }
        return true;
      });

      // 1. 想定されているペルソナ前提（人の不安・制約・心理状態）
      let personaAssumption = '';
      if (cf.type === '価格' || cf.type === '期間限定') {
        personaAssumption = 'コスト意識の高いペルソナは「価格が明確でないと不安を感じる」「割引がないと損をした気分になる」「価格比較ができないと判断できない」という心理状態にある可能性がある';
      } else if (cf.type === 'レビュー' || cf.type === 'バッジ') {
        personaAssumption = '品質重視のペルソナは「レビューや評価がないと判断できない」「社会的証明がないと不安を感じる」「他者の評価を信頼できないと決断できない」という制約を持っている可能性がある';
      } else if (cf.type === '保証') {
        personaAssumption = 'リスク回避志向のペルソナは「失敗リスクを負いたくない」「試す前に保証がないと不安を感じる」「後戻りできないと判断できない」という前提を持っている可能性がある';
      } else {
        personaAssumption = `ペルソナは${cf.type}がないと不安を感じる、または${cf.type}の存在を前提として期待している可能性がある`;
      }

      // 2. 観測された競合の選択（事実 + 根拠、より詳細に）
      const totalBanners = extractions.length;
      const usageCount = cf.count;
      const usagePercentage = Math.round((usageCount / totalBanners) * 100);
      const competitorChoice = `${cf.type}を使用している`;
      const evidence = `${usagePercentage}%のバナーで使用（${usageCount}件/${totalBanners}件）。${cf.type}を含むバナーの割合は${usagePercentage}%である`;

      // 3. なぜその選択が合理的か（仮説、より深く）
      let rationalityHypothesis = '';
      if (cf.type === '価格' || cf.type === '期間限定') {
        rationalityHypothesis = 'コスト意識の高いペルソナの不安（無駄な出費への懸念）と判断基準（価格の明確さ、割引率への期待）に応えるため、価格訴求と期間限定を組み合わせる選択が合理的である可能性がある';
      } else if (cf.type === 'レビュー' || cf.type === 'バッジ') {
        rationalityHypothesis = '品質重視のペルソナの不安（品質の不確実性、失敗リスク）と判断基準（レビュー・評価、社会的証明への依存）に応えるため、効果訴求と社会的証明を組み合わせる選択が合理的である可能性がある';
      } else if (cf.type === '保証') {
        rationalityHypothesis = 'リスク回避志向のペルソナの不安（失敗リスク、後戻りできないことへの懸念）と判断基準（保証・アフターサービスへの期待）に応えるため、安心訴求と保証要素を組み合わせる選択が合理的である可能性がある';
      } else {
        rationalityHypothesis = `ペルソナの期待や不安に応えるため、${cf.type}を含める選択が合理的である可能性がある`;
      }

      // 4. 当たり前になっている可能性（外すとリスク、より具体的に）
      let takenForGrantedRisk = '';
      if (cf.type === '価格' || cf.type === '期間限定') {
        takenForGrantedRisk = '価格訴求と期間限定の組み合わせは当たり前になっている可能性があり、外すとコスト意識の高いペルソナの期待に応えられず、離脱リスクが高まる可能性がある';
      } else if (cf.type === 'レビュー' || cf.type === 'バッジ') {
        takenForGrantedRisk = '効果訴求と社会的証明の組み合わせは、品質重視のペルソナ層では当たり前になっている可能性があり、外すと判断材料が不足し、離脱リスクが高まる可能性がある';
      } else if (cf.type === '保証') {
        takenForGrantedRisk = '安心訴求と保証要素の組み合わせは、リスク回避志向のペルソナ層では当たり前になっている可能性があり、外すと不安が高まり、離脱リスクが高まる可能性がある';
      } else {
        takenForGrantedRisk = `${cf.type}は当たり前になっている可能性があり、外すとペルソナの期待に応えられず、離脱リスクが高まる可能性がある`;
      }

      const insight: MarketInsight = {
        persona_assumption: {
          assumption: personaAssumption,
          evidence: `${usagePercentage}%のバナーで使用（${usageCount}件）`,
        },
        competitor_choice: {
          choice: competitorChoice,
          evidence: evidence,
          bbox_references: bboxReferences.length > 0 ? bboxReferences : undefined,
        },
        rationality_hypothesis: rationalityHypothesis,
        taken_for_granted_risk: takenForGrantedRisk,
        supporting_banners: supportingBanners,
        category: 'high_frequency',
        persona_relevance: [],
        // Planning Hooks: 3つ生成（必須）
        planning_hooks: [
          {
            question: `${cf.type}を外す場合、各ペルソナのどの不安・期待にどう応えるか？`,
            context: `${cf.type}は${usagePercentage}%のバナーで使用されている。外す場合、ペルソナごとに異なる代替手段を検討する必要がある可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
          {
            question: `${cf.type}を含める場合、どのペルソナにどう伝えるべきか？`,
            context: `市場で一般的な${cf.type}だが、ペルソナごとに重視するポイントが異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
          {
            question: `${cf.type}を強調する場合、各ペルソナの判断基準のどこに焦点を当てるべきか？`,
            context: `${cf.type}は${usagePercentage}%のバナーで使用されているが、ペルソナごとに判断基準が異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
        ],
      };

      // ペルソナ関連性を判定（より詳細な判断理由を生成）
      insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

      insights.push(insight);
    });

  // 高頻度訴求軸から構造を読み取る（より深い内容で生成）
  aggregation.appeal_axis_frequencies
    .filter((af) => af.percentage >= 50)
    .slice(0, 1) // 最低3枚保証のため、1件のみ
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

      const totalBanners = extractions.length;
      const usageCount = af.count;
      const usagePercentage = Math.round((usageCount / totalBanners) * 100);

      // 1. 想定されているペルソナ前提（人の不安・制約・心理状態）
      let personaAssumption = '';
      if (af.type === '価格') {
        personaAssumption = 'コスト意識の高いペルソナは「価格が明確でないと不安を感じる」「割引がないと損をした気分になる」「価格比較ができないと判断できない」という心理状態にある可能性がある';
      } else if (af.type === '効果') {
        personaAssumption = '品質重視のペルソナは「効果が不明確だと判断できない」「期待する結果が得られないと不安を感じる」「効果の根拠がないと信頼できない」という制約を持っている可能性がある';
      } else if (af.type === '安心') {
        personaAssumption = 'リスク回避志向のペルソナは「失敗リスクを負いたくない」「試す前に保証がないと不安を感じる」「後戻りできないと判断できない」という前提を持っている可能性がある';
      } else if (af.type === '時短') {
        personaAssumption = '時短重視のペルソナは「時間の無駄を避けたい」「手間がかかると離脱する」「複雑さに耐えられない」という心理状態にある可能性がある';
      } else {
        personaAssumption = `ペルソナは${af.type}訴求を重視している、または${af.type}がないと判断できない可能性がある`;
      }

      // 2. 観測された競合の選択（事実 + 根拠、より詳細に）
      const competitorChoice = `${af.type}訴求を採用している`;
      const evidence = `${usagePercentage}%のバナーで使用（${usageCount}件/${totalBanners}件）。${af.type}訴求を含むバナーの割合は${usagePercentage}%である`;

      // 3. なぜその選択が合理的か（仮説、より深く）
      let rationalityHypothesis = '';
      if (af.type === '価格') {
        rationalityHypothesis = 'コスト意識の高いペルソナの不安（無駄な出費への懸念）と判断基準（価格の明確さ、割引率への期待）に応えるため、価格訴求を選択している可能性がある';
      } else if (af.type === '効果') {
        rationalityHypothesis = '品質重視のペルソナの不安（品質の不確実性、失敗リスク）と判断基準（効果への期待、結果への依存）に応えるため、効果訴求を選択している可能性がある';
      } else if (af.type === '安心') {
        rationalityHypothesis = 'リスク回避志向のペルソナの不安（失敗リスク、後戻りできないことへの懸念）と判断基準（保証・アフターサービスへの期待）に応えるため、安心訴求を選択している可能性がある';
      } else if (af.type === '時短') {
        rationalityHypothesis = '時短重視のペルソナの不安（時間の無駄、手間への懸念）と判断基準（手軽さ、スピードへの期待）に応えるため、時短訴求を選択している可能性がある';
      } else {
        rationalityHypothesis = `ペルソナの重視ポイントや判断基準に合わせるため、${af.type}訴求を選択している可能性がある`;
      }

      // 4. 当たり前になっている可能性（外すとリスク、より具体的に）
      let takenForGrantedRisk = '';
      if (af.type === '価格') {
        takenForGrantedRisk = '価格訴求は当たり前になっている可能性があり、外すとコスト意識の高いペルソナの期待に応えられず、離脱リスクが高まる可能性がある';
      } else if (af.type === '効果') {
        takenForGrantedRisk = '効果訴求は、品質重視のペルソナ層では当たり前になっている可能性があり、外すと判断材料が不足し、離脱リスクが高まる可能性がある';
      } else if (af.type === '安心') {
        takenForGrantedRisk = '安心訴求は、リスク回避志向のペルソナ層では当たり前になっている可能性があり、外すと不安が高まり、離脱リスクが高まる可能性がある';
      } else if (af.type === '時短') {
        takenForGrantedRisk = '時短訴求は、時短重視のペルソナ層では当たり前になっている可能性があり、外すと手間を感じさせ、離脱リスクが高まる可能性がある';
      } else {
        takenForGrantedRisk = `${af.type}訴求は当たり前になっている可能性があり、外すとペルソナの判断材料が不足し、離脱リスクが高まる可能性がある`;
      }

      const insight: MarketInsight = {
        persona_assumption: {
          assumption: personaAssumption,
          evidence: `${usagePercentage}%のバナーで使用（${usageCount}件）`,
        },
        competitor_choice: {
          choice: competitorChoice,
          evidence: evidence,
          bbox_references: bboxReferences.length > 0 ? bboxReferences : undefined,
        },
        rationality_hypothesis: rationalityHypothesis,
        taken_for_granted_risk: takenForGrantedRisk,
        supporting_banners: supportingBanners,
        category: 'high_frequency',
        persona_relevance: [],
        // Planning Hooks: 3つ生成（必須）
        planning_hooks: [
          {
            question: `${af.type}訴求を外す場合、各ペルソナの判断基準にどう応えるか？`,
            context: `${af.type}訴求は${usagePercentage}%のバナーで使用されている。外す場合、ペルソナごとに異なる判断基準に応える必要がある可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
          {
            question: `${af.type}訴求を伝える場合、どのペルソナにどう伝えるべきか？`,
            context: `市場で一般的な${af.type}訴求だが、ペルソナごとに重視する表現が異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
          {
            question: `${af.type}訴求を強調する場合、各ペルソナの不安・期待のどこに焦点を当てるべきか？`,
            context: `${af.type}訴求は${usagePercentage}%のバナーで使用されているが、ペルソナごとに不安・期待が異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
        ],
      };

      // ペルソナ関連性を判定（より詳細な判断理由を生成）
      insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

      insights.push(insight);
    });

  // 低頻度要素から構造を読み取る（最低3枚保証のため、1件のみ）
  aggregation.component_frequencies
    .filter((cf) => cf.percentage <= 30 && cf.count >= 1)
    .slice(0, 1)
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
        // Planning Hooks: 3つ生成（必須）
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
          {
            question: `${cf.type}を選択する場合、各ペルソナの判断基準のどこに焦点を当てるべきか？`,
            context: `${cf.type}は${cf.percentage}%のバナーのみ使用されているが、ペルソナごとに判断基準が異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
        ],
      };

      // ペルソナ関連性を判定
      insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

      insights.push(insight);
    });

  // よくある組み合わせから構造を読み取る（最低3枚保証のため、必要に応じて追加）
  // 既に3枚以上生成されている場合はスキップ
  if (insights.length < 3) {
    aggregation.component_appeal_combinations
      .filter((combo) => combo.percentage >= 40)
      .slice(0, 3 - insights.length) // 残り枚数分のみ生成
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
        // Planning Hooks: 3つ生成（必須）
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
          {
            question: `この組み合わせを強調する場合、各ペルソナの判断基準のどこに焦点を当てるべきか？`,
            context: `${combo.components.join(' + ')} と ${combo.appeal_axes.join(' + ')} は${combo.percentage}%のバナーで組み合わせ使用されているが、ペルソナごとに判断基準が異なる可能性がある`,
            related_persona_ids: personas.map((p) => p.id),
          },
        ],
      };

      // ペルソナ関連性を判定（より詳細な判断理由を生成）
      insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];

      insights.push(insight);
    });
  }

  // 最低3枚保証：不足している場合は追加生成
  if (insights.length < 3) {
    // 追加のMarket Insightを生成（高頻度要素から）
    const remainingCount = 3 - insights.length;
    aggregation.component_frequencies
      .filter((cf) => cf.percentage >= 40)
      .slice(0, remainingCount)
      .forEach((cf) => {
        const supportingBanners = extractions
          .filter((e) => e.components.some((c) => c.type === cf.type))
          .map((e) => e.banner_id);

        const totalBanners = extractions.length;
        const usageCount = cf.count;
        const usagePercentage = Math.round((usageCount / totalBanners) * 100);

        const insight: MarketInsight = {
          persona_assumption: {
            assumption: `ペルソナは${cf.type}がないと不安を感じる、または${cf.type}の存在を前提として期待している可能性がある`,
            evidence: `${usagePercentage}%のバナーで使用（${usageCount}件）`,
          },
          competitor_choice: {
            choice: `${cf.type}を使用している`,
            evidence: `${usagePercentage}%のバナーで使用（${usageCount}件/${totalBanners}件）`,
          },
          rationality_hypothesis: `ペルソナの期待や不安に応えるため、${cf.type}を含める選択が合理的である可能性がある`,
          taken_for_granted_risk: `${cf.type}は当たり前になっている可能性があり、外すとペルソナの期待に応えられず、離脱リスクが高まる可能性がある`,
          supporting_banners: supportingBanners,
          category: 'high_frequency',
          persona_relevance: [],
          planning_hooks: [
            {
              question: `${cf.type}を外す場合、各ペルソナのどの不安・期待にどう応えるか？`,
              context: `${cf.type}は${usagePercentage}%のバナーで使用されている。外す場合、ペルソナごとに異なる代替手段を検討する必要がある可能性がある`,
              related_persona_ids: personas.map((p) => p.id),
            },
            {
              question: `${cf.type}を含める場合、どのペルソナにどう伝えるべきか？`,
              context: `市場で一般的な${cf.type}だが、ペルソナごとに重視するポイントが異なる可能性がある`,
              related_persona_ids: personas.map((p) => p.id),
            },
            {
              question: `${cf.type}を強調する場合、各ペルソナの判断基準のどこに焦点を当てるべきか？`,
              context: `${cf.type}は${usagePercentage}%のバナーで使用されているが、ペルソナごとに判断基準が異なる可能性がある`,
              related_persona_ids: personas.map((p) => p.id),
            },
          ],
        };

        insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];
        insights.push(insight);
      });
  }

  // ブランド別差分から構造を読み取る（最低3枚保証のため、必要に応じて追加）
  if (insights.length < 3 && aggregation.brand_differences) {
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

  // 最低3枚保証：不足している場合は追加生成
  if (insights.length < 3) {
    const remainingCount = 3 - insights.length;
    // 高頻度訴求軸から追加生成
    aggregation.appeal_axis_frequencies
      .filter((af) => af.percentage >= 30)
      .slice(0, remainingCount)
      .forEach((af) => {
        const supportingBanners = extractions
          .filter((e) => e.appeal_axes.some((a) => a.type === af.type))
          .map((e) => e.banner_id);

        const totalBanners = extractions.length;
        const usageCount = af.count;
        const usagePercentage = Math.round((usageCount / totalBanners) * 100);

        const insight: MarketInsight = {
          persona_assumption: {
            assumption: `ペルソナは${af.type}訴求を重視している、または${af.type}がないと判断できない可能性がある`,
            evidence: `${usagePercentage}%のバナーで使用（${usageCount}件）`,
          },
          competitor_choice: {
            choice: `${af.type}訴求を採用している`,
            evidence: `${usagePercentage}%のバナーで使用（${usageCount}件/${totalBanners}件）`,
          },
          rationality_hypothesis: `ペルソナの重視ポイントや判断基準に合わせるため、${af.type}訴求を選択している可能性がある`,
          taken_for_granted_risk: `${af.type}訴求は当たり前になっている可能性があり、外すとペルソナの判断材料が不足し、離脱リスクが高まる可能性がある`,
          supporting_banners: supportingBanners,
          category: 'high_frequency',
          persona_relevance: [],
          planning_hooks: [
            {
              question: `${af.type}訴求を外す場合、各ペルソナの判断基準にどう応えるか？`,
              context: `${af.type}訴求は${usagePercentage}%のバナーで使用されている。外す場合、ペルソナごとに異なる判断基準に応える必要がある可能性がある`,
              related_persona_ids: personas.map((p) => p.id),
            },
            {
              question: `${af.type}訴求を伝える場合、どのペルソナにどう伝えるべきか？`,
              context: `市場で一般的な${af.type}訴求だが、ペルソナごとに重視する表現が異なる可能性がある`,
              related_persona_ids: personas.map((p) => p.id),
            },
            {
              question: `${af.type}訴求を強調する場合、各ペルソナの不安・期待のどこに焦点を当てるべきか？`,
              context: `${af.type}訴求は${usagePercentage}%のバナーで使用されているが、ペルソナごとに不安・期待が異なる可能性がある`,
              related_persona_ids: personas.map((p) => p.id),
            },
          ],
        };

        insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];
        insights.push(insight);
      });
  }

  // 最終的に最低3枚保証（それでも不足する場合は汎用的なインサイトを追加）
  while (insights.length < 3) {
    const insight: MarketInsight = {
      persona_assumption: {
        assumption: 'ペルソナは特定の要素や訴求がないと不安を感じる、またはそれらの存在を前提として期待している可能性がある',
        evidence: '複数のバナーで観測された',
      },
      competitor_choice: {
        choice: '特定の要素や訴求を採用している',
        evidence: '複数のバナーで観測された',
      },
      rationality_hypothesis: 'ペルソナの期待や不安に応えるため、特定の要素や訴求を含める選択が合理的である可能性がある',
      taken_for_granted_risk: '特定の要素や訴求は当たり前になっている可能性があり、外すとペルソナの期待に応えられず、離脱リスクが高まる可能性がある',
      supporting_banners: extractions.slice(0, 2).map((e) => e.banner_id),
      category: 'high_frequency',
      persona_relevance: [],
      planning_hooks: [
        {
          question: '特定の要素や訴求を外す場合、各ペルソナのどの不安・期待にどう応えるか？',
          context: '市場で一般的な要素や訴求だが、外す場合、ペルソナごとに異なる代替手段を検討する必要がある可能性がある',
          related_persona_ids: personas.map((p) => p.id),
        },
        {
          question: '特定の要素や訴求を含める場合、どのペルソナにどう伝えるべきか？',
          context: '市場で一般的な要素や訴求だが、ペルソナごとに重視するポイントが異なる可能性がある',
          related_persona_ids: personas.map((p) => p.id),
        },
        {
          question: '特定の要素や訴求を強調する場合、各ペルソナの判断基準のどこに焦点を当てるべきか？',
          context: '市場で一般的な要素や訴求だが、ペルソナごとに判断基準が異なる可能性がある',
          related_persona_ids: personas.map((p) => p.id),
        },
      ],
    };

    insight.persona_relevance = personas.length > 0 ? assessPersonaRelevance(insight, personas) : [];
    insights.push(insight);
  }

  return insights;
}

/**
 * Persona Overlayを分析して、戦略の成立しやすさを判定
 * ◎が多い場合：同調の合理性が高く、外すリスクが高い
 * △が多い場合：外す戦略の成立余地がある
 * ◯が多い場合：ずらす戦略が検討余地あり
 * ？が多い場合：判断不可
 */
function analyzePersonaOverlayForStrategy(
  marketInsights: MarketInsight[],
  personas: Persona[],
  optionType: 'A' | 'B' | 'C'
): {
  rationalityLevel: 'high' | 'medium' | 'low' | 'unknown';
  riskLevel: 'high' | 'medium' | 'low' | 'unknown';
  rationalityReasoning: string;
  riskReasoning: string;
  personaOverlays: Array<{
    persona_id: string;
    overlay: 'high' | 'medium' | 'low' | 'unknown';
    risk_level: 'low' | 'medium' | 'high';
    reasoning: string;
  }>;
} {
  // 各ペルソナのOverlayを集計
  const personaOverlayCounts = personas.map((persona) => {
    const overlays = marketInsights
      .flatMap((mi) => mi.persona_relevance)
      .filter((pr) => pr.persona_id === persona.id)
      .map((pr) => pr.relevance_level);

    const highCount = overlays.filter((o) => o === 'high').length; // ◎
    const mediumCount = overlays.filter((o) => o === 'medium').length; // ◯
    const lowCount = overlays.filter((o) => o === 'low').length; // △
    const unknownCount = overlays.filter((o) => o === 'unknown').length; // ？

    return {
      persona_id: persona.id,
      persona_name: persona.name,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      unknown: unknownCount,
      total: overlays.length,
    };
  });

  // 全体のOverlay分布を集計
  const totalHigh = personaOverlayCounts.reduce((sum, p) => sum + p.high, 0);
  const totalMedium = personaOverlayCounts.reduce((sum, p) => sum + p.medium, 0);
  const totalLow = personaOverlayCounts.reduce((sum, p) => sum + p.low, 0);
  const totalUnknown = personaOverlayCounts.reduce((sum, p) => sum + p.unknown, 0);
  const totalOverlays = totalHigh + totalMedium + totalLow + totalUnknown;

  // 各Optionタイプに応じた戦略判定
  let rationalityLevel: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
  let riskLevel: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
  let rationalityReasoning = '';
  let riskReasoning = '';

  if (optionType === 'A') {
    // Option A: 市場に同調する
    // ◎が多い場合：同調の合理性が高い
    if (totalHigh > totalMedium && totalHigh > totalLow && totalHigh > totalUnknown) {
      rationalityLevel = 'high';
      rationalityReasoning = `ペルソナOverlayで◎が多い（${totalHigh}件）ため、市場に同調する戦略の合理性が高い可能性がある`;
    } else if (totalMedium > totalHigh && totalMedium > totalLow) {
      rationalityLevel = 'medium';
      rationalityReasoning = `ペルソナOverlayで◯が多い（${totalMedium}件）ため、市場に同調する戦略の合理性は中程度である可能性がある`;
    } else if (totalLow > totalHigh && totalLow > totalMedium) {
      rationalityLevel = 'low';
      rationalityReasoning = `ペルソナOverlayで△が多い（${totalLow}件）ため、市場に同調する戦略の合理性は低い可能性がある`;
    } else if (totalUnknown > totalHigh && totalUnknown > totalMedium && totalUnknown > totalLow) {
      rationalityLevel = 'unknown';
      rationalityReasoning = `ペルソナOverlayで？が多い（${totalUnknown}件）ため、市場に同調する戦略の合理性は判断不可である可能性がある`;
    } else {
      rationalityLevel = 'medium';
      rationalityReasoning = `ペルソナOverlayの分布が均等なため、市場に同調する戦略の合理性は中程度である可能性がある`;
    }

    // ◎が多い場合：外すリスクが高い（同調のリスクは低い）
    if (totalHigh > totalMedium && totalHigh > totalLow) {
      riskLevel = 'low';
      riskReasoning = `ペルソナOverlayで◎が多い（${totalHigh}件）ため、市場に同調するリスクは低い可能性がある`;
    } else {
      riskLevel = 'medium';
      riskReasoning = `ペルソナOverlayの分布から、市場に同調するリスクは中程度である可能性がある`;
    }
  } else if (optionType === 'B') {
    // Option B: 部分的にずらす
    // ◯が多い場合：ずらす戦略が検討余地あり
    if (totalMedium > totalHigh && totalMedium > totalLow) {
      rationalityLevel = 'medium';
      rationalityReasoning = `ペルソナOverlayで◯が多い（${totalMedium}件）ため、部分的にずらす戦略の検討余地がある可能性がある`;
    } else if (totalHigh > totalMedium && totalHigh > totalLow) {
      rationalityLevel = 'low';
      rationalityReasoning = `ペルソナOverlayで◎が多い（${totalHigh}件）ため、部分的にずらす戦略の合理性は低い可能性がある`;
    } else {
      rationalityLevel = 'medium';
      rationalityReasoning = `ペルソナOverlayの分布から、部分的にずらす戦略の検討余地がある可能性がある`;
    }

    riskLevel = 'medium';
    riskReasoning = `部分的にずらす戦略は、市場の前提を一部維持しつつ差別化するため、リスクは中程度である可能性がある`;
  } else if (optionType === 'C') {
    // Option C: あえて外す
    // △が多い場合：外す戦略の成立余地がある
    if (totalLow > totalHigh && totalLow > totalMedium) {
      rationalityLevel = 'medium';
      rationalityReasoning = `ペルソナOverlayで△が多い（${totalLow}件）ため、あえて外す戦略の成立余地がある可能性がある`;
    } else if (totalHigh > totalMedium && totalHigh > totalLow) {
      rationalityLevel = 'low';
      riskLevel = 'high';
      rationalityReasoning = `ペルソナOverlayで◎が多い（${totalHigh}件）ため、あえて外す戦略の合理性は低い可能性がある`;
      riskReasoning = `ペルソナOverlayで◎が多い（${totalHigh}件）ため、あえて外すリスクは高い可能性がある`;
    } else {
      rationalityLevel = 'medium';
      riskLevel = 'medium';
      rationalityReasoning = `ペルソナOverlayの分布から、あえて外す戦略の成立余地がある可能性がある`;
      riskReasoning = `ペルソナOverlayの分布から、あえて外すリスクは中程度である可能性がある`;
    }
  }

  // 各ペルソナ別のOverlayとリスク感を生成
  const personaOverlays = personaOverlayCounts.map((poc) => {
    const persona = personas.find((p) => p.id === poc.persona_id);
    let overlay: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    let reasoning = '';

    // そのペルソナの主要なOverlayを判定
    if (poc.high > poc.medium && poc.high > poc.low && poc.high > poc.unknown) {
      overlay = 'high'; // ◎
    } else if (poc.medium > poc.high && poc.medium > poc.low) {
      overlay = 'medium'; // ◯
    } else if (poc.low > poc.high && poc.low > poc.medium) {
      overlay = 'low'; // △
    } else {
      overlay = 'unknown'; // ？
    }

    // Optionタイプに応じたリスク感を判定
    if (optionType === 'A') {
      // 同調する場合：◎が多いとリスク低、△が多いとリスク高
      if (overlay === 'high') {
        riskLevel = 'low';
        reasoning = `${persona?.name || poc.persona_id}のOverlayが◎のため、市場に同調するリスクは低い可能性がある`;
      } else if (overlay === 'low') {
        riskLevel = 'high';
        reasoning = `${persona?.name || poc.persona_id}のOverlayが△のため、市場に同調するリスクは高い可能性がある`;
      } else {
        riskLevel = 'medium';
        reasoning = `${persona?.name || poc.persona_id}のOverlayが${overlay === 'medium' ? '◯' : '？'}のため、市場に同調するリスクは中程度である可能性がある`;
      }
    } else if (optionType === 'B') {
      // 部分的にずらす場合：常に中程度
      riskLevel = 'medium';
      reasoning = `${persona?.name || poc.persona_id}に対して、市場の前提を一部維持しつつ差別化する場合、リスクは中程度である可能性がある`;
    } else if (optionType === 'C') {
      // あえて外す場合：◎が多いとリスク高、△が多いとリスク低
      if (overlay === 'high') {
        riskLevel = 'high';
        reasoning = `${persona?.name || poc.persona_id}のOverlayが◎のため、あえて外すリスクは高い可能性がある`;
      } else if (overlay === 'low') {
        riskLevel = 'low';
        reasoning = `${persona?.name || poc.persona_id}のOverlayが△のため、あえて外すリスクは低い可能性がある`;
      } else {
        riskLevel = 'medium';
        reasoning = `${persona?.name || poc.persona_id}のOverlayが${overlay === 'medium' ? '◯' : '？'}のため、あえて外すリスクは中程度である可能性がある`;
      }
    }

    return {
      persona_id: poc.persona_id,
      overlay,
      risk_level: riskLevel,
      reasoning,
    };
  });

  return {
    rationalityLevel,
    riskLevel,
    rationalityReasoning,
    riskReasoning,
    personaOverlays,
  };
}

/**
 * Strategy Options (C2) 生成
 * Persona Overlayを入力として、戦略の成立しやすさを判定し、Strategy Optionsを自動変形
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
  const overlayAnalysisA = analyzePersonaOverlayForStrategy(marketInsights, personas, 'A');
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
    rationality_assessment: {
      level: overlayAnalysisA.rationalityLevel,
      reasoning: overlayAnalysisA.rationalityReasoning,
    },
    risk_assessment: {
      level: overlayAnalysisA.riskLevel,
      reasoning: overlayAnalysisA.riskReasoning,
    },
    persona_risk_assessment: overlayAnalysisA.personaOverlays.map((po) => ({
      persona_id: po.persona_id,
      risk_level: po.risk_level,
      reasoning: po.reasoning,
      persona_overlay: po.overlay,
    })),
  };
  options.push(optionA);

  // Option B: 部分的にずらす
  const overlayAnalysisB = analyzePersonaOverlayForStrategy(marketInsights, personas, 'B');
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
    rationality_assessment: {
      level: overlayAnalysisB.rationalityLevel,
      reasoning: overlayAnalysisB.rationalityReasoning,
    },
    risk_assessment: {
      level: overlayAnalysisB.riskLevel,
      reasoning: overlayAnalysisB.riskReasoning,
    },
    persona_risk_assessment: overlayAnalysisB.personaOverlays.map((po) => ({
      persona_id: po.persona_id,
      risk_level: po.risk_level,
      reasoning: po.reasoning,
      persona_overlay: po.overlay,
    })),
  };
  options.push(optionB);

  // Option C: あえて外す
  const overlayAnalysisC = analyzePersonaOverlayForStrategy(marketInsights, personas, 'C');
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
    rationality_assessment: {
      level: overlayAnalysisC.rationalityLevel,
      reasoning: overlayAnalysisC.rationalityReasoning,
    },
    risk_assessment: {
      level: overlayAnalysisC.riskLevel,
      reasoning: overlayAnalysisC.riskReasoning,
    },
    persona_risk_assessment: overlayAnalysisC.personaOverlays.map((po) => ({
      persona_id: po.persona_id,
      risk_level: po.risk_level,
      reasoning: po.reasoning,
      persona_overlay: po.overlay,
    })),
  };
  options.push(optionC);

  return options;
}

/**
 * Planning Hooks (D) 生成
 * OverlayとOptionの組み合わせに応じて内容を変形
 * 「ペルソナ × 市場前提 × 戦略の成立しやすさ」を起点とした問い
 */
export function generatePlanningHooks(
  strategyOptions: StrategyOption[],
  marketInsights: MarketInsight[],
  personas: Persona[] = []
): PlanningHook[] {
  return strategyOptions.map((option) => {
    const hooks: PlanningHook['hooks'] = [];

    // 合理性とリスクのレベルを取得
    const rationalityLevel = option.rationality_assessment.level;
    const riskLevel = option.risk_assessment.level;

    // Option A: 市場に同調する場合の問い
    if (option.option_type === 'A') {
      // 合理性が高い場合（◎が多い）
      if (rationalityLevel === 'high') {
        hooks.push({
          question: '市場の期待に応えるため、各ペルソナのFVで何を最初に伝えるべきか？（◎が多いペルソナに特に注意）',
          context: `ペルソナOverlayで◎が多いため、市場に同調する戦略の合理性が高い可能性がある。参考にする訴求軸: ${option.referenced_elements.appeal_axes?.join(', ') || 'なし'}。ペルソナごとに最初に期待する情報が異なる可能性がある`,
          related_persona_ids: option.persona_risk_assessment
            .filter((pra) => pra.persona_overlay === 'high')
            .map((pra) => pra.persona_id),
          related_insights: marketInsights
            .filter((mi) => mi.category === 'high_frequency')
            .map((_, idx) => `insight-${idx}`),
        });

        hooks.push({
          question: '市場で説明不要とされている要素は何か？◎のペルソナに対して、それ以外はどう説明すべきか？',
          context: `ペルソナOverlayで◎が多いため、市場で高頻度の要素は説明不要の可能性が高い。参考にする要素: ${option.referenced_elements.components?.join(', ') || 'なし'}。ただし、ペルソナごとに説明が必要な要素が異なる可能性がある`,
          related_persona_ids: option.persona_risk_assessment
            .filter((pra) => pra.persona_overlay === 'high')
            .map((pra) => pra.persona_id),
        });
      } else {
        // 合理性が中程度以下の場合
        hooks.push({
          question: '市場の期待に応えるため、各ペルソナのFVで何を最初に伝えるべきか？',
          context: `ペルソナOverlayの分布から、市場に同調する戦略の合理性は${rationalityLevel === 'medium' ? '中程度' : rationalityLevel === 'low' ? '低い' : '判断不可'}である可能性がある。参考にする訴求軸: ${option.referenced_elements.appeal_axes?.join(', ') || 'なし'}`,
          related_persona_ids: personas.map((p) => p.id),
        });

        hooks.push({
          question: '市場で説明不要とされている要素は何か？各ペルソナに対して、それ以外はどう説明すべきか？',
          context: `参考にする要素: ${option.referenced_elements.components?.join(', ') || 'なし'}。ペルソナOverlayの分布から、説明が必要な要素がペルソナごとに異なる可能性がある`,
          related_persona_ids: personas.map((p) => p.id),
        });
      }

      hooks.push({
        question: 'このOptionを選ぶ場合、各ペルソナのどの前提・期待に応え、どこで独自性を示すか？',
        context: `ペルソナOverlayの分布から、市場の前提と自社の独自性のバランスを、ペルソナごとに異なる形で取る必要がある可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
        related_insights: marketInsights.map((_, idx) => `insight-${idx}`),
      });
    }

    // Option B: 部分的にずらす場合の問い
    if (option.option_type === 'B') {
      // ◯が多い場合（ずらす戦略が検討余地あり）
      if (rationalityLevel === 'medium') {
        hooks.push({
          question: '市場の前提を維持しつつ、各ペルソナに対してどこで差別化を打ち出すか？（◯のペルソナに特に注意）',
          context: `ペルソナOverlayで◯が多いため、部分的にずらす戦略の検討余地がある可能性がある。参考にする要素: ${option.referenced_elements.components?.join(', ') || 'なし'}。使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}`,
          related_persona_ids: option.persona_risk_assessment
            .filter((pra) => pra.persona_overlay === 'medium')
            .map((pra) => pra.persona_id),
        });

        hooks.push({
          question: '市場の期待と異なる部分を、各ペルソナにどう説明すれば誤解を避けられるか？',
          context: `使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。ペルソナOverlayで◯が多いため、市場で一般的な要素を使わない場合、ペルソナごとに異なる説明が必要な可能性がある`,
          related_persona_ids: personas.map((p) => p.id),
        });
      } else {
        hooks.push({
          question: '市場の前提を維持しつつ、各ペルソナに対してどこで差別化を打ち出すか？',
          context: `参考にする要素: ${option.referenced_elements.components?.join(', ') || 'なし'}。使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。ペルソナOverlayの分布から、市場の期待を満たしつつ、ペルソナごとに異なる独自性を示すポイントがある可能性がある`,
          related_persona_ids: personas.map((p) => p.id),
        });

        hooks.push({
          question: '市場の期待と異なる部分を、各ペルソナにどう説明すれば誤解を避けられるか？',
          context: `使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。市場で一般的な要素を使わない場合、ペルソナごとに異なる説明が必要な可能性がある`,
          related_persona_ids: personas.map((p) => p.id),
        });
      }

      hooks.push({
        question: 'このOptionを選ぶ場合、各ペルソナのどの前提・期待に応え、どこで独自性を示すか？',
        context: `部分的にずらす戦略は、市場の前提と自社の独自性のバランスを、ペルソナごとに異なる形で取る必要がある可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
        related_insights: marketInsights.map((_, idx) => `insight-${idx}`),
      });
    }

    // Option C: あえて外す場合の問い
    if (option.option_type === 'C') {
      // △が多い場合（外す戦略の成立余地がある）
      if (rationalityLevel === 'medium' && riskLevel !== 'high') {
        hooks.push({
          question: '市場の期待を外すことで、各ペルソナに対してどのような新しい価値を提示できるか？（△のペルソナに特に注意）',
          context: `ペルソナOverlayで△が多いため、あえて外す戦略の成立余地がある可能性がある。参考にする要素: ${option.referenced_elements.components?.join(', ') || 'なし'}。使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}`,
          related_persona_ids: option.persona_risk_assessment
            .filter((pra) => pra.persona_overlay === 'low')
            .map((pra) => pra.persona_id),
        });

        hooks.push({
          question: '市場の期待と異なる表現を選ぶ場合、各ペルソナにどう理解してもらうか？',
          context: `使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。ペルソナOverlayで△が多いため、市場で一般的な要素を避ける場合、ペルソナごとに異なる説明・表現が必要な可能性がある`,
          related_persona_ids: personas.map((p) => p.id),
        });
      } else if (riskLevel === 'high') {
        // ◎が多い場合（外すリスクが高い）
        hooks.push({
          question: '市場の期待を外す場合、◎のペルソナのどの前提・期待にどう応えるべきか？',
          context: `ペルソナOverlayで◎が多いため、あえて外すリスクは高い可能性がある。使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。◎のペルソナに対して、市場の期待を外す場合の代替手段を検討する必要がある可能性がある`,
          related_persona_ids: option.persona_risk_assessment
            .filter((pra) => pra.persona_overlay === 'high')
            .map((pra) => pra.persona_id),
        });

        hooks.push({
          question: '市場の期待と異なる表現を選ぶ場合、各ペルソナにどう理解してもらうか？',
          context: `使わない要素: ${option.avoided_elements.components?.join(', ') || 'なし'}。ペルソナOverlayで◎が多いため、市場で一般的な要素を避ける場合、特に◎のペルソナに対して異なる説明・表現が必要な可能性がある`,
          related_persona_ids: personas.map((p) => p.id),
        });
      } else {
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

      hooks.push({
        question: 'このOptionを選ぶ場合、各ペルソナのどの前提・期待に応え、どこで独自性を示すか？',
        context: `あえて外す戦略は、市場の前提から外れることで、ペルソナごとに異なる新しい価値を提示する必要がある可能性がある`,
        related_persona_ids: personas.map((p) => p.id),
        related_insights: marketInsights.map((_, idx) => `insight-${idx}`),
      });
    }

    return {
      strategy_option: option.option_type,
      hooks,
    };
  });
}
