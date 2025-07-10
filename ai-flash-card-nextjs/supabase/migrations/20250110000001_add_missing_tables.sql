-- AI単語帳アプリの追加テーブル作成用マイグレーション
-- 2025-01-10作成

-- 1. word_book_cardsテーブルに学習状況関連のカラムを追加
ALTER TABLE public.word_book_cards 
ADD COLUMN IF NOT EXISTS learning_status VARCHAR(20) DEFAULT 'not_started' 
CHECK (learning_status IN ('not_started', 'learned', 'uncertain', 'forgot'));

ALTER TABLE public.word_book_cards 
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

ALTER TABLE public.word_book_cards 
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- 2. word_cardsテーブルに不足しているカラムを追加
ALTER TABLE public.word_cards 
ADD COLUMN IF NOT EXISTS gender_variations JSONB;

ALTER TABLE public.word_cards 
ADD COLUMN IF NOT EXISTS tense_variations JSONB;

-- 3. 動詞活用練習履歴テーブルの作成
CREATE TABLE IF NOT EXISTS public.verb_conjugation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_card_id UUID NOT NULL REFERENCES public.word_cards(id) ON DELETE CASCADE,
    practice_type VARCHAR(50) NOT NULL CHECK (practice_type IN ('fill-blanks', 'spell-input')),
    tense VARCHAR(100) NOT NULL,
    mood VARCHAR(100) NOT NULL,
    person VARCHAR(20) NOT NULL, -- '1sg', '2sg', '3sg', '1pl', '2pl', '3pl'
    correct_answer TEXT NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    attempts INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- SRS（間隔反復システム）のためのカラム
    review_interval_days INTEGER DEFAULT 1,
    next_review_at TIMESTAMPTZ DEFAULT NOW() + interval '1 day',
    ease_factor REAL DEFAULT 2.5
);

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_word_book_cards_learning_status ON public.word_book_cards(learning_status);
CREATE INDEX IF NOT EXISTS idx_word_book_cards_last_reviewed_at ON public.word_book_cards(last_reviewed_at);

CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_user_id ON public.verb_conjugation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_word_card_id ON public.verb_conjugation_history(word_card_id);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_is_correct ON public.verb_conjugation_history(is_correct);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_next_review_at ON public.verb_conjugation_history(next_review_at);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_created_at ON public.verb_conjugation_history(created_at);

-- 5. Row Level Security (RLS) を有効化
ALTER TABLE public.verb_conjugation_history ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシーの作成
CREATE POLICY IF NOT EXISTS "Users can manage their own conjugation history"
ON public.verb_conjugation_history
FOR ALL
USING (auth.uid() = user_id);

-- 7. 更新時刻の自動更新関数（存在しない場合のみ作成）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 更新時刻の自動更新トリガー
CREATE TRIGGER IF NOT EXISTS update_word_books_updated_at
    BEFORE UPDATE ON public.word_books
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_word_cards_updated_at
    BEFORE UPDATE ON public.word_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. SRS更新用のトリガー関数
CREATE OR REPLACE FUNCTION public.update_srs_on_answer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_correct THEN
        -- 正解した場合、間隔を伸ばす
        NEW.review_interval_days := round(NEW.review_interval_days * NEW.ease_factor);
        NEW.ease_factor := LEAST(2.5, NEW.ease_factor + 0.1); -- 最大2.5
    ELSE
        -- 不正解の場合、間隔をリセット
        NEW.review_interval_days := 1;
        NEW.ease_factor := GREATEST(1.3, NEW.ease_factor - 0.2); -- 最低1.3
    END IF;
    NEW.next_review_at := NOW() + (NEW.review_interval_days || ' days')::interval;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. SRS更新トリガーの作成
CREATE TRIGGER IF NOT EXISTS srs_update_trigger
    BEFORE INSERT ON public.verb_conjugation_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_srs_on_answer();

-- 11. 統計情報を取得するためのビュー
CREATE OR REPLACE VIEW public.verb_conjugation_stats AS
SELECT 
    vch.user_id,
    vch.word_card_id,
    wc.word,
    vch.practice_type,
    vch.tense,
    vch.mood,
    vch.person,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN vch.is_correct THEN 1 ELSE 0 END) as correct_count,
    ROUND((SUM(CASE WHEN vch.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as accuracy_rate,
    AVG(vch.response_time_ms) as avg_response_time,
    MAX(vch.created_at) as last_practiced_at,
    MIN(vch.next_review_at) as next_review_at
FROM public.verb_conjugation_history vch
JOIN public.word_cards wc ON vch.word_card_id = wc.id
GROUP BY vch.user_id, vch.word_card_id, wc.word, vch.practice_type, vch.tense, vch.mood, vch.person;

-- 12. word_book_cardsテーブルにUNIQUE制約を追加（存在しない場合のみ）
ALTER TABLE public.word_book_cards 
ADD CONSTRAINT IF NOT EXISTS word_book_cards_unique_book_card 
UNIQUE(word_book_id, word_card_id);

-- 13. 必要なNOT NULL制約を追加
ALTER TABLE public.word_books 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.word_cards 
ALTER COLUMN user_id SET NOT NULL;

-- 14. 外部キー制約の追加（CASCADE削除）
ALTER TABLE public.word_books 
DROP CONSTRAINT IF EXISTS word_books_user_id_fkey;

ALTER TABLE public.word_books 
ADD CONSTRAINT word_books_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.word_cards 
DROP CONSTRAINT IF EXISTS word_cards_user_id_fkey;

ALTER TABLE public.word_cards 
ADD CONSTRAINT word_cards_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.word_book_cards 
DROP CONSTRAINT IF EXISTS word_book_cards_word_book_id_fkey;

ALTER TABLE public.word_book_cards 
ADD CONSTRAINT word_book_cards_word_book_id_fkey 
FOREIGN KEY (word_book_id) REFERENCES public.word_books(id) ON DELETE CASCADE;

ALTER TABLE public.word_book_cards 
DROP CONSTRAINT IF EXISTS word_book_cards_word_card_id_fkey;

ALTER TABLE public.word_book_cards 
ADD CONSTRAINT word_book_cards_word_card_id_fkey 
FOREIGN KEY (word_card_id) REFERENCES public.word_cards(id) ON DELETE CASCADE;