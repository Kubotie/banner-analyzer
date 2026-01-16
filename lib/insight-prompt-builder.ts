/**
 * AIプロンプト構築ユーティリティ
 */

import type { InsightInputs } from './insight-input-collector';
import type { BBoxTypeKey } from './bbox-types';
import { getBBoxTypeLabel } from './bbox-types';

/**
 * BBoxの位置ヒントを計算
 */
export function calculatePositionHint(bbox: { x: number; y: number; w: number; h: number }): string {
  const centerY = bbox.y + bbox.h / 2;
  const centerX = bbox.x + bbox.w / 2;
  
  const vertical = centerY < 0.33 ? 'top' : centerY > 0.67 ? 'bottom' : 'middle';
  const horizontal = centerX < 0.33 ? 'left' : centerX > 0.67 ? 'right' : 'center';
  
  return `${vertical}-${horizontal}`;
}

/**
 * テキスト特徴を抽出
 */
export function extractTextFeatures(text: string | null): string[] {
  if (!text) return [];
  
  const features: string[] = [];
  const lowerText = text.toLowerCase();
  
  // 数字表現
  if (/\d+%|\d+円|\d+回|\d+日|no\.?\s*1|第\d+位/i.test(text)) {
    features.push('数字表現');
  }
  
  // 限定表現
  if (/期間限定|数量限定|限定|limited/i.test(text)) {
    features.push('限定表現');
  }
  
  // 権威表現
  if (/受賞|医師|専門家|雑誌|満足度|売上|ランキング|認定|推薦|実績|証明|保証/i.test(text)) {
    features.push('権威表現');
  }
  
  // ターゲット呼びかけ
  if (/な人|必見|法人向け|初心者|あなた|こんな人|向け|対象|ターゲット/i.test(text)) {
    features.push('ターゲット呼びかけ');
  }
  
  // 感情語
  if (/つらい|もう無理|悩み|困っている|不安|ストレス|限界|疲れた|大変/i.test(text)) {
    features.push('感情語');
  }
  
  // 比較表現
  if (/vs|対|より|before|after|他社|競合|比較|違い|差|優位/i.test(text)) {
    features.push('比較表現');
  }
  
  // シーン語
  if (/寝る前|自宅|夏|仕事中|朝|夜|休日|シーン|場面|時|タイミング|季節/i.test(text)) {
    features.push('シーン語');
  }
  
  // 臨場感
  if (/とろ|ぷる|さらさら|ふわ|もち|しっとり/i.test(text)) {
    features.push('臨場感');
  }
  
  return features;
}

/**
 * BBox一覧を構築（新しい形式）
 */
export function buildBBoxList(
  layoutBboxes: InsightInputs['layoutBboxes']
): Array<{
  type: string;
  text: string | null;
  bbox: { x: number; y: number; w: number; h: number };
  areaRatio: number;
  source: string;
}> {
  return layoutBboxes.map(bbox => ({
    type: getBBoxTypeLabel(bbox.type),
    text: bbox.text || null,
    bbox: bbox.bbox,
    areaRatio: bbox.area,
    source: 'auto', // TODO: bbox.sourceを取得できるようにする
  }));
}

/**
 * 訴求軸を抽出
 */
export function extractAppealAxes(
  layoutBboxes: InsightInputs['layoutBboxes'],
  texts: InsightInputs['texts']
): string[] {
  const axes: string[] = [];
  const allText = [...texts.ocrTexts, ...texts.bboxTexts.map(t => t.text)].join(' ').toLowerCase();
  
  // 価格訴求
  if (layoutBboxes.some(b => b.type === 'price_discount' && b.text) || 
      /価格|割引|円|%|discount|price/i.test(allText)) {
    axes.push('price');
  }
  
  // 便利性訴求
  if (/便利|簡単|手軽|時短|効率|convenience|easy/i.test(allText)) {
    axes.push('convenience');
  }
  
  // 感情訴求
  if (/つらい|もう無理|悩み|困っている|不安|ストレス|限界|疲れた|emotion|feel/i.test(allText)) {
    axes.push('emotion');
  }
  
  // 権威訴求
  if (layoutBboxes.some(b => b.type === 'trust_element' && b.text) ||
      /受賞|医師|専門家|雑誌|満足度|売上|ランキング|認定|推薦|実績|authority/i.test(allText)) {
    axes.push('authority');
  }
  
  // 結果訴求
  if (/効果|結果|改善|変化|result|effect/i.test(allText)) {
    axes.push('result');
  }
  
  // シーン訴求
  if (/寝る前|自宅|夏|仕事中|朝|夜|休日|シーン|場面|時|タイミング|季節|scene/i.test(allText)) {
    axes.push('scene');
  }
  
  // 比較訴求
  if (/vs|対|より|before|after|他社|競合|比較|違い|差|優位|compare/i.test(allText)) {
    axes.push('comparison');
  }
  
  return axes;
}

/**
 * バナー分析用の入力情報を構築
 */
export function buildBannerAnalysisInput(
  layoutBboxes: InsightInputs['layoutBboxes'],
  texts: InsightInputs['texts'],
  productCategory?: string,
  targetPersona?: string
): string {
  const bboxList = buildBBoxList(layoutBboxes);
  const appealAxes = extractAppealAxes(layoutBboxes, texts);
  
  return JSON.stringify({
    bboxList,
    appealAxes,
    productCategory: productCategory || null,
    targetPersona: targetPersona || null,
  }, null, 2);
}

/**
 * 共通system prompt
 */
export const COMMON_SYSTEM_PROMPT = `あなたは広告・バナー構成分析の専門AIです。

あなたの役割は「正解を断定すること」ではなく、
与えられた一次情報（バナー画像由来の情報）をもとに、

- なぜこの表現が選ばれているのか
- どの訴求型に該当するか
- どの層・文脈を狙っている可能性が高いか
- 逆に、なぜ"使っていない表現"があるのか

を、仮説として構造的に言語化することです。

重要な制約：
- 抽象的な一般論は禁止（例：「ユーザーの期待に応えるため」「他の要素を避けている可能性がある」は禁止）
- 入力に含まれない情報を想像で補完しない
- 必ず「根拠 → 解釈 → 仮説」の順で考える
- すべての仮説は、具体的なBBox情報（type、text、areaRatio）を根拠として示すこと
- 「可能性が高い」「可能性がある」「示唆される」などの仮説表現を使用すること
- 出力は必ず JSON のみ（文章出力は禁止）

出力の品質基準：
- どの要素が（BBox type）
- どれくらいの面積で（areaRatio）
- 何を優先しているか（テキスト内容）
- その結果どんな市場・戦略が示唆されるか

が、すべて一次情報から逆算されている必要があります。`;
