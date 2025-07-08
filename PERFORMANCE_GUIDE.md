# AI単語帳 - パフォーマンス診断ガイド

## 問題：Supabaseとの接続が遅い

Supabaseとの接続が遅い場合、以下の診断ツールを使用して原因を特定できます。

## 診断ツール

### 1. ビジュアル診断ツール（推奨）

ブラウザで `network-diagnostics.html` を開きます：

```bash
# Macの場合
open network-diagnostics.html

# Windowsの場合
start network-diagnostics.html

# または直接ブラウザにドラッグ&ドロップ
```

このツールでは：
- 各エンドポイントへのレスポンスタイムを測定
- グラフで結果を可視化
- 平均レスポンスタイムから問題を診断

### 2. コンソール診断

アプリケーションを開いた状態で、ブラウザの開発者ツールコンソールで実行：

```javascript
// 詳細なパフォーマンス診断を実行
await window.runDetailedSupabaseDiagnostics()
```

### 3. ネットワークタブでの確認

1. ブラウザの開発者ツール（F12）を開く
2. 「Network」タブを選択
3. フィルターに `supabase.co` と入力
4. アプリをリロードして、各リクエストの時間を確認

## 診断結果の見方

### レスポンスタイムの目安

| 操作 | 良好 | 許容範囲 | 要改善 |
|------|------|----------|---------|
| Health Check | < 300ms | < 500ms | > 500ms |
| Auth Check | < 500ms | < 1000ms | > 1000ms |
| Simple Query | < 500ms | < 1000ms | > 1000ms |
| Complex Query | < 1000ms | < 2000ms | > 2000ms |

### 診断結果による対策

#### 1. 平均レスポンスタイムが1秒以上の場合

**原因：リージョンが遠い可能性が高い**

対策：
1. Supabaseダッシュボードでプロジェクトのリージョンを確認
2. 日本からのアクセスの場合、`Asia Pacific (Tokyo)` を推奨
3. 必要に応じてプロジェクトを再作成

#### 2. Complex Queryだけが遅い場合

**原因：クエリが複雑すぎる、またはRLSポリシーの問題**

対策：
1. クエリを分割して実行
2. インデックスの追加を検討
3. RLSポリシーの最適化

#### 3. すべてのクエリが遅い場合

**原因：ネットワーク環境またはSupabaseの問題**

対策：
1. 別のネットワーク環境で試す
2. Supabaseのステータスページを確認
3. VPNを使用している場合は無効化

## パフォーマンス改善のベストプラクティス

### 1. キャッシュの活用

```typescript
// 例：単語帳データを5分間キャッシュ
const CACHE_DURATION = 5 * 60 * 1000; // 5分
let cachedData = null;
let cacheTimestamp = 0;

async function fetchWithCache() {
  if (cachedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }
  
  const data = await fetchVocabularyFiles();
  cachedData = data;
  cacheTimestamp = Date.now();
  return data;
}
```

### 2. データの遅延読み込み

```typescript
// 必要な時だけ詳細データを取得
async function loadWordDetails(wordId: string) {
  // 単語の詳細情報は表示時に取得
  return await fetchWordDetails(wordId);
}
```

### 3. バッチ処理

```typescript
// 複数の操作をまとめて実行
async function batchOperations(operations: Promise<any>[]) {
  return await Promise.all(operations);
}
```

## トラブルシューティング

### エラー: "ユーザーが認証されていません"

1. ログアウトして再度ログイン
2. ブラウザのキャッシュをクリア
3. シークレットモードで試す

### エラー: "読み込みに時間がかかっています"

1. 診断ツールでレスポンスタイムを確認
2. ネットワーク環境を確認
3. Supabaseのダッシュボードでエラーログを確認

## サポート

問題が解決しない場合：
1. 診断結果のスクリーンショットを撮る
2. ブラウザのコンソールログをコピー
3. 開発者に報告