# LLM統合セットアップガイド

## 1. 環境変数の設定

### ローカル開発環境

プロジェクトルートに `.env.local` ファイルを作成し、以下を設定してください：

```bash
# OpenRouter.ai API Key
OPENROUTER_API_KEY=your_api_key_here

# アプリのURL（OpenRouter.aiのリファラーとして使用）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### OpenRouter.ai API Keyの取得方法

1. https://openrouter.ai/keys にアクセス
2. アカウントを作成（またはログイン）
3. 「Create Key」をクリック
4. 生成されたAPIキーをコピー
5. `.env.local` に貼り付け

### Vercelでの環境変数設定

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」を開く
4. 以下を追加：
   - `OPENROUTER_API_KEY`: あなたのAPIキー
   - `NEXT_PUBLIC_APP_URL`: デプロイされたURL（例: `https://your-app.vercel.app`）

## 2. 使用方法

### 画像アップロード時の自動解析

1. 画像をアップロードすると、自動的にLLM APIが呼び出されます
2. `app/api/analyze/route.ts` が画像を分析し、Extractionデータを生成します
3. 分析結果が表示されます

### Market Insight生成

1. 複数のバナーをアップロード
2. 「市場インサイト (C1)」タブを開く
3. LLMが自動的にMarket Insightを生成します（`app/api/generate-insights/route.ts`）

## 3. 使用モデル

デフォルトでは `anthropic/claude-3.5-sonnet` を使用します。

他のモデルを使用する場合は、以下を変更してください：
- `lib/openrouter.ts` の `callOpenRouter` 関数
- `app/api/analyze/route.ts` の `callOpenRouterJSON` 呼び出し
- `app/api/generate-insights/route.ts` の `callOpenRouterJSON` 呼び出し

利用可能なモデル一覧: https://openrouter.ai/models

## 4. 注意事項

### 画像解析の制限

現在の実装では、画像URLをテキストとしてLLMに渡しています。
より高精度な画像解析が必要な場合は、以下を検討してください：

1. **画像をbase64にエンコード**
   - 画像をbase64文字列に変換してLLMに渡す
   - モデルが画像理解に対応している必要がある（例: `anthropic/claude-3-opus`）

2. **専用の画像認識APIを使用**
   - Google Vision API
   - AWS Rekognition
   - Azure Computer Vision
   - これらのAPIでOCRや画像認識を行い、結果をLLMに渡す

### コスト管理

OpenRouter.aiは使用量に応じて課金されます。大量の画像を解析する場合は、以下を検討してください：

1. キャッシュ機能の実装
2. バッチ処理の最適化
3. 使用量の監視

### エラーハンドリング

API呼び出しが失敗した場合、自動的にダミーデータにフォールバックする実装を追加することを推奨します。

## 5. トラブルシューティング

### APIキーエラー

```
Error: OPENROUTER_API_KEY環境変数が設定されていません
```

→ `.env.local` ファイルが正しく設定されているか確認してください。

### ネットワークエラー

```
Error: OpenRouter API error: 500
```

→ OpenRouter.aiのサービス状況を確認してください。
→ リトライ機能が自動的に動作します（最大2回）。

### JSONパースエラー

```
Error: Failed to parse JSON response
```

→ LLMがJSON以外の形式で応答している可能性があります。
→ プロンプトを調整するか、レスポンスの前処理を追加してください。
