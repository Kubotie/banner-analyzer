# GitHubへのプッシュ手順

## ステップ1: Gitリポジトリを初期化（まだの場合）

```bash
cd "/Users/kubotie/Downloads/AIテキスト/Cursor/banner-analyzer"
git init
```

## ステップ2: すべてのファイルをステージング

```bash
git add .
```

## ステップ3: 初回コミット

```bash
git commit -m "Initial commit: 競合バナー分析アプリ"
```

## ステップ4: メインブランチに設定

```bash
git branch -M main
```

## ステップ5: GitHubリポジトリをリモートとして追加

```bash
git remote add origin https://github.com/Kubotie/banner-analyzer.git
```

## ステップ6: コードをプッシュ

```bash
git push -u origin main
```

## 完了後

プッシュが成功すると、GitHubのリポジトリページにコードが表示されます。

その後、Vercelでこのリポジトリをインポートしてデプロイできます。
