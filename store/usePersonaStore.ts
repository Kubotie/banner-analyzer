import { create } from 'zustand';
import { Statement, PersonaSummary, PersonaComparison, InputSource, Tag, Project, ExtractionRecord, Quote, Aggregation, Persona, PersonaAxis, SavedPersona, SavedComparison, KnowledgeBaseItem } from '@/types';
import { generateExtractionFromSource, generateExtractionWithAI, generateAggregationWithAI, generatePersonaWithAI, generateComparisonWithAI, generatePersonaAxesWithAI } from '@/utils/aiClient';
import { ExtractionRecordSchema, validateQuoteIntegrity, QuoteIntegrityIssue } from '@/utils/extractionSchema';
import { createPersonaHistory, updatePersonaHistory, getPersonaHistories, getPersonaHistory, getStepName, deletePersonaHistory } from '@/lib/persona-history-db';
import type { PersonaHistory } from '@/types/persona-history';

interface PersonaStore {
  // プロジェクトデータ
  project: Project | null;
  
  // 入力ソース
  inputSources: InputSource[];
  
  // 発言リスト（テキスト前処理済み）
  statements: Statement[];
  
  // ExtractionRecordリスト（A. Extraction）
  extractionRecords: ExtractionRecord[];
  
  // タグリスト（後方互換のため残す）
  tags: Tag[];
  
  // ペルソナ要約リスト（後方互換のため残す）
  personaSummaries: PersonaSummary[];
  
  // Aggregationデータ（B. Aggregation）
  aggregation: Aggregation | null;
  
  // Personaデータ（C. Persona）
  personas: Persona[];
  
  // 更新対象の既存ペルソナID（更新モード時）
  updatingPersonaId: string | null;
  
  // ペルソナ軸（Persona生成の方向性）
  personaAxes: PersonaAxis[];
  
  // 比較データ
  comparison: PersonaComparison | null;
  
  // 現在のステップ（画面遷移用）
  currentStep: 'input' | 'extraction' | 'extraction-review' | 'aggregation' | 'persona-axis' | 'summary' | 'comparison' | 'knowledge-base';
  
  // 選択中のペルソナ（要約表示用）
  selectedPersona: string | null;
  
  // 選択中の根拠項目（ハイライト用）
  selectedEvidence: string | null;
  
  // 選択中のExtractionRecord（Step2.5用）
  selectedExtractionRecord: string | null;
  
  // quotes整合性問題（UI表示用）
  quoteIntegrityIssues: Array<{ respondent_id: string; issues: QuoteIntegrityIssue[] }>;
  
  // ナレッジベース（保存済みペルソナ）
  knowledgeBaseItems: KnowledgeBaseItem[];
  
  // アクティブなペルソナ（他アプリ連携用）
  activePersona: SavedPersona | null;
  
  // 現在の履歴ID（Extractionごとに1行をキープするため）
  currentHistoryId: string | null;
  
  // Actions: 入力ソース
  addInputSource: (source: InputSource) => void;
  removeInputSource: (id: string) => void;
  
  // Actions: 発言
  addStatements: (statements: Statement[]) => void;
  updateStatement: (id: string, updates: Partial<Statement>) => void;
  deleteStatement: (id: string) => void;
  
  // Actions: タグ
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  
  // Actions: ペルソナ要約
  setPersonaSummaries: (summaries: PersonaSummary[]) => void;
  
  // Actions: Aggregation
  setAggregation: (aggregation: Aggregation | null) => void;
  generateAggregation: () => Promise<void>;
  
  // Actions: Persona
  setPersonas: (personas: Persona[]) => void;
  setUpdatingPersonaId: (personaId: string | null) => void;
  generatePersonas: () => Promise<void>;
  
  // Actions: ペルソナ軸
  setPersonaAxes: (axes: PersonaAxis[]) => void;
  addPersonaAxis: (axis: PersonaAxis) => void;
  updatePersonaAxis: (id: string, updates: Partial<PersonaAxis>) => void;
  deletePersonaAxis: (id: string) => void;
  generatePersonaAxesWithAI: () => Promise<void>; // AIでペルソナ軸を自動生成
  
  // Actions: 比較データ
  setComparison: (comparison: PersonaComparison | null) => void;
  
  // Actions: UI状態
  setCurrentStep: (step: 'input' | 'extraction' | 'extraction-review' | 'aggregation' | 'persona-axis' | 'summary' | 'comparison' | 'knowledge-base') => void;
  setSelectedPersona: (personaId: string | null) => void;
  setSelectedEvidence: (evidenceId: string | null) => void;
  
  // Actions: 発言分割（テキスト前処理）
  splitTextIntoStatements: (text: string, source: string, metadata?: Statement['metadata']) => Statement[];
  
  // Actions: Extraction生成（A. Extraction）
  generateExtractions: () => Promise<void>;
  
  // Actions: ExtractionRecord
  addExtractionRecord: (record: ExtractionRecord) => void;
  updateExtractionRecord: (respondent_id: string, updates: Partial<ExtractionRecord>) => void;
  deleteExtractionRecord: (respondent_id: string) => void;
  
  // Actions: Extraction確定（ゲート化）
  finalizeExtractionRecords: () => void;
  isExtractionFinalized: () => boolean;
  getFinalizedExtractionRecords: () => ExtractionRecord[];
  
  // Actions: confidence算出
  calculateConfidence: (record: ExtractionRecord) => ExtractionRecord['confidence_breakdown'];
  
  // Actions: 要約生成（発言ベース、推測なし）- 後方互換のため残す
  generateSummaries: () => void;
  
  // Actions: 比較データ生成
  generateComparison: () => Promise<void>;
  
  // Actions: UI状態
  setSelectedExtractionRecord: (respondent_id: string | null) => void;
  
  // Actions: quotes整合性問題
  setQuoteIntegrityIssues: (issues: Array<{ respondent_id: string; issues: QuoteIntegrityIssue[] }>) => void;
  
  // Actions: ナレッジベース
  savePersonaToKnowledgeBase: (persona: Persona, title?: string) => Promise<string>; // 保存してIDを返す
  saveComparisonToKnowledgeBase: (comparison: PersonaComparison, title?: string) => Promise<string>; // 比較を保存してIDを返す
  getKnowledgeBaseItems: () => KnowledgeBaseItem[];
  getKnowledgeBaseItem: (id: string) => KnowledgeBaseItem | null;
  updateKnowledgeBaseItem: (id: string, updates: Partial<KnowledgeBaseItem>) => void;
  deleteKnowledgeBaseItem: (id: string) => void;
  searchKnowledgeBase: (query: string) => KnowledgeBaseItem[];
  
  // Actions: アクティブペルソナ（他アプリ連携用）
  setActivePersona: (persona: SavedPersona | null) => void;
  copyPersonaToClipboard: (persona: SavedPersona) => Promise<void>;
  
  // Actions: 履歴
  saveHistory: () => void; // 現在の状態を履歴に保存（自動保存）
  restoreFromHistory: (historyId: string) => void; // 履歴から状態を復元
  getHistories: () => any[]; // 履歴一覧を取得（表示用）
  deleteHistory: (historyId: string) => void; // 履歴を削除
  setCurrentHistoryId: (historyId: string | null) => void; // 現在の履歴IDを設定
  resetSession: () => void; // 新規セッションを開始（状態をリセット）
}

// デフォルトタグ
const defaultTags: Tag[] = [
  { id: 'tag-1', name: '課題', category: '要約項目', isCustom: false, color: '#ef4444' },
  { id: 'tag-2', name: '感情', category: '要約項目', isCustom: false, color: '#f59e0b' },
  { id: 'tag-3', name: '意思決定トリガー', category: '要約項目', isCustom: false, color: '#10b981' },
  { id: 'tag-4', name: 'NG表現', category: '要約項目', isCustom: false, color: '#8b5cf6' },
  { id: 'tag-5', name: '価格', category: 'その他', isCustom: false, color: '#3b82f6' },
  { id: 'tag-6', name: '品質', category: 'その他', isCustom: false, color: '#06b6d4' },
];

export const usePersonaStore = create<PersonaStore>((set, get) => ({
  project: null,
  inputSources: [],
  statements: [],
  extractionRecords: [],
  tags: defaultTags,
  personaSummaries: [],
  aggregation: null,
  personas: [],
  updatingPersonaId: null,
  personaAxes: [],
  comparison: null,
  currentStep: 'input',
  selectedPersona: null,
  selectedEvidence: null,
  selectedExtractionRecord: null,
  quoteIntegrityIssues: [],
  knowledgeBaseItems: [],
  activePersona: null,
  currentHistoryId: null,
  
  // 入力ソース
  addInputSource: (source) => {
    set((state) => ({
      inputSources: [...state.inputSources, source],
    }));
  },
  
  removeInputSource: (id) => {
    set((state) => ({
      inputSources: state.inputSources.filter((s) => s.id !== id),
      // 関連する発言も削除
      statements: state.statements.filter((s) => s.source !== id),
    }));
  },
  
  // 発言
  addStatements: (statements) => {
    set((state) => ({
      statements: [...state.statements, ...statements],
    }));
  },
  
  updateStatement: (id, updates) => {
    set((state) => ({
      statements: state.statements.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },
  
  deleteStatement: (id) => {
    set((state) => ({
      statements: state.statements.filter((s) => s.id !== id),
    }));
  },
  
  // タグ
  addTag: (tag) => {
    set((state) => ({
      tags: [...state.tags, tag],
    }));
  },
  
  updateTag: (id, updates) => {
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },
  
  deleteTag: (id) => {
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
      // 新しい設計ではStatementにtagsフィールドはない
    }));
  },
  
  // ペルソナ要約
  setPersonaSummaries: (summaries) => {
    set({ personaSummaries: summaries });
  },
  
  // Aggregation
  setAggregation: (aggregation) => {
    set({ aggregation });
  },
  
  // Persona生成（C. Persona）- AI（LLM）を使用、Aggregation結果のみを入力とする
  generatePersonas: async () => {
    const { aggregation, personaAxes } = get();
    
    if (!aggregation || aggregation.clusters.length === 0) {
      alert('Aggregation結果がありません。先にAggregationを生成してください。');
      return;
    }
    
    if (personaAxes.length === 0) {
      alert('ペルソナ軸が設定されていません。先にペルソナ軸を設定してください。');
      return;
    }
    
    try {
      // activeProduct情報を取得
      const { useProductStore } = await import('@/store/useProductStore');
      const { activeProduct } = useProductStore.getState();
      
      // AIでPersona生成（リトライ機能内蔵、ペルソナ軸とactiveProduct情報を含める）
      const personas = await generatePersonaWithAI(
        aggregation, 
        personaAxes, 
        2,
        activeProduct ? {
          name: activeProduct.name,
          category: activeProduct.category,
          description: activeProduct.description,
          competitors: activeProduct.competitors,
        } : undefined
      );
      
      // 型チェックとバリデーション
      if (!personas || !Array.isArray(personas)) {
        console.error('Persona生成結果が無効です:', personas);
        throw new Error('AIからの応答が無効です。配列形式ではありません。');
      }
      
      if (personas.length === 0) {
        console.warn('Persona生成結果が空です');
        throw new Error('Personaが生成されませんでした。');
      }
      
      // 各Personaのバリデーション
      const validatedPersonas: Persona[] = [];
      for (const persona of personas) {
        // 必須フィールドのチェック
        if (!persona.id || !persona.cluster_id || !persona.one_line_summary || !persona.evidence) {
          console.warn('Personaの必須フィールドが不足しています:', persona);
          continue;
        }
        
        // Evidenceの必須チェック
        if (!persona.evidence.quotes || !Array.isArray(persona.evidence.quotes) || persona.evidence.quotes.length === 0) {
          console.warn('PersonaのEvidenceが不足しています:', persona);
          continue;
        }
        
        validatedPersonas.push(persona);
      }
      
      if (validatedPersonas.length === 0) {
        throw new Error('有効なPersonaが生成されませんでした。');
      }
      
      set({ personas: validatedPersonas });
    } catch (error) {
      console.error('Persona生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // APIキーが設定されていない場合の特別な処理
      if (errorMessage.includes('APIキーが設定されていません')) {
        const setupInfo = errorMessage.split('\n\n')[1] || '';
        alert(`APIキーが設定されていません。\n\n${setupInfo}\n\n詳細は README_LLM_SETUP.md を参照してください。`);
      } else {
        alert(`Persona生成でエラーが発生しました: ${errorMessage}\nフォールバック処理を使用します。`);
      }
      
      // フォールバック: ルールベース生成
      // （既存のルールベース実装をここに追加可能）
    }
  },
  
  setPersonas: (personas) => {
    set({ personas });
  },
  
  setUpdatingPersonaId: (personaId) => {
    set({ updatingPersonaId: personaId });
  },
  
  // ペルソナ軸管理
  setPersonaAxes: (axes) => {
    set({ personaAxes: axes });
  },
  
  addPersonaAxis: (axis) => {
    set((state) => ({
      personaAxes: [...state.personaAxes, axis],
    }));
  },
  
  updatePersonaAxis: (id, updates) => {
    set((state) => ({
      personaAxes: state.personaAxes.map((axis) =>
        axis.id === id ? { ...axis, ...updates } : axis
      ),
    }));
  },
  
  deletePersonaAxis: (id) => {
    set((state) => ({
      personaAxes: state.personaAxes.filter((axis) => axis.id !== id),
    }));
  },
  
  // AIでペルソナ軸を自動生成
  generatePersonaAxesWithAI: async () => {
    const { aggregation } = get();
    
    if (!aggregation || !aggregation.clusters || aggregation.clusters.length === 0) {
      throw new Error('Aggregation結果が必要です。先にAggregationを生成してください。');
    }
    
    try {
      const axes = await generatePersonaAxesWithAI(aggregation);
      
      // orderを設定
      const axesWithOrder = axes.map((axis, idx) => ({
        ...axis,
        order: idx,
      }));
      
      set({ personaAxes: axesWithOrder });
    } catch (error) {
      console.error('ペルソナ軸生成エラー:', error);
      throw error;
    }
  },
  
  // 比較データ
  setComparison: (comparison) => {
    set({ comparison });
  },
  
  // UI状態
  setCurrentStep: (step) => {
    const prevStep = get().currentStep;
    set({ currentStep: step });
    
    // Extraction以降に進んだ場合、履歴を自動保存
    if (step !== 'input' && step !== 'extraction' && typeof window !== 'undefined') {
      const state = get();
      // 履歴保存を非同期で実行（ブロックしない）
      setTimeout(() => {
        const { saveHistory } = get();
        saveHistory();
      }, 0);
    }
  },
  
  setSelectedPersona: (personaId) => {
    set({ selectedPersona: personaId });
  },
  
  setSelectedEvidence: (evidenceId) => {
    set({ selectedEvidence: evidenceId });
  },
  
  // テキスト前処理：発言分割（line_range対応）
  splitTextIntoStatements: (text, source, metadata) => {
    const statements: Statement[] = [];
    const lines = text.split(/\n/);
    let statementId = 1;
    let lineNumber = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) {
        lineNumber++;
        continue;
      }
      
      const currentLineNumber = lineNumber;
      const startLine = currentLineNumber;
      
      // Q: / A: パターンの検出
      if (trimmed.match(/^[QA]:\s*/i)) {
        const statement: Statement = {
          id: `stmt-${String(statementId).padStart(3, '0')}`,
          text: trimmed,
          source,
          timestamp: new Date().toISOString(),
          metadata: {
            ...metadata,
            lineNumber: currentLineNumber,
            line_range: { start: startLine, end: currentLineNumber },
          },
        };
        statements.push(statement);
        statementId++;
        lineNumber++;
        continue;
      }
      
      // 句点で分割
      const sentences = trimmed.split(/[。！？]/).filter((s) => s.trim());
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;
        
        const statement: Statement = {
          id: `stmt-${String(statementId).padStart(3, '0')}`,
          text: trimmedSentence,
          source,
          timestamp: new Date().toISOString(),
          metadata: {
            ...metadata,
            lineNumber: currentLineNumber,
            line_range: { start: startLine, end: currentLineNumber },
          },
        };
        statements.push(statement);
        statementId++;
      }
      lineNumber++;
    }
    
    return statements;
  },
  
  // A. Extraction生成（事実の構造化）- AI（LLM）を使用、スキーマ検証・整合性チェック付き
  // 入力ソース全体をLLMに渡し、LLMがrespondentを識別してExtractionRecordを生成
  generateExtractions: async () => {
    const { inputSources } = get();
    
    if (inputSources.length === 0) {
      alert('入力データがありません。先にデータを入力してください。');
      return;
    }
    
    const extractionRecords: ExtractionRecord[] = [];
    const allIntegrityIssues: Array<{ respondent_id: string; issues: QuoteIntegrityIssue[] }> = [];
    
    try {
      const totalSources = inputSources.length;
      let processedCount = 0;
      
      // 各入力ソースごとにAIでExtraction生成
      for (let sourceIndex = 0; sourceIndex < inputSources.length; sourceIndex++) {
        const source = inputSources[sourceIndex];
        try {
          processedCount++;
          console.log(`Extraction生成中: ${processedCount}/${totalSources} (${source.id})`);
          
          // AIでExtraction生成（入力ソース全体を渡す、LLMがrespondentを識別）
          const aiResults = await generateExtractionFromSource(
            source.text,
            source.id,
            {
              interviewName: source.metadata?.interviewName,
              interviewDate: source.metadata?.interviewDate,
              segment: source.metadata?.segment,
              owner: source.metadata?.owner,
            },
            2
          );
          
          // aiResultsは配列（複数のrespondentがいる場合）
          if (!Array.isArray(aiResults)) {
            throw new Error('AIの出力が配列形式ではありません');
          }
          
          // 元のテキスト全体をStatementとして扱う（quotes整合性チェック用）
          const fullTextStatement: Statement = {
            id: `stmt-source-${source.id}`,
            text: source.text,
            source: source.id,
            timestamp: source.createdAt,
            metadata: {
              interviewName: source.metadata?.interviewName,
              interviewDate: source.metadata?.interviewDate,
              segment: source.metadata?.segment,
              owner: source.metadata?.owner,
              line_range: { start: 1, end: source.text.split('\n').length },
            },
          };
          
          // 各ExtractionRecordを処理
          for (const aiResult of aiResults) {
            const respondentId = aiResult.respondent_id || `R${String(extractionRecords.length + 1).padStart(3, '0')}`;
            
            // AIの出力をログに記録（デバッグ用）
            console.log(`AI出力 (${respondentId}):`, {
              hasQuotes: !!aiResult.quotes,
              quotesLength: Array.isArray(aiResult.quotes) ? aiResult.quotes.length : 'not array',
              respondentId: aiResult.respondent_id,
            });
            
            // AIの結果をExtractionRecord形式に変換
            const quotes: Quote[] = [];
            const fieldQuotes: ExtractionRecord['field_quotes'] = {
              role: [],
              relationship: [],
              trigger: [],
              barriers: [],
              job_to_be_done: {},
              decision_criteria: {},
            };
            
            let quoteIdCounter = 1;
            const quoteIntegrityIssues: QuoteIntegrityIssue[] = [];
            
            // quotesを生成（必須: 最低1件）
            if (aiResult.quotes && Array.isArray(aiResult.quotes) && aiResult.quotes.length > 0) {
              for (const quoteData of aiResult.quotes) {
                const quote: Quote = {
                  id: `quote-${String(quoteIdCounter).padStart(3, '0')}`,
                  text: quoteData.quoteText || quoteData.text || quoteData.quote || '',
                  source_file: quoteData.source || quoteData.source_file || source.id,
                  line_number: quoteData.line_number,
                  line_range: quoteData.line_range,
                  category: quoteData.category || 'unknown',
                  statement_id: quoteData.statementId || quoteData.statement_id || fullTextStatement.id,
                  linked_fields: quoteData.linked_fields || (quoteData.category ? [quoteData.category] : []),
                };
                
                // quotes整合性チェック（元のテキスト全体に対して）
                const issues = validateQuoteIntegrity(quote, [fullTextStatement]);
                if (issues.length > 0) {
                  quoteIntegrityIssues.push(...issues);
                }
                
                quotes.push(quote);
                
                // field_quotesに紐付け
                if (quote.linked_fields && quote.linked_fields.length > 0) {
                  for (const field of quote.linked_fields) {
                    if (field === 'role' && fieldQuotes.role) {
                      fieldQuotes.role.push(quote);
                    } else if (field === 'relationship' && fieldQuotes.relationship) {
                      fieldQuotes.relationship.push(quote);
                    } else if (field === 'trigger' && fieldQuotes.trigger) {
                      fieldQuotes.trigger.push(quote);
                    } else if (field === 'barriers' && fieldQuotes.barriers) {
                      fieldQuotes.barriers.push(quote);
                    } else if (field === 'job_to_be_done' || field.startsWith('job_to_be_done.')) {
                      const subFieldRaw = field.split('.')[1] || 'functional';
                      const subField: 'functional' | 'emotional' | 'social' = 
                        (subFieldRaw === 'functional' || subFieldRaw === 'emotional' || subFieldRaw === 'social')
                          ? subFieldRaw
                          : 'functional';
                      if (!fieldQuotes.job_to_be_done) {
                        fieldQuotes.job_to_be_done = {};
                      }
                      if (!fieldQuotes.job_to_be_done[subField]) {
                        fieldQuotes.job_to_be_done[subField] = [];
                      }
                      fieldQuotes.job_to_be_done[subField]!.push(quote);
                    } else if (field === 'decision_criteria' || field.startsWith('decision_criteria.')) {
                      const subFieldRaw = field.split('.')[1] || 'price';
                      const subField: 'price' | 'trust' | 'effort' | 'effectiveness' = 
                        (subFieldRaw === 'price' || subFieldRaw === 'trust' || subFieldRaw === 'effort' || subFieldRaw === 'effectiveness')
                          ? subFieldRaw
                          : 'price';
                      if (!fieldQuotes.decision_criteria) {
                        fieldQuotes.decision_criteria = {};
                      }
                      if (!fieldQuotes.decision_criteria[subField]) {
                        fieldQuotes.decision_criteria[subField] = [];
                      }
                      fieldQuotes.decision_criteria[subField]!.push(quote);
                    }
                  }
                } else if (quote.category) {
                  // linked_fieldsがない場合はcategoryから推測
                  if (quote.category === 'role' && fieldQuotes.role) {
                    fieldQuotes.role.push(quote);
                  } else if (quote.category === 'relationship' && fieldQuotes.relationship) {
                    fieldQuotes.relationship.push(quote);
                  } else if (quote.category === 'trigger' && fieldQuotes.trigger) {
                    fieldQuotes.trigger.push(quote);
                  } else if (quote.category === 'barriers' && fieldQuotes.barriers) {
                    fieldQuotes.barriers.push(quote);
                  }
                }
                
                quoteIdCounter++;
              }
            }
            
            // quotesが空の場合は、最低限のフォールバックquoteを生成
            if (quotes.length === 0) {
              console.warn(`quotesが空です。フォールバックquoteを生成します (${respondentId})`, {
                aiResultQuotes: aiResult.quotes,
                sourceId: source.id,
              });
              // 元のテキストから最低限のquoteを生成
              const fallbackQuote: Quote = {
                id: `quote-${String(quoteIdCounter).padStart(3, '0')}`,
                text: source.text.substring(0, Math.min(200, source.text.length)), // 最初の200文字（または全文）
                source_file: source.id,
                line_number: 1,
                line_range: { start: 1, end: source.text.split('\n').length },
                category: 'general',
                statement_id: fullTextStatement.id,
                linked_fields: ['general'],
              };
              quotes.push(fallbackQuote);
              // field_quotesにも追加
              if (fieldQuotes.trigger) {
                fieldQuotes.trigger.push(fallbackQuote);
              }
            }
            
            // AIの出力を正規化（型変換）
            // household: string -> object に変換、null値をundefinedに変換
            let normalizedHousehold = aiResult.household;
            if (typeof normalizedHousehold === 'string') {
              normalizedHousehold = { composition: normalizedHousehold };
            } else if (normalizedHousehold && typeof normalizedHousehold === 'object' && !Array.isArray(normalizedHousehold)) {
              // null値をundefinedに変換（zodスキーマとの整合性のため）
              normalizedHousehold = {
                composition: normalizedHousehold.composition === null ? undefined : normalizedHousehold.composition,
                age_range: normalizedHousehold.age_range === null ? undefined : normalizedHousehold.age_range,
                occupation: normalizedHousehold.occupation === null ? undefined : normalizedHousehold.occupation,
              };
            } else {
              normalizedHousehold = null;
            }
            
            // purchase_context: string -> object に変換、null値をundefinedに変換
            let normalizedPurchaseContext = aiResult.purchase_context;
            if (typeof normalizedPurchaseContext === 'string') {
              normalizedPurchaseContext = { timing: normalizedPurchaseContext };
            } else if (normalizedPurchaseContext && typeof normalizedPurchaseContext === 'object' && !Array.isArray(normalizedPurchaseContext)) {
              // null値をundefinedに変換（zodスキーマとの整合性のため）
              normalizedPurchaseContext = {
                timing: normalizedPurchaseContext.timing === null ? undefined : normalizedPurchaseContext.timing,
                channel: normalizedPurchaseContext.channel === null ? undefined : normalizedPurchaseContext.channel,
                type: normalizedPurchaseContext.type,
              };
            } else {
              normalizedPurchaseContext = null;
            }
            
            // job_to_be_done: 正規化
            let normalizedJobToBeDone = aiResult.job_to_be_done;
            if (typeof normalizedJobToBeDone === 'string') {
              normalizedJobToBeDone = { functional: [normalizedJobToBeDone] };
            } else if (normalizedJobToBeDone && typeof normalizedJobToBeDone === 'object' && !Array.isArray(normalizedJobToBeDone)) {
              // 既にオブジェクトの場合はそのまま
            } else {
              normalizedJobToBeDone = null;
            }
            
            // decision_criteria: 正規化、null値をundefinedに変換
            let normalizedDecisionCriteria = aiResult.decision_criteria;
            if (typeof normalizedDecisionCriteria === 'string') {
              normalizedDecisionCriteria = null;
            } else if (normalizedDecisionCriteria && typeof normalizedDecisionCriteria === 'object' && !Array.isArray(normalizedDecisionCriteria)) {
              // null値をundefinedに変換（zodスキーマとの整合性のため）
              normalizedDecisionCriteria = {
                price: normalizedDecisionCriteria.price === null ? undefined : normalizedDecisionCriteria.price,
                trust: normalizedDecisionCriteria.trust === null ? undefined : normalizedDecisionCriteria.trust,
                effort: normalizedDecisionCriteria.effort === null ? undefined : normalizedDecisionCriteria.effort,
                effectiveness: normalizedDecisionCriteria.effectiveness === null ? undefined : normalizedDecisionCriteria.effectiveness,
              };
            } else {
              normalizedDecisionCriteria = null;
            }
            
            // behavior_patterns: 正規化、null値をundefinedに変換
            let normalizedBehaviorPatterns = aiResult.behavior_patterns;
            if (typeof normalizedBehaviorPatterns === 'string') {
              normalizedBehaviorPatterns = { what: normalizedBehaviorPatterns };
            } else if (normalizedBehaviorPatterns && typeof normalizedBehaviorPatterns === 'object' && !Array.isArray(normalizedBehaviorPatterns)) {
              // null値をundefinedに変換（zodスキーマとの整合性のため）
              normalizedBehaviorPatterns = {
                who: normalizedBehaviorPatterns.who === null ? undefined : normalizedBehaviorPatterns.who,
                when: normalizedBehaviorPatterns.when === null ? undefined : normalizedBehaviorPatterns.when,
                what: normalizedBehaviorPatterns.what === null ? undefined : normalizedBehaviorPatterns.what,
              };
            } else {
              normalizedBehaviorPatterns = null;
            }
            
            // trigger, barriers, information_sources: 配列に正規化
            const normalizedTrigger = Array.isArray(aiResult.trigger) ? aiResult.trigger : (aiResult.trigger ? [String(aiResult.trigger)] : []);
            const normalizedBarriers = Array.isArray(aiResult.barriers) ? aiResult.barriers : (aiResult.barriers ? [String(aiResult.barriers)] : []);
            const normalizedInformationSources = Array.isArray(aiResult.information_sources) ? aiResult.information_sources : (aiResult.information_sources ? [String(aiResult.information_sources)] : []);
            
            // confidence算出
            const recordForConfidence: ExtractionRecord = {
              respondent_id: aiResult.respondent_id || respondentId,
              role: aiResult.role || null,
              relationship: aiResult.relationship || null,
              household: normalizedHousehold,
              purchase_context: normalizedPurchaseContext,
              trigger: normalizedTrigger,
              job_to_be_done: normalizedJobToBeDone,
              barriers: normalizedBarriers,
              decision_criteria: normalizedDecisionCriteria,
              information_sources: normalizedInformationSources,
              behavior_patterns: normalizedBehaviorPatterns,
              quotes,
              field_quotes: fieldQuotes,
              confidence: 0,
              confidence_breakdown: {
                quote_count_score: 0,
                field_completeness_score: 0,
                quote_clarity_score: 0,
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: 'system',
              updated_by: 'system',
              finalized: false,
            };
            
            const confidenceBreakdown = get().calculateConfidence(recordForConfidence);
            let confidence = Math.min(1, 
              confidenceBreakdown.quote_count_score +
              confidenceBreakdown.field_completeness_score +
              confidenceBreakdown.quote_clarity_score
            );
            
            // confidenceがnanや無効な値の場合は0に設定
            if (!isFinite(confidence) || isNaN(confidence)) {
              console.warn(`confidenceが無効な値です。0に設定します (${respondentId}):`, confidence);
              confidence = 0;
            }
            
            const record: ExtractionRecord = {
              ...recordForConfidence,
              confidence: Math.max(0, Math.min(1, confidence)), // 0-1の範囲に制限
              confidence_breakdown: confidenceBreakdown,
            };
            
            // zodスキーマ検証
            try {
              ExtractionRecordSchema.parse(record);
            } catch (schemaError) {
              console.error(`ExtractionRecordスキーマ検証エラー (${respondentId}):`, schemaError);
              throw new Error(`スキーマ検証に失敗しました: ${schemaError instanceof Error ? schemaError.message : '不明なエラー'}`);
            }
            
            extractionRecords.push(record);
            
            // 整合性問題を記録
            if (quoteIntegrityIssues.length > 0) {
              allIntegrityIssues.push({
                respondent_id: respondentId,
                issues: quoteIntegrityIssues,
              });
            }
          }
        } catch (error) {
          console.error(`Extraction生成エラー (${source.id}):`, error);
          throw error; // エラーを再スローして上位で処理
        }
      }
      
      set({ 
        extractionRecords,
        quoteIntegrityIssues: allIntegrityIssues,
      });
      
      // Extraction生成時に履歴IDを生成（Extractionごとに1行をキープするため）
      // 既存の履歴を探す（同じrespondent_idのセットなら同じ履歴）
      const existingHistories = getPersonaHistories();
      const respondentIds = extractionRecords.map(r => r.respondent_id).sort().join(',');
      const existingHistory = existingHistories.find((h) => {
        const hRespondentIds = h.extractionRecords.map((r: any) => r.respondent_id).sort().join(',');
        return hRespondentIds === respondentIds;
      });
      
      if (existingHistory) {
        // 既存の履歴IDをキープ
        set({ currentHistoryId: existingHistory.historyId });
      } else {
        // 新しい履歴IDを生成（最初の保存時に設定される）
        set({ currentHistoryId: null });
      }
      
      // 整合性問題がある場合は警告表示
      if (allIntegrityIssues.length > 0) {
        const totalIssues = allIntegrityIssues.reduce((sum, item) => sum + item.issues.length, 0);
        console.warn('quotes整合性チェックで問題が見つかりました:', allIntegrityIssues);
        alert(`Extraction生成が完了しましたが、${totalIssues}件のquotes整合性問題が見つかりました。\n確認画面で修正してください。`);
      }
    } catch (error) {
      console.error('Extraction生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // APIキーが設定されていない場合の特別な処理
      if (errorMessage.includes('APIキーが設定されていません')) {
        const setupInfo = errorMessage.split('\n\n')[1] || '';
        alert(`APIキーが設定されていません。\n\n${setupInfo}\n\n詳細は README_LLM_SETUP.md を参照してください。`);
      } else {
        alert(`Extraction生成でエラーが発生しました: ${errorMessage}`);
      }
      throw error;
    }
  },
  
  // ExtractionRecord管理
  addExtractionRecord: (record) => {
    set((state) => ({
      extractionRecords: [...state.extractionRecords, record],
    }));
  },
  
  updateExtractionRecord: (respondent_id, updates) => {
    set((state) => {
      const record = state.extractionRecords.find((r) => r.respondent_id === respondent_id);
      // 確定済みの場合は編集不可
      if (record?.finalized) {
        return state;
      }
      return {
        extractionRecords: state.extractionRecords.map((r) =>
          r.respondent_id === respondent_id
            ? { ...r, ...updates, updated_at: new Date().toISOString(), updated_by: 'user' }
            : r
        ),
      };
    });
  },
  
  deleteExtractionRecord: (respondent_id) => {
    set((state) => {
      const record = state.extractionRecords.find((r) => r.respondent_id === respondent_id);
      // 確定済みの場合は削除不可
      if (record?.finalized) {
        return state;
      }
      return {
        extractionRecords: state.extractionRecords.filter((r) => r.respondent_id !== respondent_id),
      };
    });
  },
  
  // Extraction確定（ゲート化）
  finalizeExtractionRecords: () => {
    set((state) => ({
      extractionRecords: state.extractionRecords.map((r) => ({
        ...r,
        finalized: true,
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'user',
      })),
    }));
  },
  
  // 確定済みかどうか
  isExtractionFinalized: () => {
    const { extractionRecords } = get();
    if (extractionRecords.length === 0) return false;
    return extractionRecords.every((r) => r.finalized);
  },
  
  // 確定済みExtractionRecordのみを取得（Aggregation生成の入力として使用）
  getFinalizedExtractionRecords: () => {
    const { extractionRecords } = get();
    return extractionRecords.filter((r) => r.finalized);
  },
  
  // confidence算出
  calculateConfidence: (record) => {
    const quoteCount = record.quotes.length;
    let quoteCountScore = 0;
    if (quoteCount === 0) quoteCountScore = 0;
    else if (quoteCount <= 5) quoteCountScore = 0.1;
    else if (quoteCount <= 10) quoteCountScore = 0.2;
    else if (quoteCount <= 15) quoteCountScore = 0.3;
    else quoteCountScore = 0.4;
    
    // フィールド充足率
    const totalFields = 12; // role, relationship, household, purchase_context, trigger, job_to_be_done, barriers, decision_criteria, information_sources, behavior_patterns + その他
    let filledFields = 0;
    if (record.role !== null) filledFields++;
    if (record.relationship !== null) filledFields++;
    if (record.household !== null) filledFields++;
    if (record.purchase_context !== null) filledFields++;
    if (record.trigger.length > 0) filledFields++;
    if (record.job_to_be_done !== null) filledFields++;
    if (record.barriers.length > 0) filledFields++;
    if (record.decision_criteria !== null) filledFields++;
    if (record.information_sources.length > 0) filledFields++;
    if (record.behavior_patterns !== null) filledFields++;
    
    const completeness = filledFields / totalFields;
    let fieldCompletenessScore = 0;
    if (completeness <= 0.3) fieldCompletenessScore = 0;
    else if (completeness <= 0.5) fieldCompletenessScore = 0.1;
    else if (completeness <= 0.7) fieldCompletenessScore = 0.2;
    else fieldCompletenessScore = 0.3;
    
    // 引用の明確性
    let quoteClarityScore = 0;
    if (record.quotes.length > 0) {
      for (const quote of record.quotes) {
        if (quote.text.length >= 10 && quote.text.length <= 50) quoteClarityScore += 0.05;
        if (quote.text.length > 50) quoteClarityScore += 0.03;
        if (quote.line_number) quoteClarityScore += 0.02;
      }
      quoteClarityScore = Math.min(0.3, quoteClarityScore / record.quotes.length * 10);
    } else {
      // quotesが空の場合は0
      quoteClarityScore = 0;
    }
    
    return {
      quote_count_score: quoteCountScore,
      field_completeness_score: fieldCompletenessScore,
      quote_clarity_score: quoteClarityScore,
    };
  },
  
  setSelectedExtractionRecord: (respondent_id) => {
    set({ selectedExtractionRecord: respondent_id });
  },
  
  // quotes整合性問題を設定
  setQuoteIntegrityIssues: (issues) => {
    set({ quoteIntegrityIssues: issues });
  },
  
  // 要約生成（発言ベース、推測なし）- 後方互換のため残す
  // 新しい設計では、Extraction → Aggregation → Personaの順で生成するため、この関数は使用しない
  generateSummaries: () => {
    // 新しい設計では、ExtractionRecordからAggregationを生成する
    // この関数は後方互換のため残すが、空の配列を返す
    set({ personaSummaries: [] });
  },
  
  // 比較データ生成（新しいPersona型に対応、AI使用）
  generateComparison: async () => {
    const { personas } = get();
    
    if (personas.length < 2) {
      set({ comparison: null });
      return;
    }
    
    const personaIds = personas.map((p) => p.id);
    const comparison: PersonaComparison = {
      personas: personaIds,
      comparison: {
        one_line_summary: {},
        background_story: {},
        proxy_purchase_structure: {},
        job_to_be_done: {},
        decision_criteria_top5: {},
        typical_journey: {},
        common_misconceptions: {},
        effective_strategies: {},
      },
      commonPoints: [],
      differences: [],
    };
    
    // 各ペルソナの情報を比較データに格納
    for (const persona of personas) {
      comparison.comparison.one_line_summary[persona.id] = persona.one_line_summary;
      comparison.comparison.background_story[persona.id] = persona.background_story;
      comparison.comparison.proxy_purchase_structure[persona.id] = persona.proxy_purchase_structure;
      comparison.comparison.job_to_be_done[persona.id] = persona.job_to_be_done;
      comparison.comparison.decision_criteria_top5[persona.id] = persona.decision_criteria_top5;
      comparison.comparison.typical_journey[persona.id] = persona.typical_journey;
      comparison.comparison.common_misconceptions[persona.id] = persona.common_misconceptions;
      comparison.comparison.effective_strategies[persona.id] = persona.effective_strategies;
    }
    
    // AIを使って詳細な比較分析を生成
    try {
      const analysisResult = await generateComparisonWithAI(personas);
      
      // AI分析結果をマージ
      if (analysisResult.commonPoints && Array.isArray(analysisResult.commonPoints)) {
        comparison.commonPoints = analysisResult.commonPoints;
      }
      if (analysisResult.differences && Array.isArray(analysisResult.differences)) {
        comparison.differences = analysisResult.differences;
      }
      if (analysisResult.detailedAnalysis) {
        comparison.detailedAnalysis = analysisResult.detailedAnalysis;
      }
    } catch (error) {
      console.error('比較分析生成エラー:', error);
      // フォールバック: 簡易版の共通点・相違点抽出
      const allCriteria = new Set<string>();
      for (const persona of personas) {
        for (const criterion of persona.decision_criteria_top5) {
          allCriteria.add(criterion.criterion);
        }
      }
      
      if (allCriteria.size > 0) {
        comparison.commonPoints.push(`判断基準: ${Array.from(allCriteria).join(', ')}`);
      }
      
      // 相違点の簡易抽出
      const summaries = personas.map(p => p.one_line_summary);
      if (summaries.length > 1 && new Set(summaries).size === summaries.length) {
        comparison.differences.push('各ペルソナの特徴が異なる（詳細な分析は生成できませんでした）');
      }
    }
    
    set({ comparison });
  },
  
  // Aggregation生成（B. Aggregation）- AI（LLM）を使用、確定済みExtractionRecordのみを入力とする
  generateAggregation: async () => {
    const finalizedRecords = get().getFinalizedExtractionRecords();
    
    if (finalizedRecords.length === 0) {
      alert('確定済みのExtraction Recordがありません。');
      return;
    }
    
    try {
      // AIでAggregation生成
      const aggregation = await generateAggregationWithAI(finalizedRecords);
      
      // 型チェックとバリデーション
      if (!aggregation || !aggregation.clusters || !Array.isArray(aggregation.clusters)) {
        throw new Error('AIからの応答が無効です。');
      }
      
      // クラスタ数が2〜5の範囲内か確認
      if (aggregation.clusters.length < 2 || aggregation.clusters.length > 5) {
        console.warn(`クラスタ数が範囲外です: ${aggregation.clusters.length}。調整が必要です。`);
      }
      
      // メタデータを追加
      aggregation.total_respondents = finalizedRecords.length;
      aggregation.metadata = {
        generated_at: new Date().toISOString(),
        extraction_count: finalizedRecords.length,
      };
      
      set({ aggregation });
    } catch (error) {
      console.error('Aggregation生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // APIキーが設定されていない場合の特別な処理
      if (errorMessage.includes('APIキーが設定されていません')) {
        const setupInfo = errorMessage.split('\n\n')[1] || '';
        alert(`APIキーが設定されていません。\n\n${setupInfo}\n\n詳細は README_LLM_SETUP.md を参照してください。`);
      } else {
        alert(`Aggregation生成でエラーが発生しました: ${errorMessage}\nフォールバック処理を使用します。`);
      }
      
      // フォールバック: ルールベースクラスタリング
      // （既存のルールベース実装をここに追加可能）
    }
  },
  
  // ナレッジベース関連のアクション
  savePersonaToKnowledgeBase: async (persona: Persona, title?: string) => {
    const { project } = get();
    
    // UUID生成（簡易版）
    const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // タイトル生成（自動命名）
    const autoTitle = title || `KB-Persona-${String(get().knowledgeBaseItems.length + 1).padStart(3, '0')}_${persona.one_line_summary.substring(0, 20)}`;
    
    // PersonaからSavedPersonaに変換
    const savedPersona: SavedPersona = {
      persona_id: personaId,
      title: autoTitle,
      hypothesis_label: '仮説ペルソナ',
      summary: persona.one_line_summary,
      story: persona.background_story,
      proxy_structure: {
        whose_problem: persona.proxy_purchase_structure.whose_problem,
        who_solves: persona.proxy_purchase_structure.who_solves,
        how: persona.proxy_purchase_structure.how,
      },
      jtbd: {
        functional: persona.job_to_be_done.functional || [],
        emotional: persona.job_to_be_done.emotional || [],
        social: persona.job_to_be_done.social || [],
      },
      decision_criteria_top5: persona.decision_criteria_top5 || [],
      journey: {
        trigger: persona.typical_journey.trigger,
        consider: persona.typical_journey.consideration,
        purchase: persona.typical_journey.purchase,
        continue: persona.typical_journey.retention,
      },
      pitfalls: persona.common_misconceptions || [],
      tactics: {
        message: persona.effective_strategies?.messages,
        route: persona.effective_strategies?.touchpoints,
        offer: persona.effective_strategies?.offers,
      },
      evidence: {
        quotes: persona.evidence.quotes || [],
        count: persona.evidence.count || 0,
      },
      evidence_quotes: [], // Persona.evidence.quotesから変換が必要な場合は追加
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_project_id: project?.id,
      owner: 'Current User', // 後でユーザー管理機能を追加
      shared: false,
    };
    
    // KnowledgeBaseItemを作成
    const kbItem: KnowledgeBaseItem = {
      id: personaId,
      title: autoTitle,
      owner: savedPersona.owner || 'Current User',
      shared: false,
      updated_at: savedPersona.updated_at,
      folder: 'My Files/ペルソナ',
      type: 'persona',
      persona: savedPersona,
    };
    
    // ストアに追加
    set((state) => ({
      knowledgeBaseItems: [...state.knowledgeBaseItems, kbItem],
    }));
    
    // ローカルストレージに保存（永続化）
    if (typeof window !== 'undefined') {
      const items = get().knowledgeBaseItems;
      localStorage.setItem('persona-knowledge-base', JSON.stringify(items));
    }
    
    return personaId;
  },
  
  saveComparisonToKnowledgeBase: async (comparison: PersonaComparison, title?: string) => {
    const { project, personas } = get();
    const { useProductStore } = await import('@/store/useProductStore');
    const { activeProduct } = useProductStore.getState();
    
    // UUID生成（簡易版）
    const comparisonId = `comparison-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // タイトル生成（自動命名）
    const personaNames = comparison.personas.map(id => {
      const persona = personas.find(p => p.id === id);
      return persona?.one_line_summary.substring(0, 15) || id;
    }).join(' vs ');
    const autoTitle = title || `KB-Comparison-${Date.now()}_${personaNames}`;
    
    // APIエンドポイント経由で保存
    const response = await fetch('/api/kb/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'report',
        title: autoTitle,
        folder_path: 'My Files/比較',
        tags: [],
        owner_id: 'user',
        visibility: 'private',
        source_app: 'persona-app',
        source_project_id: activeProduct?.productId,
        payload: {
          type: 'report',
          report_id: comparisonId,
          aggregation: null, // 比較データは別形式で保存
          total_banners: 0,
          comparison_data: comparison, // 比較データを追加
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to save comparison';
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error || error.message || errorMessage;
      } catch (parseError) {
        if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
          errorMessage = `APIエラー (${response.status}): HTMLエラーページが返されました。`;
        } else {
          errorMessage = `APIエラー (${response.status}): ${errorText.substring(0, 200)}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.item.kb_id;
  },
  
  getKnowledgeBaseItems: () => {
    return get().knowledgeBaseItems;
  },
  
  getKnowledgeBaseItem: (id: string) => {
    return get().knowledgeBaseItems.find(item => item.id === id) || null;
  },
  
  updateKnowledgeBaseItem: (id: string, updates: Partial<KnowledgeBaseItem>) => {
    set((state) => {
      const items = state.knowledgeBaseItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          // 更新日時を更新
          updated.updated_at = new Date().toISOString();
          // personaも更新
          if (updates.persona) {
            updated.persona = { ...updated.persona, ...updates.persona, updated_at: updated.updated_at };
          }
          return updated;
        }
        return item;
      });
      
      // ローカルストレージに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('persona-knowledge-base', JSON.stringify(items));
      }
      
      return { knowledgeBaseItems: items };
    });
  },
  
  deleteKnowledgeBaseItem: (id: string) => {
    set((state) => {
      const items = state.knowledgeBaseItems.filter(item => item.id !== id);
      
      // ローカルストレージに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('persona-knowledge-base', JSON.stringify(items));
      }
      
      return { knowledgeBaseItems: items };
    });
  },
  
  searchKnowledgeBase: (query: string) => {
    const items = get().knowledgeBaseItems;
    if (!query.trim()) {
      return items;
    }
    const lowerQuery = query.toLowerCase();
    return items.filter(item => {
      if (item.title.toLowerCase().includes(lowerQuery)) return true;
      if (item.type === 'persona' && item.persona?.summary.toLowerCase().includes(lowerQuery)) return true;
      if (item.type === 'comparison' && item.comparison?.title.toLowerCase().includes(lowerQuery)) return true;
      return false;
    });
  },
  
  // アクティブペルソナ関連
  setActivePersona: (persona: SavedPersona | null) => {
    set({ activePersona: persona });
    
    // ローカルストレージにも保存（他アプリ連携用）
    if (typeof window !== 'undefined') {
      if (persona) {
        localStorage.setItem('active-persona', JSON.stringify(persona));
      } else {
        localStorage.removeItem('active-persona');
      }
    }
  },
  
  copyPersonaToClipboard: async (persona: SavedPersona) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(persona, null, 2));
      alert('ペルソナJSONをクリップボードにコピーしました。');
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました:', error);
      alert('クリップボードへのコピーに失敗しました。');
    }
  },
  
  // 履歴関連
  saveHistory: () => {
    if (typeof window === 'undefined') return;
    
    const state = get();
    const { extractionRecords, currentStep, aggregation, personas, personaAxes, comparison, currentHistoryId } = state;
    
    // ExtractionRecordsがない場合は保存しない
    if (extractionRecords.length === 0) return;
    
    try {
      // タイトルを自動生成
      const title = `履歴_${new Date().toLocaleDateString('ja-JP')}_${extractionRecords.length}件`;
      
      if (currentHistoryId) {
        // 既存の履歴を更新（Extractionごとに1行をキープ）
        updatePersonaHistory(currentHistoryId, {
          title,
          currentStep,
          extractionRecords,
          aggregation,
          personas,
          personaAxes,
          comparison,
          extractionCount: extractionRecords.length,
          lastStepName: getStepName(currentStep),
        });
      } else {
        // 新しい履歴を作成
        const newHistory = createPersonaHistory({
          title,
          currentStep,
          extractionRecords,
          aggregation,
          personas,
          personaAxes,
          comparison,
          extractionCount: extractionRecords.length,
          lastStepName: getStepName(currentStep),
        });
        // 履歴IDを保存
        set({ currentHistoryId: newHistory.historyId });
      }
    } catch (error) {
      console.error('履歴の保存に失敗しました:', error);
    }
  },
  
  restoreFromHistory: (historyId: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const history = getPersonaHistory(historyId);
      if (!history) {
        alert('履歴が見つかりませんでした。');
        return;
      }
      
      // 履歴から状態を復元
      // 注意: currentStepが'knowledge-base'の場合は'comparison'に戻す（保存前の画面に戻る）
      const restoredStep = history.currentStep === 'knowledge-base' ? 'comparison' : history.currentStep;
      
      set({
        extractionRecords: history.extractionRecords,
        aggregation: history.aggregation,
        personas: history.personas,
        personaAxes: history.personaAxes,
        comparison: history.comparison,
        currentStep: restoredStep,
        currentHistoryId: history.historyId, // 履歴IDをキープ
      });
      
      // ステップに遷移
      const { setCurrentStep } = get();
      setCurrentStep(restoredStep);
    } catch (error) {
      console.error('履歴の復元に失敗しました:', error);
      alert('履歴の復元に失敗しました。');
    }
  },
  
  getHistories: () => {
    if (typeof window === 'undefined') return [];
    return getPersonaHistories();
  },
  
  deleteHistory: (historyId: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      deletePersonaHistory(historyId);
      
      // 現在の履歴IDが削除された場合はクリア
      const { currentHistoryId } = get();
      if (currentHistoryId === historyId) {
        set({ currentHistoryId: null });
      }
    } catch (error) {
      console.error('履歴の削除に失敗しました:', error);
      alert('履歴の削除に失敗しました。');
    }
  },
  
  setCurrentHistoryId: (historyId: string | null) => {
    set({ currentHistoryId: historyId });
  },
  
  resetSession: () => {
    // 新規セッションを開始（状態をリセット）
    set({
      inputSources: [],
      statements: [],
      extractionRecords: [],
      aggregation: null,
      personas: [],
      personaAxes: [],
      comparison: null,
      updatingPersonaId: null,
      selectedPersona: null,
      selectedEvidence: null,
      selectedExtractionRecord: null,
      quoteIntegrityIssues: [],
      currentStep: 'input',
      currentHistoryId: null,
    });
  },
}));

// ローカルストレージからナレッジベースを読み込む（初期化時）
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('persona-knowledge-base');
    if (stored) {
      const items = JSON.parse(stored) as KnowledgeBaseItem[];
      usePersonaStore.setState({ knowledgeBaseItems: items });
    }
  } catch (error) {
    console.error('ナレッジベースの読み込みに失敗しました:', error);
  }
}
