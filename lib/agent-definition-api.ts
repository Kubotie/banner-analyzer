/**
 * エージェント定義のAPI（KB経由）
 */

import { AgentDefinition } from '@/types/workflow';
import { KBItem, AgentDefinitionPayload } from '@/kb/types';
import { getDefaultAgentDefinitions, getSeedAgentDefinitionById } from './agent-definition-seed';
// Step1-2: 固定フォーマット廃止 - defaultLpStructureViewContract / defaultBannerStructureViewContractは削除
import { 
  defaultGenericJsonViewContract,
  OutputViewContract 
} from '@/types/output-view-contract';

// フェーズ3: 無限アップグレード防止 - 同一セッションで同一agentDefinitionIdは1回だけアップグレード
const upgradedOnce = new Set<string>();

// フェーズ3: SEED_CONTRACT_VERSION（seed側の契約バージョン）
const SEED_CONTRACT_VERSION = '1';

// フェーズ3: ログ出力抑制（1回だけ）
const didLogRefs = {
  getAgentDefinitions: false,
  upgrade: new Map<string, boolean>(),
};

// フェーズ3: contractHashを計算（安定hash：key順序を固定）
function calculateContractHash(contract: OutputViewContract | undefined): string {
  if (!contract) return '';
  
  // JSONをkey順序固定でシリアライズ（安定hashのため）
  const normalized = JSON.stringify(contract, Object.keys(contract).sort());
  
  // 簡易hash（本番環境ではcrypto.subtle.digestを使うべきだが、ブラウザ互換性のため簡易実装）
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * エージェント定義をKBから取得
 */
export async function getAgentDefinitions(): Promise<AgentDefinition[]> {
  try {
    // フェーズ3: ログ出力を1回だけ（didLogRefで抑制）
    if (!didLogRefs.getAgentDefinitions && process.env.NODE_ENV === 'development') {
      console.log('[AgentDefinitionAPI] Fetching agent definitions from KB...');
    }
    const response = await fetch('/api/kb/items?type=agent_definition');
    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV === 'development') {
        console.error('[AgentDefinitionAPI] Failed to fetch:', response.status, errorText);
      }
      throw new Error('Failed to fetch agent definitions');
    }
    
    const data = await response.json();
    const metaItems: any[] = data.items || [];
    
    // メタ情報から詳細を取得（payloadを含む）
    const definitions: AgentDefinition[] = [];
    for (const metaItem of metaItems) {
      if (metaItem.type !== 'agent_definition') continue;
      
      try {
        // 詳細を取得（payloadを含む）
        const detailResponse = await fetch(`/api/kb/items/${metaItem.kb_id}`);
        if (!detailResponse.ok) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AgentDefinitionAPI] Failed to fetch detail for:', metaItem.kb_id);
          }
          continue;
        }
        
        const detailData = await detailResponse.json();
        const fullItem: KBItem = detailData.item;
        
        if (!fullItem || !fullItem.payload) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AgentDefinitionAPI] Item has no payload:', metaItem.kb_id);
          }
          continue;
        }
        
        const payload = fullItem.payload as AgentDefinitionPayload;
        
        // payloadの検証
        if (!payload || typeof payload !== 'object') {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AgentDefinitionAPI] Invalid payload for item:', metaItem.kb_id, metaItem.title);
          }
          continue;
        }
        
        if (!payload.agent_definition_id || !payload.name) {
          console.warn('[AgentDefinitionAPI] Missing required fields in payload:', metaItem.kb_id, payload);
          continue;
        }
        
        definitions.push({
          id: payload.agent_definition_id,
          name: payload.name,
          description: payload.description || '',
          category: payload.category || 'planning',
          systemPrompt: payload.systemPrompt || '',
          userPromptTemplate: payload.userPromptTemplate || '',
          outputSchema: payload.outputSchema || 'lp_structure',
          // フェーズ3: 追加フィールド
          outputKind: payload.outputKind || payload.outputSchema || 'lp_structure',
          outputSchemaRef: payload.outputSchemaRef,
          qualityChecklist: payload.qualityChecklist,
          editable: payload.editable !== undefined ? payload.editable : true,
          createdAt: fullItem.created_at,
          updatedAt: fullItem.updated_at,
          // フェーズ1: 成果物の見せ方の契約
          outputViewContract: payload.outputViewContract,
          outputArtifactTitle: payload.outputArtifactTitle,
          outputArtifactDescription: payload.outputArtifactDescription,
          // フェーズ3-3: upgradeの反映状況
          contractVersion: payload.contractVersion || payload.outputViewContract?.version,
          contractHash: payload.contractHash,
          contractSource: payload.contractSource || (payload.outputViewContract ? 'kb' : undefined),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[AgentDefinitionAPI] Error processing item:', metaItem.kb_id, error);
        }
        continue;
      }
    }
    
    // 重複を除去（同じIDのエージェントは最新のもののみを保持）
    const uniqueDefinitions = new Map<string, AgentDefinition>();
    for (const def of definitions) {
      const existing = uniqueDefinitions.get(def.id);
      if (!existing || new Date(def.updatedAt) > new Date(existing.updatedAt)) {
        uniqueDefinitions.set(def.id, def);
      }
    }
    
    const finalDefinitions = Array.from(uniqueDefinitions.values());
    
    // フェーズ3: ログ出力を1回だけ（didLogRefで抑制）
    if (!didLogRefs.getAgentDefinitions) {
      console.log('[AgentDefinitionAPI] Parsed', finalDefinitions.length, 'unique agent definitions:', finalDefinitions.map(d => d.id));
      didLogRefs.getAgentDefinitions = true;
    }
    
    if (definitions.length > finalDefinitions.length && process.env.NODE_ENV === 'development') {
      console.warn('[AgentDefinitionAPI] Removed', definitions.length - finalDefinitions.length, 'duplicate agent definitions');
    }
    
    // Step2-2: upgradeAgentDefinitionIfNeededの自動実行を停止
    // ユーザー定義のcontract（managedBy='user'）を尊重し、自動アップグレードは行わない
    // アップグレードが必要な場合は、UI（エージェント管理画面）で「移行」ボタンを押したときだけ実行
    return finalDefinitions;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AgentDefinitionAPI] Failed to get agent definitions:', error);
    }
    return [];
  }
}

/**
 * エージェント定義を取得（1件）
 * フェーズ3: 無限ループ防止 - getAgentDefinitions()を呼ばずに直接KBから取得
 */
export async function getAgentDefinition(id: string): Promise<AgentDefinition | null> {
  try {
    // フェーズ3: getAgentDefinitions()を呼ばずに直接KBから取得（無限ループ防止）
    const response = await fetch('/api/kb/items?type=agent_definition');
    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AgentDefinitionAPI] Failed to fetch agent definitions:', response.status);
      }
      return null;
    }
    
    const data = await response.json();
    const metaItems: any[] = data.items || [];
    
    // 該当IDのエージェント定義を検索
    for (const metaItem of metaItems) {
      if (metaItem.type !== 'agent_definition') continue;
      
      try {
        const detailResponse = await fetch(`/api/kb/items/${metaItem.kb_id}`);
        if (!detailResponse.ok) continue;
        
        const detailData = await detailResponse.json();
        const fullItem: KBItem = detailData.item;
        
        if (!fullItem || !fullItem.payload) continue;
        
        const payload = fullItem.payload as AgentDefinitionPayload;
        
        if (payload.agent_definition_id === id) {
          // 見つかった
          return {
            id: payload.agent_definition_id,
            name: payload.name,
            description: payload.description || '',
            category: payload.category || 'planning',
            systemPrompt: payload.systemPrompt || '',
            userPromptTemplate: payload.userPromptTemplate || '',
            outputSchema: payload.outputSchema || 'lp_structure',
            outputKind: payload.outputKind || payload.outputSchema || 'lp_structure',
            outputSchemaRef: payload.outputSchemaRef,
            qualityChecklist: payload.qualityChecklist,
            editable: payload.editable !== undefined ? payload.editable : true,
            createdAt: fullItem.created_at,
            updatedAt: fullItem.updated_at,
            outputViewContract: payload.outputViewContract,
            outputArtifactTitle: payload.outputArtifactTitle,
            outputArtifactDescription: payload.outputArtifactDescription,
            contractVersion: payload.contractVersion || payload.outputViewContract?.version,
            contractHash: payload.contractHash,
            contractSource: payload.contractSource || (payload.outputViewContract ? 'kb' : undefined),
          };
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AgentDefinitionAPI] Error processing item:', metaItem.kb_id, error);
        }
        continue;
      }
    }
    
    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AgentDefinitionAPI] Failed to get agent definition:', id, error);
    }
    return null;
  }
}


/**
 * エージェント定義をKBに保存（新規作成または更新）
 */
export async function saveAgentDefinition(definition: AgentDefinition): Promise<AgentDefinition> {
  try {
    // フェーズ3: contractHashを計算（保存時に必ず計算）
    const contractHash = definition.contractHash || calculateContractHash(definition.outputViewContract);
    const contractVersion = definition.contractVersion || definition.outputViewContract?.version || SEED_CONTRACT_VERSION;
    
    const payload: AgentDefinitionPayload = {
      type: 'agent_definition',
      agent_definition_id: definition.id,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      systemPrompt: definition.systemPrompt,
      userPromptTemplate: definition.userPromptTemplate,
      outputSchema: definition.outputSchema,
      // フェーズ3: 追加フィールド
      outputKind: definition.outputKind || definition.outputSchema,
      outputSchemaRef: definition.outputSchemaRef,
      qualityChecklist: definition.qualityChecklist,
      editable: definition.editable,
      // フェーズ1: 成果物の見せ方の契約
      outputViewContract: definition.outputViewContract,
      outputArtifactTitle: definition.outputArtifactTitle,
      outputArtifactDescription: definition.outputArtifactDescription,
      // フェーズ3: upgradeの反映状況（contractHashを必ず保存）
      contractVersion: contractVersion,
      contractHash: contractHash,
      contractSource: definition.contractSource || (definition.outputViewContract ? 'manual' : undefined),
    };

    // フェーズ3: 無限ループ防止 - getAgentDefinitions()を呼ばずに直接KBから確認
    const listResponse = await fetch('/api/kb/items?type=agent_definition');
    if (!listResponse.ok) throw new Error('Failed to fetch agent definitions');
    const listData = await listResponse.json();
    const kbItem = listData.items.find((item: any) => {
      const itemPayload = item.payload as any;
      return itemPayload?.agent_definition_id === definition.id;
    });
    const exists = !!kbItem;

    if (exists && kbItem) {
      // 更新: PATCHリクエスト
      
      // 更新リクエスト
      const updateResponse = await fetch(`/api/kb/items/${kbItem.kb_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: definition.name,
          folder_path: 'My Files/Agents',
          tags: [definition.category],
          payload,
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || 'Failed to update agent definition');
      }
    } else {
      // 新規作成: POSTリクエスト
      const requestBody = {
        type: 'agent_definition',
        title: definition.name,
        folder_path: 'My Files/Agents',
        tags: [definition.category],
        owner_id: 'user',
        visibility: 'private',
        source_app: 'workflow-app',
        payload,
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[AgentDefinitionAPI] Creating agent definition:', definition.id, definition.name);
      }
      
      const response = await fetch('/api/kb/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to save agent definition';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.message || errorMessage;
          console.error('[AgentDefinitionAPI] Save failed:', error);
        } catch (parseError) {
          if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
            errorMessage = `APIエラー (${response.status}): HTMLエラーページが返されました。`;
          } else {
            errorMessage = `APIエラー (${response.status}): ${errorText.substring(0, 200)}`;
          }
          console.error('[AgentDefinitionAPI] Save failed:', errorMessage);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.log('[AgentDefinitionAPI] Agent definition created:', definition.id);
      }
    }

    return definition;
  } catch (error) {
    console.error('Failed to save agent definition:', error);
    throw error;
  }
}

/**
 * エージェント定義を削除
 */
export async function deleteAgentDefinition(id: string): Promise<void> {
  try {
    // KBアイテムのkb_idを取得
    const listResponse = await fetch('/api/kb/items?type=agent_definition');
    if (!listResponse.ok) throw new Error('Failed to fetch agent definitions');
    const listData = await listResponse.json();
    const kbItem = listData.items.find((item: any) => {
      const itemPayload = item.payload as any;
      return itemPayload?.agent_definition_id === id;
    });
    
    if (!kbItem) throw new Error('KB item not found for deletion');
    
    const deleteResponse = await fetch(`/api/kb/items/${kbItem.kb_id}`, {
      method: 'DELETE',
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(error.error || 'Failed to delete agent definition');
    }
  } catch (error) {
    console.error('Failed to delete agent definition:', error);
    throw error;
  }
}

/**
 * 重複したエージェント定義を削除（同じIDのエージェントは最新のもの以外を削除）
 */
async function cleanupDuplicateAgents(): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AgentDefinitionAPI] Cleaning up duplicate agents...');
    }
    
    // すべてのエージェント定義を取得（重複を含む）
    const response = await fetch('/api/kb/items?type=agent_definition');
    if (!response.ok) return;
    
    const data = await response.json();
    const metaItems: any[] = data.items || [];
    
    // IDごとにグループ化
    const agentsById = new Map<string, any[]>();
    for (const metaItem of metaItems) {
      try {
        const detailResponse = await fetch(`/api/kb/items/${metaItem.kb_id}`);
        if (!detailResponse.ok) continue;
        
        const detailData = await detailResponse.json();
        const fullItem: KBItem = detailData.item;
        const payload = fullItem.payload as AgentDefinitionPayload;
        
        if (payload && payload.agent_definition_id) {
          const agentId = payload.agent_definition_id;
          if (!agentsById.has(agentId)) {
            agentsById.set(agentId, []);
          }
          agentsById.get(agentId)!.push({ kbId: metaItem.kb_id, item: fullItem });
        }
      } catch (error) {
        console.warn('[AgentDefinitionAPI] Error processing item for cleanup:', metaItem.kb_id, error);
      }
    }
    
    // 各IDについて、最新以外を削除
    let deletedCount = 0;
    for (const [agentId, items] of agentsById.entries()) {
      if (items.length > 1) {
        // updated_atでソート（最新が最後）
        items.sort((a, b) => new Date(a.item.updated_at).getTime() - new Date(b.item.updated_at).getTime());
        
        // 最新以外を削除
        for (let i = 0; i < items.length - 1; i++) {
          try {
            const deleteResponse = await fetch(`/api/kb/items/${items[i].kbId}`, {
              method: 'DELETE',
            });
            if (deleteResponse.ok) {
              deletedCount++;
              console.log('[AgentDefinitionAPI] Deleted duplicate agent:', items[i].kbId, agentId);
            }
          } catch (error) {
            console.warn('[AgentDefinitionAPI] Failed to delete duplicate:', items[i].kbId, error);
          }
        }
      }
    }
    
    if (deletedCount > 0 && process.env.NODE_ENV === 'development') {
      console.log('[AgentDefinitionAPI] Cleaned up', deletedCount, 'duplicate agent definitions');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AgentDefinitionAPI] Failed to cleanup duplicate agents:', error);
    }
  }
}

/**
 * エージェント定義をアップグレード（フェーズ2-1: 契約アップグレード自動化）
 * seed側の最新contractより古い/無い場合は自動マージしてKBに再保存
 * フェーズ3: 無限アップグレード防止付き
 */
async function upgradeAgentDefinitionIfNeeded(def: AgentDefinition): Promise<AgentDefinition> {
  const seedDef = getSeedAgentDefinitionById(def.id);
  if (!seedDef) {
    // seedに存在しないエージェントはアップグレード不要
    return def;
  }
  
  // フェーズ3: 止血策 - 同一セッションで同一agentDefinitionIdは1回だけアップグレード
  if (upgradedOnce.has(def.id)) {
    // 既にアップグレード済みの場合はスキップ
    return def;
  }
  
  // フェーズ3: 根治策 - contractVersionとcontractHashで判定
  const seedContract = seedDef.outputViewContract;
  const seedContractVersion = seedContract?.version || SEED_CONTRACT_VERSION;
  const seedContractHash = calculateContractHash(seedContract);
  
  const currentContractVersion = def.contractVersion || def.outputViewContract?.version;
  const currentContractHash = def.contractHash || calculateContractHash(def.outputViewContract);
  
  // アップグレード条件チェック（contractVersion/contractHashベース + systemPromptの更新チェック）
  // Step 5: systemPromptもチェック（必須フィールドの指示が含まれているか）
  const systemPromptNeedsUpdate = seedDef.systemPrompt && 
    def.systemPrompt !== seedDef.systemPrompt &&
    (!def.systemPrompt.includes('execSummary') || !def.systemPrompt.includes('finalCv') || 
     (seedDef.outputKind === 'banner_structure' && !def.systemPrompt.includes('designNotes')));
  
  // 【重要】ユーザー管理のcontractは絶対にアップグレードしない
  const isUserManaged = def.outputViewContract?.meta?.managedBy === 'user';
  if (isUserManaged) {
    // managedBy: 'user' の時は upgradeAgentDefinitionIfNeeded をスキップ
    return def; // アップグレードしない
  }
  
  // 【重要】同一versionなら絶対にupgradeしない（ユーザー管理でない場合でも）
  if (currentContractVersion && currentContractVersion === seedContractVersion) {
    // versionが一致している場合は絶対にアップグレードしない
    return def;
  }
  
  const needsUpgrade = 
    !def.outputViewContract || // contractが無い
    !currentContractVersion || // versionが無い
    (currentContractVersion < seedContractVersion) || // versionが古い
    (currentContractHash !== seedContractHash) || // hashが不一致
    (!def.outputViewContract.sections || def.outputViewContract.sections.length === 0) || // sectionsが空
    systemPromptNeedsUpdate; // systemPromptが古い場合もアップグレード
  
  if (!needsUpgrade) {
    // アップグレード不要の場合は、contractVersion/contractHashを設定（初回のみ）
    if (!def.contractVersion || !def.contractHash) {
      return {
        ...def,
        contractVersion: currentContractVersion || seedContractVersion,
        contractHash: currentContractHash || seedContractHash,
        contractSource: def.contractSource || 'kb',
      };
    }
    return def;
  }
  
  // アップグレード実行前にマーク（無限ループ防止）
  upgradedOnce.add(def.id);
  
  // フェーズ3: ログ出力を1回だけ
  if (!didLogRefs.upgrade.get(def.id)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AgentDefinitionAPI] Upgrading agent definition:', def.id, def.name);
    }
    didLogRefs.upgrade.set(def.id, true);
  }
  
  // seed側の最新contractをマージ
  // Step 5: systemPromptも更新（必須フィールドの指示を含む最新版を使用）
  const upgraded: AgentDefinition = {
    ...def,
    systemPrompt: seedDef.systemPrompt || def.systemPrompt, // システムプロンプトも更新
    userPromptTemplate: seedDef.userPromptTemplate || def.userPromptTemplate, // ユーザープロンプトテンプレートも更新
    outputViewContract: seedDef.outputViewContract || def.outputViewContract,
    outputArtifactTitle: seedDef.outputArtifactTitle || def.outputArtifactTitle,
    outputArtifactDescription: seedDef.outputArtifactDescription || def.outputArtifactDescription,
    // その他のseed側の最新フィールドもマージ
    outputKind: seedDef.outputKind || def.outputKind,
    outputSchemaRef: seedDef.outputSchemaRef || def.outputSchemaRef,
    qualityChecklist: seedDef.qualityChecklist || def.qualityChecklist,
    // フェーズ3: upgradeの反映状況を記録（contractVersion/contractHashを含める）
    contractVersion: seedContractVersion,
    contractHash: seedContractHash,
    contractSource: 'seed', // 自動アップグレードされたことを示す
  };
  
  // Step B: versionHashを導入し「差分がある時だけ保存」へ変更
  const upgradedContractHash = calculateContractHash(upgraded.outputViewContract);
  const existingContractHash = def.contractHash || calculateContractHash(def.outputViewContract);
  
  // contractHashが同じ場合は保存をスキップ（無限upgrade防止）
  if (upgradedContractHash === existingContractHash && def.contractVersion === seedContractVersion) {
    if (process.env.NODE_ENV === 'development' && didLogRefs.upgrade.get(def.id)) {
      console.log('[AgentDefinitionAPI] ✓ Contract unchanged, skipping save:', def.id, {
        contractHash: upgradedContractHash,
        contractVersion: seedContractVersion,
      });
    }
    // マークを解除（次回もチェック可能にする）
    upgradedOnce.delete(def.id);
    didLogRefs.upgrade.delete(def.id);
    return def; // 変更なしなので元の定義を返す
  }
  
  // KBに再保存（差分がある時だけ）
  try {
    await saveAgentDefinition(upgraded);
    if (process.env.NODE_ENV === 'development' && didLogRefs.upgrade.get(def.id)) {
      console.log('[AgentDefinitionAPI] ✓ Upgraded and saved agent definition:', def.id, {
        oldHash: existingContractHash,
        newHash: upgradedContractHash,
        oldVersion: def.contractVersion,
        newVersion: seedContractVersion,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AgentDefinitionAPI] Failed to save upgraded agent definition:', def.id, error);
    }
    // 保存失敗時はマークを解除（次回再試行可能にする）
    upgradedOnce.delete(def.id);
    didLogRefs.upgrade.delete(def.id);
    // 保存失敗時はアップグレード済みの定義を返す
  }
  
  return upgraded;
}

/**
 * デフォルトエージェントを初期化（存在しない場合のみ作成）
 */
export async function initializeDefaultAgents(): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AgentDefinitionAPI] Initializing default agents...');
    }
    
    // まず重複をクリーンアップ
    await cleanupDuplicateAgents();
    
    // 既存のエージェント定義を取得（重複除去済み）
    let existing: AgentDefinition[] = [];
    try {
      existing = await getAgentDefinitions();
      if (process.env.NODE_ENV === 'development') {
        console.log('[AgentDefinitionAPI] Existing unique agents:', existing.map(e => e.id));
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AgentDefinitionAPI] Failed to get existing agents, will create defaults:', error);
      }
    }
    
    const defaults = getDefaultAgentDefinitions();
    
    for (const defaultAgent of defaults) {
      const exists = existing.some((e) => e.id === defaultAgent.id);
      if (!exists) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AgentDefinitionAPI] Creating default agent:', defaultAgent.id, defaultAgent.name);
        }
        try {
          await saveAgentDefinition(defaultAgent);
          if (process.env.NODE_ENV === 'development') {
            console.log('[AgentDefinitionAPI] ✓ Initialized default agent:', defaultAgent.name);
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[AgentDefinitionAPI] Failed to create default agent:', defaultAgent.id, error);
          }
          // エラーが発生しても次のエージェントの処理を続行
        }
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[AgentDefinitionAPI] Default agents initialization complete');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AgentDefinitionAPI] Failed to initialize default agents:', error);
    }
    throw error;
  }
}
