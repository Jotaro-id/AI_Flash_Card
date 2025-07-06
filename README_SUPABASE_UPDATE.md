# Supabase テーブルスキーマ更新手順

## 問題
「ファイルの作成に失敗しました」というエラーが発生しています。これは、Supabaseのテーブルに必要なカラムが不足しているためです。

## 解決方法

### 1. Supabaseダッシュボードにログイン
1. [Supabase](https://app.supabase.com/)にアクセス
2. プロジェクトを選択

### 2. SQL Editorでスキーマを更新
1. 左側のメニューから「SQL Editor」を選択
2. 以下のSQLを実行：

```sql
-- word_books テーブルに target_language カラムを追加
ALTER TABLE public.word_books 
ADD COLUMN IF NOT EXISTS target_language character varying DEFAULT 'en';

-- word_cards テーブルに不足しているカラムを追加
ALTER TABLE public.word_cards
ADD COLUMN IF NOT EXISTS ai_generated_info jsonb,
ADD COLUMN IF NOT EXISTS english_equivalent text,
ADD COLUMN IF NOT EXISTS japanese_equivalent text,
ADD COLUMN IF NOT EXISTS usage_notes text,
ADD COLUMN IF NOT EXISTS word_class text;
```

### 3. RLS（Row Level Security）の確認
既存のRLSポリシーが新しいカラムに対しても有効であることを確認してください。

### 4. アプリケーションの再起動
1. 開発サーバーを停止（Ctrl+C）
2. `npm run dev`で再起動

## 確認
更新後、以下の操作が正常に動作することを確認してください：
- 新規ファイルの作成
- 単語の追加
- ファイルの削除

## トラブルシューティング
エラーが続く場合は、ブラウザの開発者ツールでコンソールエラーを確認し、詳細なエラーメッセージを確認してください。