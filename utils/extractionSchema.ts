/**
 * ExtractionRecordのスキーマ検証用（zod）
 */

import { z } from 'zod';

// Quoteスキーマ
const QuoteSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'quoteTextは必須です'),
  source_file: z.string().min(1, 'sourceは必須です'),
  line_number: z.number().optional(),
  line_range: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
  category: z.string(),
  statement_id: z.string().min(1, 'statementIdは必須です'),
  linked_fields: z.array(z.string()).optional(),
});

// ExtractionRecordスキーマ
export const ExtractionRecordSchema = z.object({
  respondent_id: z.string().min(1, 'respondent_idは必須です'),
  role: z.string().nullable(), // 柔軟に生成可能（例: "代理購入者", "本人購入者", "不明", "恋人", "同棲パートナー"など）
  relationship: z.string().nullable(), // 柔軟に生成可能（例: "配偶者", "親", "子", "その他", "恋人", "同棲パートナー"など）
  household: z.object({
    composition: z.string().nullish(),
    age_range: z.string().nullish(),
    occupation: z.string().nullish(),
  }).nullable(),
  purchase_context: z.object({
    timing: z.string().nullish(),
    channel: z.string().nullish(),
    type: z.enum(['定期', 'まとめ買い', '単発']).nullable(),
  }).nullable(),
  trigger: z.array(z.string()),
  job_to_be_done: z.object({
    functional: z.array(z.string()).nullish(),
    emotional: z.array(z.string()).nullish(),
    social: z.array(z.string()).nullish(),
  }).nullable(),
  barriers: z.array(z.string()),
  decision_criteria: z.object({
    price: z.number().min(0).max(1).nullish(),
    trust: z.number().min(0).max(1).nullish(),
    effort: z.number().min(0).max(1).nullish(),
    effectiveness: z.number().min(0).max(1).nullish(),
  }).nullable(),
  information_sources: z.array(z.string()),
  behavior_patterns: z.object({
    who: z.string().nullish(),
    when: z.string().nullish(),
    what: z.string().nullish(),
  }).nullable(),
  quotes: z.array(QuoteSchema).min(1, 'quotesは必須です（最低1件）'),
  field_quotes: z.object({
    role: z.array(QuoteSchema).optional(),
    relationship: z.array(QuoteSchema).optional(),
    household: z.array(QuoteSchema).optional(),
    purchase_context: z.array(QuoteSchema).optional(),
    trigger: z.array(QuoteSchema).optional(),
    job_to_be_done: z.object({
      functional: z.array(QuoteSchema).optional(),
      emotional: z.array(QuoteSchema).optional(),
      social: z.array(QuoteSchema).optional(),
    }).optional(),
    barriers: z.array(QuoteSchema).optional(),
    decision_criteria: z.object({
      price: z.array(QuoteSchema).optional(),
      trust: z.array(QuoteSchema).optional(),
      effort: z.array(QuoteSchema).optional(),
      effectiveness: z.array(QuoteSchema).optional(),
    }).optional(),
    information_sources: z.array(QuoteSchema).optional(),
    behavior_patterns: z.array(QuoteSchema).optional(),
  }),
  confidence: z.number().min(0).max(1),
  confidence_breakdown: z.object({
    quote_count_score: z.number().min(0).max(0.4),
    field_completeness_score: z.number().min(0).max(0.3),
    quote_clarity_score: z.number().min(0).max(0.3),
  }),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.enum(['system', 'user']),
  updated_by: z.enum(['system', 'user']),
  finalized: z.boolean(),
  finalized_at: z.string().optional(),
});

// ExtractionRecord配列のスキーマ
export const ExtractionRecordArraySchema = z.array(ExtractionRecordSchema);

/**
 * quotesの整合性チェック結果
 */
export interface QuoteIntegrityIssue {
  quoteId: string;
  type: 'missing_statement' | 'text_mismatch' | 'line_range_mismatch';
  message: string;
}

/**
 * quotesの整合性をチェック
 */
export function validateQuoteIntegrity(
  quote: z.infer<typeof QuoteSchema>,
  statements: Array<{ id: string; text: string; source: string; metadata?: { lineNumber?: number; line_range?: { start: number; end: number } } }>
): QuoteIntegrityIssue[] {
  const issues: QuoteIntegrityIssue[] = [];
  
  // 1. statementIdが存在すること
  const statement = statements.find((s) => s.id === quote.statement_id);
  if (!statement) {
    issues.push({
      quoteId: quote.id,
      type: 'missing_statement',
      message: `statementId "${quote.statement_id}" が存在しません`,
    });
    return issues; // statementが存在しない場合は他のチェックをスキップ
  }
  
  // 2. quoteTextが該当statement.textに含まれる（またはspanが一致する）
  // 注: AIが生成したquoteは元のテキストから正確に引用されるべきだが、
  // 改行や空白の違い、フィールド名の付加、部分的な不一致がある可能性を考慮して、段階的にチェックする
  let textMatchFound = false;
  
  // まず完全一致をチェック
  if (statement.text.includes(quote.text)) {
    textMatchFound = true;
  } else {
    // フィールド名ラベルを除去してからチェック（「職業」「年齢」「都道府県」など）
    // AIがフィールド名を追加している可能性がある
    const fieldLabels = ['職業', '年齢', '都道府県', '職業', '年齢帯', '家族構成', '購入タイミング', 'チャネル', 'トリガー', 'きっかけ', '判断基準', '障壁', '情報源'];
    let cleanedQuoteText = quote.text;
    for (const label of fieldLabels) {
      // 「職業 会社員」のような形式から「職業」を除去
      if (cleanedQuoteText.startsWith(label + ' ') || cleanedQuoteText.startsWith(label + '\t')) {
        cleanedQuoteText = cleanedQuoteText.substring(label.length).trim();
      }
      // 「職業: 会社員」「職業：会社員」のような形式から「職業:」「職業：」を除去
      const colonPattern = new RegExp(`^${label}[:：]\\s*`);
      cleanedQuoteText = cleanedQuoteText.replace(colonPattern, '').trim();
    }
    
    // フィールド名を除去したquoteTextでチェック
    if (cleanedQuoteText !== quote.text && cleanedQuoteText.length > 0) {
      if (statement.text.includes(cleanedQuoteText)) {
        textMatchFound = true;
      }
    }
    
    if (!textMatchFound) {
      // 大文字小文字を無視してチェック
      const lowerStatementText = statement.text.toLowerCase();
      const lowerQuoteText = quote.text.toLowerCase();
      const lowerCleanedQuoteText = cleanedQuoteText.toLowerCase();
      
      if (lowerStatementText.includes(lowerQuoteText)) {
        textMatchFound = true;
      } else if (cleanedQuoteText !== quote.text && lowerStatementText.includes(lowerCleanedQuoteText)) {
        textMatchFound = true;
      } else {
        // 空白・改行・句読点を正規化してチェック
        const normalizedStatementText = statement.text.replace(/[\s\u3000。、，．]/g, '');
        const normalizedQuoteText = quote.text.replace(/[\s\u3000。、，．]/g, '');
        const normalizedCleanedQuoteText = cleanedQuoteText.replace(/[\s\u3000。、，．]/g, '');
        
        if (normalizedStatementText.includes(normalizedQuoteText)) {
          textMatchFound = true;
        } else if (cleanedQuoteText !== quote.text && normalizedStatementText.includes(normalizedCleanedQuoteText)) {
          textMatchFound = true;
        } else {
          // quoteの主要部分が含まれているかチェック（短いフィールドにも対応）
          const checkText = cleanedQuoteText.length > 0 ? cleanedQuoteText : quote.text;
          const minLength = Math.min(10, checkText.length); // 最低10文字またはquote全体
          
          if (checkText.length >= minLength) {
            // 先頭部分をキーワードとしてチェック
            const quoteKeywords = checkText.substring(0, Math.min(30, checkText.length)).replace(/[\s\u3000。、，．]/g, '');
            if (normalizedStatementText.includes(quoteKeywords)) {
              textMatchFound = true;
            }
            // 末尾部分もチェック
            if (!textMatchFound && checkText.length > minLength) {
              const quoteEndKeywords = checkText.substring(Math.max(0, checkText.length - 30)).replace(/[\s\u3000。、，．]/g, '');
              if (normalizedStatementText.includes(quoteEndKeywords)) {
                textMatchFound = true;
              }
            }
            // キーワード抽出（「会社員」「経営企画」などの個別の単語）
            if (!textMatchFound) {
              // より柔軟なキーワード抽出（句読点、助詞、接続詞を除去）
              const extractKeywords = (text: string): string[] => {
                // 助詞・接続詞を除去してキーワードを抽出
                const particles = ['が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より', 'ので', 'から', 'ため', 'の', 'は', 'も', 'か', 'や', 'など', 'とか', 'って', 'で', 'て', 'た', 'だ', 'である', 'です', 'ます'];
                let cleaned = text;
                for (const particle of particles) {
                  cleaned = cleaned.replace(new RegExp(particle, 'g'), ' ');
                }
                // 空白、句読点で分割してキーワードを抽出
                return cleaned.split(/[\s\u3000、，．\t\n]/)
                  .map(k => k.trim())
                  .filter(k => k.length >= 1) // 1文字以上でもチェック
                  .filter(k => !particles.includes(k));
              };
              
              const quoteKeywords = extractKeywords(checkText);
              const statementKeywords = extractKeywords(statement.text);
              
              // キーワードの一致をチェック
              const matchedKeywords = quoteKeywords.filter(k => {
                const normalizedK = k.replace(/[\s\u3000。、，．]/g, '');
                return statementKeywords.some(sk => {
                  const normalizedSk = sk.replace(/[\s\u3000。、，．]/g, '');
                  return normalizedSk.includes(normalizedK) || normalizedK.includes(normalizedSk);
                });
              });
              
              // キーワードの30%以上がマッチすれば一致とみなす（閾値を下げる）
              if (quoteKeywords.length > 0 && matchedKeywords.length / quoteKeywords.length >= 0.3) {
                textMatchFound = true;
              }
              
              // さらに柔軟なチェック: quoteTextの主要な単語がstatement.textに含まれているか
              if (!textMatchFound && quoteKeywords.length >= 2) {
                // 重要なキーワード（長い単語、名詞っぽいもの）を優先
                const importantKeywords = quoteKeywords
                  .filter(k => k.length >= 2)
                  .sort((a, b) => b.length - a.length)
                  .slice(0, Math.min(5, quoteKeywords.length));
                
                const importantMatched = importantKeywords.filter(k => {
                  const normalizedK = k.replace(/[\s\u3000。、，．]/g, '');
                  return normalizedStatementText.includes(normalizedK);
                });
                
                // 重要なキーワードの50%以上がマッチすれば一致とみなす
                if (importantKeywords.length > 0 && importantMatched.length / importantKeywords.length >= 0.5) {
                  textMatchFound = true;
                }
              }
            }
          }
        }
      }
    }
  }
  
  // 一致が見つからない場合のみ警告を出す（エラーではない）
  // ただし、quoteTextが極めて短い場合（2文字以下）や空白のみの場合はスキップ
  // また、キーワードの一部でも一致している場合は警告の重要度を下げる
  if (!textMatchFound && quote.text.length > 2 && quote.text.trim().length > 0) {
    // 最後のチェック: quoteTextの一部でもstatement.textに含まれているか
    const quoteWords = quote.text.split(/[\s\u3000、，．\t\n]/).filter(w => w.length >= 2);
    const partialMatch = quoteWords.some(word => {
      const normalizedWord = word.replace(/[\s\u3000。、，．]/g, '');
      const normalizedStatement = statement.text.replace(/[\s\u3000。、，．]/g, '');
      return normalizedStatement.includes(normalizedWord);
    });
    
    // 部分一致がある場合は、警告メッセージを柔軟にする
    const message = partialMatch
      ? `quoteTextが該当statement.textに完全一致していませんが、一部のキーワードは一致しています（AIが要約・再構成した可能性があります）。元テキストを確認してください。quote: "${quote.text.substring(0, 100)}${quote.text.length > 100 ? '...' : ''}"`
      : `quoteTextが該当statement.textに一致していません（AIが要約・再構成した可能性があります）。元テキストを確認してください。quote: "${quote.text.substring(0, 100)}${quote.text.length > 100 ? '...' : ''}"`;
    
    issues.push({
      quoteId: quote.id,
      type: 'text_mismatch',
      message,
    });
  }
  
  // 3. line_rangeがstatementのline_rangeと矛盾しない
  if (quote.line_range && statement.metadata?.line_range) {
    const quoteRange = quote.line_range;
    const statementRange = statement.metadata.line_range;
    
    // quoteのline_rangeがstatementのline_rangeの範囲外にある場合
    if (quoteRange.start < statementRange.start || quoteRange.end > statementRange.end) {
      issues.push({
        quoteId: quote.id,
        type: 'line_range_mismatch',
        message: `line_rangeが矛盾しています。statement: ${statementRange.start}-${statementRange.end}, quote: ${quoteRange.start}-${quoteRange.end}`,
      });
    }
  }
  
  // line_numberとline_rangeの整合性チェック
  if (quote.line_number && quote.line_range) {
    if (quote.line_number < quote.line_range.start || quote.line_number > quote.line_range.end) {
      issues.push({
        quoteId: quote.id,
        type: 'line_range_mismatch',
        message: `line_number (${quote.line_number}) がline_range (${quote.line_range.start}-${quote.line_range.end}) の範囲外です`,
      });
    }
  }
  
  return issues;
}
