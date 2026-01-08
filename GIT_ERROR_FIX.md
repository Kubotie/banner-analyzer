# Gitエラー対処法

## エラー: `No space left on device`

このエラーは**ディスク容量が不足している**ことが原因です。

## 対処法

### 1. ロックファイルを削除（まず試す）

```bash
cd "/Users/kubotie/Downloads/AIテキスト/Cursor/banner-analyzer"
rm -f .git/index.lock
rm -f .git/refs/remotes/origin/main.lock
```

### 2. ディスク容量を確認

```bash
df -h
```

### 3. ディスク容量を確保

以下の方法で容量を確保できます：

#### 方法A: 不要なファイルを削除
- ダウンロードフォルダの不要なファイル
- ゴミ箱を空にする
- 一時ファイルを削除

#### 方法B: node_modulesを削除（再インストール可能）
```bash
cd "/Users/kubotie/Downloads/AIテキスト/Cursor/banner-analyzer"
rm -rf node_modules
# 必要になったら npm install で再インストール
```

#### 方法C: .nextフォルダを削除（再ビルド可能）
```bash
cd "/Users/kubotie/Downloads/AIテキスト/Cursor/banner-analyzer"
rm -rf .next
# 必要になったら npm run build で再ビルド
```

### 4. 容量を確保した後、再度プッシュ

```bash
cd "/Users/kubotie/Downloads/AIテキスト/Cursor/banner-analyzer"
git add .
git commit -m "Update: デモデータ追加"
git push
```

## 注意

- `Everything up-to-date` と表示されている場合、実際にはプッシュは完了している可能性があります
- GitHubのリポジトリページで、最新のコミットが反映されているか確認してください
