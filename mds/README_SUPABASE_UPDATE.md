# Supabase テーブルスキーマ更新手順

## 問題
「ファイルの作成に失敗しました」というエラーが発生しています。これは、Supabaseのテーブルに必要なカラムが不足しているためです。

## 解決方法

### 1. Supabaseダッシュボードにログイン
1. [Supabase](https://app.supabase.com/)にアクセス
2. プロジェクトを選択

### 2. SQL Editorでスキーマを更新
1. 左側のメニューから「SQL Editor」を選択
2. 新しいクエリタブを開く
3. `/supabase/supabase_schema_update.sql`の内容をコピーして貼り付け
4. 「Run」ボタンをクリックして実行

または、以下のSQLを直接実行：

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

-- RLS (Row Level Security) ポリシーの作成
ALTER TABLE public.word_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own word books" 
ON public.word_books FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own word books" 
ON public.word_books FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own word books" 
ON public.word_books FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own word books" 
ON public.word_books FOR DELETE 
USING (auth.uid() = user_id);
```

### 3. テーブルの確認
1. 左側のメニューから「Table Editor」を選択
2. `word_books`テーブルを選択
3. `target_language`カラムが追加されていることを確認

### 4. アプリケーションの再起動
1. 開発サーバーを停止（Ctrl+C）
2. `npm run dev`で再起動
3. ブラウザのキャッシュをクリア（Ctrl+Shift+R）

## 確認
更新後、以下の操作が正常に動作することを確認してください：
- 新規ファイルの作成（言語選択付き）
- 単語の追加
- ファイルの削除

## トラブルシューティング

### エラーが続く場合
1. ブラウザの開発者ツール（F12）を開く
2. Consoleタブでエラーメッセージを確認
3. 以下を確認：
   - `Column 'target_language' does not exist`のようなエラーが出ていないか
   - RLSポリシーのエラーが出ていないか

### RLSポリシーのエラーの場合
Supabaseダッシュボードで：
1. Authentication → Policies を確認
2. `word_books`テーブルのポリシーが正しく設定されているか確認
3. 必要に応じてポリシーを削除して再作成