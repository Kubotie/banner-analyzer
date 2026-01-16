# OpenRouter.ai APIキー設定ガイド

## ローカル開発環境での設定

### ステップ1: `.env.local` ファイルを作成

プロジェクトルート（`banner-analyzer`フォルダ）に `.env.local` ファイルを作成してください。

**ファイルパス**: `/Users/kubotie/Downloads/AIテキスト/Cursor/banner-analyzer/.env.local`

### ステップ2: APIキーを取得

1. https://openrouter.ai/keys にアクセス
2. アカウントを作成（またはログイン）
3. 「Create Key」をクリック
4. 生成されたAPIキーをコピー

### ステップ3: `.env.local` に記入

`.env.local` ファイルに以下を記入してください：

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**重要**: 
- `sk-or-v1-` で始まる文字列をそのまま貼り付けてください
- 引用符（`"` や `'`）は不要です
- ファイル名は必ず `.env.local` にしてください（`.env` や `.env.local.txt` ではありません）

### ステップ4: アプリを再起動

`.env.local` を作成・編集したら、開発サーバーを再起動してください：

```bash
# 現在のサーバーを停止（Ctrl+C）
# その後、再起動
npm run dev
```

## Vercel（本番環境）での設定

### ステップ1: Vercelダッシュボードにアクセス

1. https://vercel.com/dashboard にアクセス
2. プロジェクト「banner-analyzer」を選択

### ステップ2: 環境変数を設定

1. 「Settings」タブをクリック
2. 左メニューから「Environment Variables」を選択
3. 「Add New」をクリック

### ステップ3: 変数を追加

以下の2つの環境変数を追加してください：

**1つ目:**
- **Key**: `OPENROUTER_API_KEY`
- **Value**: あなたのAPIキー（`sk-or-v1-...`）
- **Environment**: Production, Preview, Development すべてにチェック

**2つ目:**
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: デプロイされたURL（例: `https://banner-analyzer-xxxxx.vercel.app`）
- **Environment**: Production, Preview, Development すべてにチェック

### ステップ4: 再デプロイ

環境変数を追加したら、自動的に再デプロイが開始されます。
または、「Deployments」タブから手動で再デプロイすることもできます。

## 確認方法

### ローカル環境

1. `.env.local` ファイルが正しく作成されているか確認
2. アプリを起動: `npm run dev`
3. ヘッダーの「LLM解析を使用」チェックボックスを有効化
4. 画像をアップロード
5. ブラウザのコンソール（F12）でエラーが出ていないか確認

### Vercel環境

1. Vercelダッシュボードで環境変数が正しく設定されているか確認
2. デプロイが完了しているか確認
3. Webアプリにアクセス
4. 「LLM解析を使用」を有効化して動作確認

## トラブルシューティング

### エラー: "OPENROUTER_API_KEY環境変数が設定されていません"

**原因**: `.env.local` ファイルが存在しない、またはAPIキーが正しく設定されていない

**解決策**:
1. `.env.local` ファイルがプロジェクトルートに存在するか確認
2. ファイル名が正確に `.env.local` か確認（`.env.local.txt` などではない）
3. APIキーが正しく記入されているか確認（余分なスペースや引用符がないか）
4. 開発サーバーを再起動

### エラー: "OpenRouter API error: 401"

**原因**: APIキーが無効、または期限切れ

**解決策**:
1. OpenRouter.aiのダッシュボードでAPIキーが有効か確認
2. 新しいAPIキーを生成して、`.env.local` を更新
3. 開発サーバーを再起動

### エラー: "OpenRouter API error: 429"

**原因**: APIの使用量制限に達している

**解決策**:
1. OpenRouter.aiのダッシュボードで使用量を確認
2. しばらく待ってから再試行
3. 有料プランにアップグレードを検討
