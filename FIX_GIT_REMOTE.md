# Gitリモートの修正手順

## 問題
リモートURLが間違っているため、以下のコマンドで修正してください。

## 修正手順

### 1. 既存のリモートを削除
```bash
git remote remove origin
```

### 2. 正しいURLでリモートを追加
```bash
git remote add origin https://github.com/Kubotie/banner-analyzer.git
```

### 3. リモートURLを確認
```bash
git remote -v
```
以下のように表示されればOK：
```
origin  https://github.com/Kubotie/banner-analyzer.git (fetch)
origin  https://github.com/Kubotie/banner-analyzer.git (push)
```

### 4. コードをプッシュ
```bash
git push -u origin main
```

## 認証が必要な場合

プッシュ時に認証が求められたら：
- GitHubのユーザー名とパスワード（またはPersonal Access Token）を入力
- Personal Access Tokenを使う場合は、GitHubの設定で作成してください
