-- Supabase スキーマ更新スクリプト
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

-- 既存のlanguageカラムを削除（使用されていない場合）
-- ALTER TABLE public.word_cards DROP COLUMN IF EXISTS language;

-- RLS (Row Level Security) ポリシーの確認と作成
-- word_books テーブルのRLSを有効化
ALTER TABLE public.word_books ENABLE ROW LEVEL SECURITY;

-- word_books の select ポリシー
CREATE POLICY IF NOT EXISTS "Users can view their own word books" 
ON public.word_books FOR SELECT 
USING (auth.uid() = user_id);

-- word_books の insert ポリシー
CREATE POLICY IF NOT EXISTS "Users can create their own word books" 
ON public.word_books FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- word_books の update ポリシー
CREATE POLICY IF NOT EXISTS "Users can update their own word books" 
ON public.word_books FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- word_books の delete ポリシー
CREATE POLICY IF NOT EXISTS "Users can delete their own word books" 
ON public.word_books FOR DELETE 
USING (auth.uid() = user_id);

-- word_cards テーブルのRLSを有効化
ALTER TABLE public.word_cards ENABLE ROW LEVEL SECURITY;

-- word_cards の select ポリシー
CREATE POLICY IF NOT EXISTS "Users can view their own word cards" 
ON public.word_cards FOR SELECT 
USING (auth.uid() = user_id);

-- word_cards の insert ポリシー
CREATE POLICY IF NOT EXISTS "Users can create their own word cards" 
ON public.word_cards FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- word_cards の update ポリシー
CREATE POLICY IF NOT EXISTS "Users can update their own word cards" 
ON public.word_cards FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- word_cards の delete ポリシー
CREATE POLICY IF NOT EXISTS "Users can delete their own word cards" 
ON public.word_cards FOR DELETE 
USING (auth.uid() = user_id);

-- word_book_cards テーブルのRLSを有効化
ALTER TABLE public.word_book_cards ENABLE ROW LEVEL SECURITY;

-- word_book_cards の select ポリシー（word_booksを介したアクセス制御）
CREATE POLICY IF NOT EXISTS "Users can view word book cards through their word books" 
ON public.word_book_cards FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.word_books 
    WHERE word_books.id = word_book_cards.word_book_id 
    AND word_books.user_id = auth.uid()
  )
);

-- word_book_cards の insert ポリシー
CREATE POLICY IF NOT EXISTS "Users can create word book cards for their word books" 
ON public.word_book_cards FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.word_books 
    WHERE word_books.id = word_book_cards.word_book_id 
    AND word_books.user_id = auth.uid()
  )
);

-- word_book_cards の delete ポリシー
CREATE POLICY IF NOT EXISTS "Users can delete word book cards from their word books" 
ON public.word_book_cards FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.word_books 
    WHERE word_books.id = word_book_cards.word_book_id 
    AND word_books.user_id = auth.uid()
  )
);