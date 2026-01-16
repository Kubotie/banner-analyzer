/**
 * フェーズ4: finalOutputのv2正規形スキーマ
 * core/logic/deliverables の3層構造で成果物を表現
 */

import { z } from 'zod';

/**
 * v2正規形: コア情報（結論・ターゲット・CV）
 */
export interface PlanningArtifactCore {
  oneLiner: string; // execSummary → core.oneLiner
  target: {
    situation?: string; // targetUser.situation
    desire?: string; // targetUser.desire
    anxiety?: string; // targetUser.anxiety
    core?: string; // targetUser.core（あれば）
  };
  cv: {
    role?: string; // finalCv.role / cvPolicy.role
    answers?: string | string[]; // finalCv.answers / cvPolicy.answers
    keyPoints?: string | string[]; // finalCv.keyPoints / cvPolicy.keyPoints
    ctaHint?: string; // finalCv.ctaHint / cvPolicy.ctaHint
  };
}

/**
 * v2正規形: 論理構造（ストーリー・仮説・根拠）
 */
export interface PlanningArtifactLogic {
  story?: string; // diagramHints → logic.story（末尾に追加）
  hypothesis?: string; // 仮説（あれば）
  evidence?: string[]; // 根拠（あれば）
}

/**
 * v2正規形: LP成果物
 */
export interface PlanningArtifactLpDeliverable {
  sections: Array<{
    order: number;
    name: string;
    role?: string;
    answersQuestions?: string | string[];
    keyPoints?: string | string[];
    infoVolume?: 'small' | 'medium' | 'large';
    expressionTypes?: string | string[];
    nextMindset?: string;
    copyHint?: string; // copy.headline に移行
    layoutHint?: string;
    [key: string]: any; // その他のフィールドを保持
  }>;
  questionCoverage?: Array<{
    category?: string;
    question?: string;
    answeredInSection?: string;
    [key: string]: any;
  }>;
  layoutHints?: string; // diagramHints → deliverables.lp.layoutHints
}

/**
 * v2正規形: Banner成果物
 */
export interface PlanningArtifactBannerDeliverable {
  bannerIdeas?: Array<{
    id?: string;
    pattern?: string;
    targetState?: string;
    singleValuePromise?: string;
    mainCopyDirection?: string;
    subElements?: string[];
    avoid?: string[];
    lpShouldAnswer?: string[];
    [key: string]: any;
  }>;
  designNotes?: string;
  lpSplit?: {
    roleOfLp?: string;
    roleOfBanner?: string;
    notes?: string;
  };
}

/**
 * v2正規形: 成果物全体
 */
export interface PlanningArtifactV2 {
  schemaVersion: '2'; // 必須
  core: PlanningArtifactCore;
  logic?: PlanningArtifactLogic;
  deliverables: {
    lp?: PlanningArtifactLpDeliverable;
    banner?: PlanningArtifactBannerDeliverable;
  };
  // その他のメタデータ（あれば保持）
  [key: string]: any;
}

/**
 * Zodスキーマ: PlanningArtifactV2
 */
export const PlanningArtifactV2Schema = z.object({
  schemaVersion: z.literal('2'),
  core: z.object({
    oneLiner: z.string(),
    target: z.object({
      situation: z.string().optional(),
      desire: z.string().optional(),
      anxiety: z.string().optional(),
      core: z.string().optional(),
    }),
    cv: z.object({
      role: z.string().optional(),
      answers: z.union([z.string(), z.array(z.string())]).optional(),
      keyPoints: z.union([z.string(), z.array(z.string())]).optional(),
      ctaHint: z.string().optional(),
    }),
  }),
  logic: z.object({
    story: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.array(z.string()).optional(),
  }).optional(),
  deliverables: z.object({
    lp: z.object({
      sections: z.array(z.any()), // 柔軟な構造を許可
      questionCoverage: z.array(z.any()).optional(),
      layoutHints: z.string().optional(),
    }).optional(),
    banner: z.object({
      bannerIdeas: z.array(z.any()).optional(),
      designNotes: z.string().optional(),
      lpSplit: z.object({
        roleOfLp: z.string().optional(),
        roleOfBanner: z.string().optional(),
        notes: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
}).passthrough(); // その他のフィールドを許可
