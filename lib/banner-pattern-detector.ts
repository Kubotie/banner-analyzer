/**
 * バナー構成の型分析
 */

import type { BBoxTypeKey } from './bbox-types';

export type BannerPatternType =
  | 'target_focus'      // ターゲット絞込み型
  | 'emotion_voice'     // 感情代弁型
  | 'enlightenment'      // 啓蒙型
  | 'comparison'        // 比較型
  | 'number_expression' // 数字表現型
  | 'authority'         // 権威型
  | 'scene_proposal'    // 利用シーン提案型
  | 'presence_staging'; // 臨場感演出型

export interface PatternScore {
  type: BannerPatternType;
  score: number; // 0..1
  evidence: string[]; // 根拠となるテキスト
}

export interface PatternSummary {
  patterns: PatternScore[];
  dominantType?: BannerPatternType; // 最もスコアが高い型
}

/**
 * バナー構成の型を検出
 */
export function detectBannerPatterns(inputs: {
  texts: string[]; // 全テキスト（main_copy/sub_copy/cta等から）
  areaStats?: Record<BBoxTypeKey, number>; // typeKey別面積
}): PatternSummary {
  const { texts, areaStats } = inputs;
  const allText = texts.join(' ').toLowerCase();
  const patterns: PatternScore[] = [];
  
  // 1. ターゲット絞込み型
  const targetKeywords = [
    'な人', '必見', '法人向け', '初心者', '上級者', '女性', '男性',
    '〇〇な人', 'あなた', 'こんな人', '向け', '対象', 'ターゲット',
    'for', 'target', 'audience', 'person', 'people'
  ];
  const targetEvidence = texts.filter(t => 
    targetKeywords.some(kw => t.toLowerCase().includes(kw))
  );
  patterns.push({
    type: 'target_focus',
    score: Math.min(targetEvidence.length / 3, 1),
    evidence: targetEvidence,
  });
  
  // 2. 感情代弁型
  const emotionKeywords = [
    'つらい', 'もう無理', '悩み', '困っている', '不安', 'ストレス',
    '限界', '疲れた', '大変', '苦しい', '辛い', '痛い',
    'pain', 'stress', 'worry', 'trouble', 'difficult', 'hard'
  ];
  const emotionEvidence = texts.filter(t => 
    emotionKeywords.some(kw => t.toLowerCase().includes(kw))
  );
  patterns.push({
    type: 'emotion_voice',
    score: Math.min(emotionEvidence.length / 2, 1),
    evidence: emotionEvidence,
  });
  
  // 3. 啓蒙型
  const enlightenmentKeywords = [
    'になっていませんか', '気づいてますか', '実は', '知ってましたか',
    '実は', '実は知らない', 'まだ知らない', '気づかない',
    'did you know', 'actually', 'real', 'truth', 'fact'
  ];
  const enlightenmentEvidence = texts.filter(t => 
    enlightenmentKeywords.some(kw => t.toLowerCase().includes(kw))
  );
  patterns.push({
    type: 'enlightenment',
    score: Math.min(enlightenmentEvidence.length / 2, 1),
    evidence: enlightenmentEvidence,
  });
  
  // 4. 比較型
  const comparisonKeywords = [
    'vs', '対', 'より', 'before', 'after', '他社', '競合',
    '比較', '違い', '差', '優位', '勝つ', '負ける',
    'compare', 'versus', 'better', 'than', 'other'
  ];
  const comparisonEvidence = texts.filter(t => 
    comparisonKeywords.some(kw => t.toLowerCase().includes(kw))
  );
  patterns.push({
    type: 'comparison',
    score: Math.min(comparisonEvidence.length / 2, 1),
    evidence: comparisonEvidence,
  });
  
  // 5. 数字表現型
  const numberPattern = /[\d%]+|円|回|分|日|no\.?\s*1|第\d+位|ランキング/i;
  const numberEvidence = texts.filter(t => numberPattern.test(t));
  patterns.push({
    type: 'number_expression',
    score: Math.min(numberEvidence.length / 2, 1),
    evidence: numberEvidence,
  });
  
  // 6. 権威型
  const authorityKeywords = [
    '受賞', '医師', '専門家', '雑誌', '満足度', '売上', 'ランキング',
    '認定', '推薦', '実績', '実証', '証明', '保証',
    'award', 'doctor', 'expert', 'certified', 'proven', 'guarantee'
  ];
  const authorityEvidence = texts.filter(t => 
    authorityKeywords.some(kw => t.toLowerCase().includes(kw))
  );
  // trust_elementの面積も考慮
  const trustArea = areaStats?.['trust_element'] || 0;
  patterns.push({
    type: 'authority',
    score: Math.min((authorityEvidence.length / 2) + (trustArea > 0.1 ? 0.3 : 0), 1),
    evidence: authorityEvidence,
  });
  
  // 7. 利用シーン提案型
  const sceneKeywords = [
    '寝る前', '自宅', '夏', '仕事中', '朝', '夜', '休日',
    'シーン', '場面', '時', 'タイミング', '季節',
    'scene', 'time', 'when', 'season', 'moment', 'situation'
  ];
  const sceneEvidence = texts.filter(t => 
    sceneKeywords.some(kw => t.toLowerCase().includes(kw))
  );
  patterns.push({
    type: 'scene_proposal',
    score: Math.min(sceneEvidence.length / 2, 1),
    evidence: sceneEvidence,
  });
  
  // 8. 臨場感演出型
  const presenceKeywords = [
    'とろ', 'ぷる', 'さらさら', 'ふわ', 'もち', 'しっとり',
    'juicy', 'smooth', 'soft', 'crispy', 'fresh', 'tender'
  ];
  const presenceEvidence = texts.filter(t => 
    presenceKeywords.some(kw => t.toLowerCase().includes(kw))
  );
  patterns.push({
    type: 'presence_staging',
    score: Math.min(presenceEvidence.length / 2, 1),
    evidence: presenceEvidence,
  });
  
  // スコアが0.3以上のパターンを残す
  const filteredPatterns = patterns.filter(p => p.score >= 0.3);
  
  // 最もスコアが高い型を決定
  const dominantType = filteredPatterns.length > 0
    ? filteredPatterns.reduce((max, p) => p.score > max.score ? p : max).type
    : undefined;
  
  return {
    patterns: filteredPatterns,
    dominantType,
  };
}
