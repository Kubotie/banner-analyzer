/**
 * KBペイロードのZodスキーマ定義
 */

import { z } from 'zod';
import { LpStructurePayloadSchema, BannerStructurePayloadSchema } from './workflow-output-schemas';

/**
 * BannerLayoutPayloadのZodスキーマ
 */
export const BannerLayoutPayloadSchema = z.object({
  type: z.literal('banner_layout'),
  schemaVersion: z.literal(1),
  imageId: z.string().min(1, 'imageIdは必須です'),
  productId: z.string().optional(),
  title: z.string().optional(),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'ISO 8601形式の日時が必要です'),
  components: z.array(
    z.object({
      key: z.enum(['product_image', 'logo', 'price', 'cta', 'limited', 'other']),
      label: z.string().min(1, 'labelは必須です'),
      bbox: z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        w: z.number().min(0).max(1).refine((val) => val > 0, 'wは0より大きい必要があります'),
        h: z.number().min(0).max(1).refine((val) => val > 0, 'hは0より大きい必要があります'),
        coord: z.literal('normalized'),
      }),
      source: z.literal('manual'),
    })
  ).min(1, 'componentsは1件以上必要です')
    .refine(
      (components) => {
        const keys = components.map((c) => c.key);
        return keys.length === new Set(keys).size;
      },
      { message: 'keyの重複は許可されません（同一keyは1つにする）' }
    ),
  notes: z.string().optional(),
});

/**
 * BannerLayoutPayloadの型（Zodスキーマから推論）
 */
export type BannerLayoutPayload = z.infer<typeof BannerLayoutPayloadSchema>;

/**
 * Banner ExtractionペイロードのZodスキーマ（簡易版、Extraction型はanyとして扱う）
 */
export const BannerExtractionPayloadSchema = z.object({
  type: z.literal('banner'),
  banner_id: z.string(),
  extraction: z.any(), // Extraction型は複雑なためanyとして扱う
  image_url: z.string().optional(),
});

/**
 * MarketInsight/StrategyOption/PlanningHookペイロードのZodスキーマ
 * （common-schemas.tsからインポート）
 */
import { 
  MarketInsightPayloadSchema, 
  StrategyOptionPayloadSchema, 
  PlanningHookPayloadSchema 
} from './common-schemas';

/**
 * PersonaPayloadのZodスキーマ
 */
export const PersonaPayloadSchema = z.object({
  type: z.literal('persona'),
  persona_id: z.string(),
  hypothesis_label: z.string(),
  summary: z.string(),
  story: z.string(),
  proxy_structure: z.object({
    whose_problem: z.string(),
    who_solves: z.string(),
    how: z.string(),
  }),
  jtbd: z.object({
    functional: z.array(z.string()),
    emotional: z.array(z.string()),
    social: z.array(z.string()),
  }),
  decision_criteria_top5: z.array(z.object({
    criterion: z.string(),
    weight: z.number().min(0).max(1),
  })),
  journey: z.object({
    trigger: z.string(),
    consider: z.string(),
    purchase: z.string(),
    continue: z.string(),
  }),
  pitfalls: z.array(z.string()),
  tactics: z.object({
    message: z.array(z.string()).optional(),
    route: z.array(z.string()).optional(),
    offer: z.array(z.string()).optional(),
  }),
  evidence: z.object({
    quotes: z.array(z.object({
      text: z.string(),
      respondent_id: z.string(),
      category: z.string(),
    })),
    count: z.number(),
  }),
  evidence_quotes: z.array(z.object({
    text: z.string(),
    source_file: z.string(),
    line_number: z.number().optional(),
    line_range: z.object({
      start: z.number(),
      end: z.number(),
    }).optional(),
    statement_id: z.string().optional(),
    category: z.string(),
  })),
});

/**
 * ReportPayloadのZodスキーマ（比較データを含む）
 */
export const ReportPayloadSchema = z.object({
  type: z.literal('report'),
  report_id: z.string(),
  aggregation: z.any().nullable(), // Aggregation型は複雑なためanyとして扱う
  total_banners: z.number(),
  comparison_data: z.any().optional(), // 比較データ（オプション）
});

/**
 * AgentDefinitionPayloadのZodスキーマ
 */
export const AgentDefinitionPayloadSchema = z.object({
  type: z.literal('agent_definition'),
  agent_definition_id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['planning', 'creative', 'analysis']),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().min(1),
  outputSchema: z.enum(['lp_structure', 'banner_structure']),
  // フェーズ3: 追加フィールド（オプショナル）
  outputKind: z.enum(['lp_structure', 'banner_structure']).optional(),
  outputSchemaRef: z.enum(['LpStructurePayloadSchema', 'BannerStructurePayloadSchema']).optional(),
  qualityChecklist: z.array(z.string()).optional(),
  editable: z.boolean(),
});

/**
 * WorkflowPayloadのZodスキーマ
 */
export const WorkflowPayloadSchema = z.object({
  type: z.literal('workflow'),
  workflowId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(z.any()),
  connections: z.array(z.any()),
});

/**
 * Presentation BlockのZodスキーマ（union型 - 既存の型定義に合わせる）
 */
export const PresentationBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    id: z.string(),
    label: z.string(),
    content: z.union([z.string(), z.record(z.any())]),
  }),
  z.object({
    type: z.literal('bullets'),
    id: z.string(),
    label: z.string(),
    items: z.union([
      z.array(z.string()),
      z.array(z.object({
        label: z.string().optional(),
        content: z.string(),
      })),
    ]),
  }),
  z.object({
    type: z.literal('cards'),
    id: z.string(),
    label: z.string(),
    cards: z.array(z.object({
      title: z.string(),
      content: z.union([z.string(), z.record(z.any())]).optional(),
    }).passthrough()),
  }),
  z.object({
    type: z.literal('table'),
    id: z.string(),
    label: z.string(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    type: z.literal('timeline'),
    id: z.string(),
    label: z.string(),
    events: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      timestamp: z.string().optional(),
    }).passthrough()),
  }),
  z.object({
    type: z.literal('copyBlocks'),
    id: z.string(),
    label: z.string(),
    blocks: z.array(z.object({
      title: z.string().optional(),
      content: z.string(),
    }).passthrough()),
  }),
  z.object({
    type: z.literal('imagePrompts'),
    id: z.string(),
    label: z.string(),
    prompts: z.array(z.object({
      purpose: z.string().optional(),
      composition: z.string().optional(),
      style: z.string().optional(),
      prompt: z.string(),
    }).passthrough()),
  }),
  z.object({
    type: z.literal('markdown'),
    id: z.string(),
    label: z.string(),
    content: z.string(),
  }),
]);

/**
 * Presentation ModelのZodスキーマ
 */
export const PresentationModelSchema = z.object({
  title: z.string().min(1),
  blocks: z.array(PresentationBlockSchema).min(1),
});

/**
 * WorkflowRunPayloadのZodスキーマ
 */
export const WorkflowRunPayloadSchema = z.object({
  type: z.literal('workflow_run'),
  workflowId: z.string(),
  agentNodeId: z.string(),
  agentId: z.string(),
  inputsSnapshot: z.any(),
  output: z.any(),
  startedAt: z.string(),
  finishedAt: z.string(),
  status: z.enum(['success', 'error']),
  error: z.string().optional(),
  // Step1: Presentation（ViewModel）を追加
  presentation: PresentationModelSchema.optional(),
});

/**
 * KBペイロードのZodスキーマ（union型）
 * MarketInsight/StrategyOption/PlanningHookは`meta`と`payload`構造を持っているため、
 * union型で追加する
 */
export const kbPayloadSchema = z.union([
  PersonaPayloadSchema,
  BannerLayoutPayloadSchema,
  BannerExtractionPayloadSchema,
  ReportPayloadSchema,
  MarketInsightPayloadSchema,
  StrategyOptionPayloadSchema,
  PlanningHookPayloadSchema,
  AgentDefinitionPayloadSchema,
  WorkflowPayloadSchema,
  WorkflowRunPayloadSchema,
  LpStructurePayloadSchema,
  BannerStructurePayloadSchema,
]);

/**
 * KBアイテム作成リクエストのZodスキーマ
 */
export const createKBItemRequestSchema = z.object({
  type: z.enum(['persona', 'banner', 'insight', 'report', 'option', 'plan', 'banner_layout', 'agent_definition', 'workflow', 'workflow_run', 'lp_structure', 'banner_structure']),
  title: z.string().optional(),
  folder_path: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source_app: z.string().optional(),
  source_project_id: z.string().optional(),
  source_refs: z.array(z.string()).optional(),
  owner_id: z.string().optional(),
  visibility: z.enum(['private', 'shared']).optional(),
  payload: kbPayloadSchema,
});

/**
 * KBアイテム更新リクエストスキーマ
 */
export const updateKBItemRequestSchema = z.object({
  title: z.string().min(1).optional(),
  folder_path: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['private', 'shared']).optional(),
  payload: kbPayloadSchema.optional(), // payloadの更新も許可
});

/**
 * ActiveContextスキーマ
 */
export const activeContextSchema = z.object({
  persona_ids: z.array(z.string()).optional(),
  insight_ids: z.array(z.string()).optional(),
  banner_ids: z.array(z.string()).optional(),
  report_id: z.string().optional(),
  option_id: z.string().optional(),
  plan_id: z.string().optional(),
  updated_at: z.string().datetime(),
});
