/**
 * ワークフロー出力スキーマ（LP構成案・バナー構成案）
 * フェーズ3: 出力の品質と一貫性を高めるためのZodスキーマ定義
 */

import { z } from 'zod';
import { PresentationModelSchema } from './schemas';

/**
 * LP構成案のペイロードスキーマ
 */
export const LpStructurePayloadSchema = z.object({
  // Step 5: 最重要コンテンツ領域のフィールドを追加
  execSummary: z.string().min(1, '結論（このLPで何を成立させるか）は必須です').max(500, '結論は500文字以内で記述してください'),
  targetUser: z.object({
    situation: z.string().min(1, '状況は必須です'),
    desire: z.string().min(1, '欲求は必須です'),
    anxiety: z.string().min(1, '不安は必須です'),
  }),
  questions: z.array(
    z.object({
      category: z.string().min(1, 'カテゴリは必須です'),
      question: z.string().min(1, '質問文は必須です'),
      answeredInSection: z.string().optional(), // どのセクションで答えるか
    })
  ).min(16, '質問は最低16個必要です'),
  sections: z.array(
    z.object({
      order: z.number().int().positive(),
      name: z.string().min(1, 'セクション名は必須です'),
      role: z.string().min(1, '役割は必須です'),
      answersQuestions: z.array(z.string()).min(1, '回答する質問は最低1つ必要です'),
      keyPoints: z.array(z.string()).min(1, '要点は最低1つ必要です'),
      infoVolume: z.enum(['small', 'medium', 'large']),
      expressionTypes: z.array(z.string()).min(1, '表現タイプは最低1つ必要です'),
      nextMindset: z.string().min(1, '次の心理状態は必須です'),
      copyHint: z.string().optional(), // Step 5: キャッチや見出しの方向性
    })
  ).min(6, 'セクションは最低6個必要です').max(10, 'セクションは最大10個までです'),
  cvPolicy: z.object({
    cvPlacement: z.literal('final_only'),
    note: z.string(),
  }),
  // Step 5: 制作に渡す指示フィールドを追加
  diagramHints: z.string().optional(), // 図解/レイアウト指示
  finalCv: z.object({
    ctaHint: z.string().min(1, 'CTA文脈の指示は必須です'), // CTA文脈の指示
  }),
});

/**
 * バナー構成案のペイロードスキーマ
 */
export const BannerStructurePayloadSchema = z.object({
  // Step 5: 最重要コンテンツ領域のフィールドを追加
  execSummary: z.string().min(1, '結論（今回の勝ち筋）は必須です').max(500, '結論は500文字以内で記述してください'),
  derivedFrom: z.object({
    lpRunId: z.string().optional(),
  }).optional(),
  targetOverview: z.object({
    state: z.string().optional(), // 想定状態
  }).optional(),
  lpSplit: z.object({
    roleOfLp: z.string().optional(), // 遷移先LPの役割
    roleOfBanner: z.string().min(1, 'バナーの役割は必須です'), // バナーの役割
    notes: z.string().optional(), // バナー→LPの役割分担の仮説
  }).optional(),
  bannerIdeas: z.array(
    z.object({
      id: z.string().min(1, 'IDは必須です'),
      pattern: z.enum([
        '共感訴求型',
        'ベネフィット訴求型',
        '安心訴求型',
        '比較型',
        '数字表現型',
        '権威型',
        '利用シーン提案型',
      ]),
      targetState: z.string().min(1, 'ターゲット状態は必須です'),
      singleValuePromise: z.string().min(1, '単一価値の約束は必須です'),
      mainCopyDirection: z.string().min(1, 'メインコピーの方向性は必須です'),
      subElements: z.array(z.string()),
      avoid: z.array(z.string()),
      lpShouldAnswer: z.array(z.string()),
    })
  ).min(1, 'バナー案は最低1つ必要です'),
  // Step 5: 制作に渡す指示フィールドを追加
  designNotes: z.string().min(1, 'ビジュアル指示は必須です'), // 構図、被写体、トーン、文字量、NG表現、ブランド整合など
});

/**
 * LP構成案の型（Zodスキーマから推論）
 */
export type LpStructurePayload = z.infer<typeof LpStructurePayloadSchema>;

/**
 * バナー構成案の型（Zodスキーマから推論）
 */
export type BannerStructurePayload = z.infer<typeof BannerStructurePayloadSchema>;

/**
 * ワークフロー出力のUnion型
 */
export type WorkflowOutputPayload = LpStructurePayload | BannerStructurePayload;

/**
 * 出力スキーマの種類
 */
export type OutputSchemaKind = 'lp_structure' | 'banner_structure';

/**
 * 出力スキーマのマッピング（検証用）
 */
export const OUTPUT_SCHEMA_MAP: Record<OutputSchemaKind, z.ZodSchema<any>> = {
  lp_structure: LpStructurePayloadSchema,
  banner_structure: BannerStructurePayloadSchema,
};
