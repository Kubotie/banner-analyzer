/**
 * BBoxタイプ定義（日本語ラベル＋正規化キー）
 */

export const BBOX_TYPE = {
  main_copy: "メインコピー",
  sub_copy: "サブコピー",
  product_image: "商品画像",
  main_visual: "メインビジュアル",
  sub_visual: "サブビジュアル",
  cta: "CTA",
  logo: "ロゴ",
  price_discount: "価格・割引情報",
  limited_offer: "期間・数量限定表現",
  icon_symbol: "アイコン・記号",
  trust_element: "信頼性要素",
  qr_code: "QRコード",
  badge_label: "バッジ・ラベル",
  face_photo: "人物写真・顔",
  ingredient_technology: "使用成分・技術",
} as const;

export type BBoxTypeKey = keyof typeof BBOX_TYPE;

/**
 * 旧typeから新typeKeyへの移行マッピング
 */
export function migrateType(oldType: string): BBoxTypeKey {
  const s = (oldType || '').trim().toLowerCase();
  
  // 直接マッチ
  if (s === 'ロゴ' || s === 'logo') return 'logo';
  if (s === '商品画像' || s === 'product_image' || s === 'product') return 'product_image';
  if (s === 'cta' || s.startsWith('cta:')) return 'cta';
  if (s === 'qrコード' || s === 'qr_code' || s === 'qr') return 'qr_code';
  if (s === 'バッジ' || s === 'badge' || s === 'label') return 'badge_label';
  if (s === '人物' || s === 'face' || s === 'photo') return 'face_photo';
  if (s === 'アイコン' || s === 'icon' || s === 'symbol') return 'icon_symbol';
  
  // コピー系
  if (s.includes('キャッチ') || s.includes('catch') || s.includes('headline') || s.includes('メインコピー')) {
    return 'main_copy';
  }
  if (s.includes('サブ') || s.includes('sub') || s.includes('補助')) {
    return 'sub_copy';
  }
  
  // ビジュアル系
  if (s.includes('メイン') && (s.includes('ビジュアル') || s.includes('visual'))) {
    return 'main_visual';
  }
  if (s.includes('サブ') && (s.includes('ビジュアル') || s.includes('visual'))) {
    return 'sub_visual';
  }
  
  // 価格・割引
  if (s.includes('価格') || s.includes('price') || s.includes('割引') || s.includes('discount') || s.includes('円') || s.includes('%')) {
    return 'price_discount';
  }
  
  // 期間・数量限定
  if (s.includes('期間') || s.includes('数量') || s.includes('限定') || s.includes('limited') || s.includes('期間限定')) {
    return 'limited_offer';
  }
  
  // 信頼性要素
  if (s.includes('信頼') || s.includes('trust') || s.includes('保証') || s.includes('実績') || s.includes('受賞') || s.includes('医師') || s.includes('専門家')) {
    return 'trust_element';
  }
  
  // 使用成分・技術
  if (s.includes('成分') || s.includes('技術') || s.includes('ingredient') || s.includes('technology') || s.includes('使用成分') || s.includes('使用技術')) {
    return 'ingredient_technology';
  }
  
  // 注釈系は内容で判定（デフォルトは価格・割引）
  if (s.includes('注釈') || s.includes('annotation')) {
    return 'price_discount'; // デフォルト
  }
  
  // デフォルト：メインコピー
  return 'main_copy';
}

/**
 * typeKeyから日本語ラベルを取得
 */
export function getBBoxTypeLabel(typeKey: BBoxTypeKey): string {
  return BBOX_TYPE[typeKey];
}

/**
 * 再解析対象のtypeKeyかどうか
 */
export function isReanalysisTarget(typeKey: BBoxTypeKey): boolean {
  return [
    'main_copy',
    'sub_copy',
    'cta',
    'price_discount',
    'limited_offer',
    'trust_element',
    'ingredient_technology',
  ].includes(typeKey);
}

/**
 * 分析上重要度が低いtypeKeyかどうか（text抽出不要）
 */
export function isLowPriorityType(typeKey: BBoxTypeKey): boolean {
  return [
    'product_image',
    'main_visual',
    'sub_visual',
    'logo',
    'icon_symbol',
    'qr_code',
    'badge_label',
    'face_photo',
  ].includes(typeKey);
}
