# 統合ナレッジベース（KB）システム

## 概要

ペルソナアプリとバナー分析アプリで共通のナレッジベース機能を提供します。

## 機能

### KB種別

- `persona`: ペルソナ
- `banner`: バナー抽出データ
- `insight`: 市場インサイト
- `report`: 集計レポート
- `option`: 戦略オプション
- `plan`: LP構成ラフ

### API

#### KBアイテム CRUD

- `GET /api/kb/items`: 一覧取得（メタのみ）
  - クエリパラメータ: `q`（検索）, `type`, `folder_path`, `owner_id`
- `GET /api/kb/items/:kbId`: 詳細取得（メタ + ペイロード）
- `POST /api/kb/items`: 作成
- `PATCH /api/kb/items/:kbId`: 更新（title/folder_path/tags/visibility）
- `DELETE /api/kb/items/:kbId`: 論理削除

#### ActiveContext

- `GET /api/context/active`: 取得
- `PUT /api/context/active`: 設定

### 1クリック保存

各アプリの以下の場所から保存可能：

- **バナー分析アプリ**:
  - 個別分析タブ: 「このバナーを保存」
  - 集計タブ: 「この集計を保存」
  - 市場インサイトカード: 「このインサイトを保存」
  - 戦略オプション: 「このオプションを保存」
  - LP構成ラフ: 「このプランを保存」

### データ形式

すべてのペイロードはzodスキーマでバリデーションされます。

- **BBox座標**: `coord_type`（normalized/pixel）を必須とし、混在を防ぐ
- **根拠リンク**: Insight保存時、`target_banner_ids`が空の場合はエラー

### 制約

- バナーのInsightなど"示唆"は仮説表現（断定しない）
- ただし観測事実（出現率/件数など）は断定してよい
- 根拠リンク（bannerId/BBoxなど）なしにInsightを保存できない（警告/抑止）

## セットアップ

### 依存関係

```bash
npm install zod uuid
npm install --save-dev @types/uuid
```

### 環境変数

不要（ローカルストレージ/メモリベース、MVP）

## 使用方法

### 保存

```typescript
import { saveBannerExtraction, saveMarketInsight } from '@/lib/kb-client';

// バナー抽出を保存
await saveBannerExtraction(extraction, imageUrl);

// 市場インサイトを保存
await saveMarketInsight(insight);
```

### 一覧表示

```typescript
// KBViewコンポーネントを使用
<KBView
  onUseData={(item) => {
    // 「このデータで使う」処理
  }}
  onViewDetail={(item) => {
    // 詳細表示
  }}
/>
```

### ActiveContext

```typescript
// 設定
await fetch('/api/context/active', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    persona_ids: ['persona-1'],
    insight_ids: ['insight-1'],
  }),
});

// 取得
const response = await fetch('/api/context/active');
const { context } = await response.json();
```

## 注意事項

- **MVP実装**: 現在はメモリベース（サーバー再起動でデータが消える）
- **本番環境**: DBに置き換える必要があります
- **UUID生成**: 簡易実装を使用（本番では`uuid`パッケージを推奨）
