/**
 * KB共通テンプレート（meta/payload構造）
 * すべてのKB typeを統一するための共通定義
 */

import { z } from 'zod';

/**
 * 共通Metaスキーマ
 */
export const CommonMetaSchema = z.object({
  id: z.string(), // KBアイテムのID
  kind: z.enum([
    'banner_auto_layout',
    'banner_insight',
    'market_insight',
    'strategy_option',
    'planning_hook',
    'agent_definition',
    'workflow',
    'workflow_run',
    'persona',
    'banner_layout',
  ]),
  title: z.string(),
  imageId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  personaId: z.string().nullable().optional(),
  workflowId: z.string().nullable().optional(),
  createdAt: z.string(), // ISO8601
  updatedAt: z.string(), // ISO8601
  version: z.number().int().positive().default(1),
});

export type CommonMeta = z.infer<typeof CommonMetaSchema>;

/**
 * WorkflowPayloadスキーマ
 */
export const WorkflowPayloadSchema = z.object({
  meta: CommonMetaSchema,
  payload: z.object({
    workflowId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    nodes: z.array(z.any()), // WorkflowNode[]
    connections: z.array(z.any()), // WorkflowConnection[]
  }),
});

/**
 * WorkflowRunPayloadスキーマ
 */
export const WorkflowRunPayloadSchema = z.object({
  meta: CommonMetaSchema,
  payload: z.object({
    workflowId: z.string(),
    agentNodeId: z.string(),
    agentId: z.string(),
    inputsSnapshot: z.any(), // ExecutionContext
    output: z.any(), // schema別（lp_structure/banner_structure）
    startedAt: z.string(), // ISO8601
    finishedAt: z.string(), // ISO8601
    status: z.enum(['success', 'error']),
    error: z.string().optional(),
  }),
});

/**
 * AgentDefinitionPayload（既存を拡張）
 */
export const AgentDefinitionPayloadSchemaExtended = z.object({
  meta: CommonMetaSchema,
  payload: z.object({
    agent_definition_id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.enum(['planning', 'creative', 'analysis']),
    systemPrompt: z.string(),
    userPromptTemplate: z.string(),
    outputSchema: z.enum(['lp_structure', 'banner_structure']),
    editable: z.boolean(),
  }),
});
