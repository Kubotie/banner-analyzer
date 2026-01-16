import { Statement, Tag, PersonaSummary, PersonaComparison } from '@/types';

// ダミー発言データ
export const dummyStatements: Statement[] = [
  {
    id: 'stmt-001',
    text: '価格が高すぎて手が出ない',
    source: 'インタビュー記録_2024-01-15',
    timestamp: '2024-01-15T10:00:00',
    metadata: {
      interviewName: 'ユーザーインタビュー_2024-01-15',
      interviewDate: '2024-01-15',
      segment: '個人ユーザー',
      lineNumber: 1,
      respondent_id: 'R001',
    },
  },
  {
    id: 'stmt-002',
    text: '使いやすさが重要だと思う',
    source: 'インタビュー記録_2024-01-15',
    timestamp: '2024-01-15T10:05:00',
    metadata: {
      lineNumber: 2,
      respondent_id: 'R002',
    },
  },
  {
    id: 'stmt-003',
    text: '使いこなせるか不安です',
    source: 'インタビュー記録_2024-01-15',
    timestamp: '2024-01-15T10:10:00',
    metadata: {
      lineNumber: 3,
      respondent_id: 'R001',
    },
  },
  {
    id: 'stmt-004',
    text: '無料トライアルがあれば試したい',
    source: 'インタビュー記録_2024-01-15',
    timestamp: '2024-01-15T10:15:00',
    metadata: {
      lineNumber: 4,
      respondent_id: 'R001',
    },
  },
  {
    id: 'stmt-005',
    text: 'もう少し安ければ検討したい',
    source: 'インタビュー記録_2024-01-15',
    timestamp: '2024-01-15T10:20:00',
    metadata: {
      lineNumber: 5,
      respondent_id: 'R001',
    },
  },
  {
    id: 'stmt-006',
    text: '「簡単」という言葉は信用できない',
    source: 'インタビュー記録_2024-01-15',
    timestamp: '2024-01-15T10:25:00',
    metadata: {
      lineNumber: 6,
      respondent_id: 'R001',
    },
  },
  {
    id: 'stmt-007',
    text: '便利になりそうで期待している',
    source: 'インタビュー記録_2024-01-15',
    timestamp: '2024-01-15T10:30:00',
    metadata: {
      lineNumber: 7,
      respondent_id: 'R001',
    },
  },
  {
    id: 'stmt-008',
    text: '機能が不足している',
    source: '定性コメント_アンケート',
    timestamp: '2024-01-16T09:00:00',
    metadata: {
      lineNumber: 8,
      respondent_id: 'R002',
    },
  },
  {
    id: 'stmt-009',
    text: 'カスタマイズできないのが不満',
    source: '定性コメント_アンケート',
    timestamp: '2024-01-16T09:05:00',
    metadata: {
      lineNumber: 9,
      respondent_id: 'R002',
    },
  },
  {
    id: 'stmt-010',
    text: 'デモ動画があれば検討する',
    source: '定性コメント_アンケート',
    timestamp: '2024-01-16T09:10:00',
    metadata: {
      lineNumber: 10,
      respondent_id: 'R002',
    },
  },
  {
    id: 'stmt-011',
    text: '「高機能」という表現は逆効果',
    source: '定性コメント_アンケート',
    timestamp: '2024-01-16T09:15:00',
    metadata: {
      lineNumber: 11,
      respondent_id: 'R002',
    },
  },
  {
    id: 'stmt-012',
    text: 'サポートが不足している',
    source: '定性コメント_アンケート',
    timestamp: '2024-01-16T10:00:00',
    metadata: {
      lineNumber: 12,
      respondent_id: 'R003',
    },
  },
  {
    id: 'stmt-013',
    text: '実績紹介があれば信頼できる',
    source: '定性コメント_アンケート',
    timestamp: '2024-01-16T10:05:00',
    metadata: {
      lineNumber: 13,
      respondent_id: 'R003',
    },
  },
];

// ダミーペルソナ要約データ
export const dummyPersonaSummaries: PersonaSummary[] = [
  {
    personaId: 'A',
    summary: {
      challenges: [
        {
          text: '価格が高すぎて手が出ない',
          evidenceIds: ['stmt-001'],
          evidences: [
            {
              statementId: 'stmt-001',
              source: 'インタビュー記録_2024-01-15',
              quoteText: '価格が高すぎて手が出ない',
            },
          ],
          tags: ['課題', '価格'],
        },
        {
          text: 'もう少し安ければ検討したい',
          evidenceIds: ['stmt-005'],
          evidences: [
            {
              statementId: 'stmt-005',
              source: 'インタビュー記録_2024-01-15',
              quoteText: 'もう少し安ければ検討したい',
            },
          ],
          tags: ['課題', '価格'],
        },
      ],
      emotions: [
        {
          text: '使いこなせるか不安です',
          evidenceIds: ['stmt-003'],
          evidences: [
            {
              statementId: 'stmt-003',
              source: 'インタビュー記録_2024-01-15',
              quoteText: '使いこなせるか不安です',
            },
          ],
          tags: ['感情'],
        },
        {
          text: '便利になりそうで期待している',
          evidenceIds: ['stmt-007'],
          evidences: [
            {
              statementId: 'stmt-007',
              source: 'インタビュー記録_2024-01-15',
              quoteText: '便利になりそうで期待している',
            },
          ],
          tags: ['感情'],
        },
      ],
      decisionTriggers: [
        {
          text: '無料トライアルがあれば試したい',
          evidenceIds: ['stmt-004'],
          evidences: [
            {
              statementId: 'stmt-004',
              source: 'インタビュー記録_2024-01-15',
              quoteText: '無料トライアルがあれば試したい',
            },
          ],
          tags: ['意思決定トリガー'],
        },
      ],
      ngExpressions: [
        {
          text: '「簡単」という言葉は信用できない',
          evidenceIds: ['stmt-006'],
          evidences: [
            {
              statementId: 'stmt-006',
              source: 'インタビュー記録_2024-01-15',
              quoteText: '「簡単」という言葉は信用できない',
            },
          ],
          tags: ['NG表現'],
        },
      ],
    },
    statementCount: 7,
  },
  {
    personaId: 'B',
    summary: {
      challenges: [
        {
          text: '使いやすさが重要だと思う',
          evidenceIds: ['stmt-002'],
          evidences: [
            {
              statementId: 'stmt-002',
              source: 'インタビュー記録_2024-01-15',
              quoteText: '使いやすさが重要だと思う',
            },
          ],
          tags: ['課題', '品質'],
        },
        {
          text: '機能が不足している',
          evidenceIds: ['stmt-008'],
          evidences: [
            {
              statementId: 'stmt-008',
              source: '定性コメント_アンケート',
              quoteText: '機能が不足している',
            },
          ],
          tags: ['課題'],
        },
        {
          text: 'カスタマイズできないのが不満',
          evidenceIds: ['stmt-009'],
          evidences: [
            {
              statementId: 'stmt-009',
              source: '定性コメント_アンケート',
              quoteText: 'カスタマイズできないのが不満',
            },
          ],
          tags: ['課題'],
        },
      ],
      emotions: [],
      decisionTriggers: [
        {
          text: 'デモ動画があれば検討する',
          evidenceIds: ['stmt-010'],
          evidences: [
            {
              statementId: 'stmt-010',
              source: '定性コメント_アンケート',
              quoteText: 'デモ動画があれば検討する',
            },
          ],
          tags: ['意思決定トリガー'],
        },
      ],
      ngExpressions: [
        {
          text: '「高機能」という表現は逆効果',
          evidenceIds: ['stmt-011'],
          evidences: [
            {
              statementId: 'stmt-011',
              source: '定性コメント_アンケート',
              quoteText: '「高機能」という表現は逆効果',
            },
          ],
          tags: ['NG表現'],
        },
      ],
    },
    statementCount: 4,
  },
  {
    personaId: 'C',
    summary: {
      challenges: [
        {
          text: 'サポートが不足している',
          evidenceIds: ['stmt-012'],
          evidences: [
            {
              statementId: 'stmt-012',
              source: '定性コメント_アンケート',
              quoteText: 'サポートが不足している',
            },
          ],
          tags: ['課題'],
        },
      ],
      emotions: [],
      decisionTriggers: [
        {
          text: '実績紹介があれば信頼できる',
          evidenceIds: ['stmt-013'],
          evidences: [
            {
              statementId: 'stmt-013',
              source: '定性コメント_アンケート',
              quoteText: '実績紹介があれば信頼できる',
            },
          ],
          tags: ['意思決定トリガー'],
        },
      ],
      ngExpressions: [],
    },
    statementCount: 2,
  },
];

// ダミー比較データ（新しいPersonaComparison型に対応）
export const dummyComparison: PersonaComparison = {
  personas: ['A', 'B', 'C'],
  comparison: {
    one_line_summary: {
      A: '価格を重視し、無料トライアルがあれば試したいと考えるユーザー',
      B: '機能性とカスタマイズ性を重視し、デモ動画を求めているユーザー',
      C: 'サポート体制を重視し、実績紹介を信頼の基準とするユーザー',
    },
    background_story: {
      A: '価格が高すぎることを懸念しているが、無料トライアルがあれば試してみたいと考えている',
      B: '機能が不足していることやカスタマイズできないことに不満を持っており、デモ動画を見て判断したい',
      C: 'サポート体制を重視しており、実績紹介があれば信頼できると考える',
    },
    proxy_purchase_structure: {
      A: {
        whose_problem: '価格が高すぎる問題',
        who_solves: '無料トライアルを提供する企業',
        how: '無料トライアルを提供して試してもらう',
      },
      B: {
        whose_problem: '機能不足とカスタマイズ不可の問題',
        who_solves: '機能を拡充しカスタマイズ性を提供する企業',
        how: 'デモ動画で機能性を証明し、カスタマイズ性を示す',
      },
      C: {
        whose_problem: 'サポート不足の問題',
        who_solves: '充実したサポート体制を提供する企業',
        how: '実績紹介を通じて信頼性を示し、サポート体制をアピールする',
      },
    },
    job_to_be_done: {
      A: {
        functional: ['無料で試す', '価格を確認する'],
        emotional: ['不安を解消する', '期待を満たす'],
        social: [],
      },
      B: {
        functional: ['機能を確認する', 'カスタマイズ性を確認する'],
        emotional: ['不満を解消する'],
        social: [],
      },
      C: {
        functional: ['サポート体制を確認する'],
        emotional: ['信頼を得る'],
        social: ['実績を確認する'],
      },
    },
    decision_criteria_top5: {
      A: [
        { criterion: '価格', weight: 0.4 },
        { criterion: '無料トライアル', weight: 0.3 },
        { criterion: '使いやすさ', weight: 0.2 },
        { criterion: '期待値', weight: 0.05 },
        { criterion: '不安解消', weight: 0.05 },
      ],
      B: [
        { criterion: '機能性', weight: 0.35 },
        { criterion: 'カスタマイズ性', weight: 0.3 },
        { criterion: 'デモ動画', weight: 0.2 },
        { criterion: '使いやすさ', weight: 0.1 },
        { criterion: '品質', weight: 0.05 },
      ],
      C: [
        { criterion: 'サポート体制', weight: 0.5 },
        { criterion: '実績', weight: 0.3 },
        { criterion: '信頼性', weight: 0.15 },
        { criterion: '継続性', weight: 0.03 },
        { criterion: '安心感', weight: 0.02 },
      ],
    },
    typical_journey: {
      A: {
        trigger: '価格が高すぎるという課題認識',
        consideration: '無料トライアルがあれば試したい',
        purchase: 'トライアルで期待値が満たされた場合',
        retention: '使いやすさと期待値の継続',
      },
      B: {
        trigger: '機能不足とカスタマイズ不可への不満',
        consideration: 'デモ動画で機能性とカスタマイズ性を確認',
        purchase: '機能性とカスタマイズ性が確認できた場合',
        retention: '継続的な機能拡充とカスタマイズ性',
      },
      C: {
        trigger: 'サポート不足への懸念',
        consideration: '実績紹介で信頼性を確認',
        purchase: 'サポート体制と実績が信頼できると判断した場合',
        retention: '継続的なサポート体制の提供',
      },
    },
    common_misconceptions: {
      A: ['「簡単」という言葉は信用できない'],
      B: ['「高機能」という表現は逆効果'],
      C: [],
    },
    effective_strategies: {
      A: {
        messages: ['無料トライアルを提供', '価格の妥当性を説明'],
        touchpoints: ['トライアル登録ページ', '価格説明ページ'],
        offers: ['無料トライアル', '価格見積もり'],
      },
      B: {
        messages: ['機能性の詳細説明', 'カスタマイズ性のアピール'],
        touchpoints: ['デモ動画ページ', '機能説明ページ'],
        offers: ['デモ動画視聴', '機能デモ'],
      },
      C: {
        messages: ['実績紹介', 'サポート体制の説明'],
        touchpoints: ['実績紹介ページ', 'サポート紹介ページ'],
        offers: ['実績紹介資料', 'サポート相談'],
      },
    },
  },
  commonPoints: ['課題に関する発言が多い（A, B, C）'],
  differences: ['課題の種類が異なる（A: 価格、B: 機能、C: サポート）'],
};
