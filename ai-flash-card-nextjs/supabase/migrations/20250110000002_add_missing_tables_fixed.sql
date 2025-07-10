-- AI単語帳アプリの追加テーブル作成用マイグレーション（修正版）
-- 2025-01-10作成

-- 1. word_book_cardsテーブルに学習状況関連のカラムを追加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_book_cards' 
        AND column_name = 'learning_status'
    ) THEN
        ALTER TABLE public.word_book_cards 
        ADD COLUMN learning_status VARCHAR(20) DEFAULT 'not_started' 
        CHECK (learning_status IN ('not_started', 'learned', 'uncertain', 'forgot'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_book_cards' 
        AND column_name = 'last_reviewed_at'
    ) THEN
        ALTER TABLE public.word_book_cards 
        ADD COLUMN last_reviewed_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_book_cards' 
        AND column_name = 'review_count'
    ) THEN
        ALTER TABLE public.word_book_cards 
        ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. word_cardsテーブルに不足しているカラムを追加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'gender_variations'
    ) THEN
        ALTER TABLE public.word_cards 
        ADD COLUMN gender_variations JSONB;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'tense_variations'
    ) THEN
        ALTER TABLE public.word_cards 
        ADD COLUMN tense_variations JSONB;
    END IF;
END $$;

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
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_word_book_cards_learning_status'
    ) THEN
        CREATE INDEX idx_word_book_cards_learning_status 
        ON public.word_book_cards(learning_status);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_word_book_cards_last_reviewed_at'
    ) THEN
        CREATE INDEX idx_word_book_cards_last_reviewed_at 
        ON public.word_book_cards(last_reviewed_at);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_verb_conjugation_history_user_id'
    ) THEN
        CREATE INDEX idx_verb_conjugation_history_user_id 
        ON public.verb_conjugation_history(user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_verb_conjugation_history_word_card_id'
    ) THEN
        CREATE INDEX idx_verb_conjugation_history_word_card_id 
        ON public.verb_conjugation_history(word_card_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_verb_conjugation_history_is_correct'
    ) THEN
        CREATE INDEX idx_verb_conjugation_history_is_correct 
        ON public.verb_conjugation_history(is_correct);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_verb_conjugation_history_next_review_at'
    ) THEN
        CREATE INDEX idx_verb_conjugation_history_next_review_at 
        ON public.verb_conjugation_history(next_review_at);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_verb_conjugation_history_created_at'
    ) THEN
        CREATE INDEX idx_verb_conjugation_history_created_at 
        ON public.verb_conjugation_history(created_at);
    END IF;
END $$;

-- 5. Row Level Security (RLS) を有効化
ALTER TABLE public.verb_conjugation_history ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシーの作成
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can manage their own conjugation history'
        AND tablename = 'verb_conjugation_history'
    ) THEN
        DROP POLICY "Users can manage their own conjugation history" ON public.verb_conjugation_history;
    END IF;
END $$;

CREATE POLICY "Users can manage their own conjugation history"
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
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_word_books_updated_at'
    ) THEN
        DROP TRIGGER update_word_books_updated_at ON public.word_books;
    END IF;
END $$;

CREATE TRIGGER update_word_books_updated_at
    BEFORE UPDATE ON public.word_books
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_word_cards_updated_at'
    ) THEN
        DROP TRIGGER update_word_cards_updated_at ON public.word_cards;
    END IF;
END $$;

CREATE TRIGGER update_word_cards_updated_at
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
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'srs_update_trigger'
    ) THEN
        DROP TRIGGER srs_update_trigger ON public.verb_conjugation_history;
    END IF;
END $$;

CREATE TRIGGER srs_update_trigger
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

-- 12. word_book_cardsテーブルにUNIQUE制約を追加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'word_book_cards_unique_book_card' 
        AND table_name = 'word_book_cards'
    ) THEN
        ALTER TABLE public.word_book_cards 
        ADD CONSTRAINT word_book_cards_unique_book_card 
        UNIQUE(word_book_id, word_card_id);
    END IF;
END $$;

-- 13. 必要なNOT NULL制約を追加
ALTER TABLE public.word_books 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.word_cards 
ALTER COLUMN user_id SET NOT NULL;

-- 14. 外部キー制約の更新（CASCADE削除）
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'word_books_user_id_fkey'
        AND table_name = 'word_books'
    ) THEN
        ALTER TABLE public.word_books 
        DROP CONSTRAINT word_books_user_id_fkey;
    END IF;
END $$;

ALTER TABLE public.word_books 
ADD CONSTRAINT word_books_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'word_cards_user_id_fkey'
        AND table_name = 'word_cards'
    ) THEN
        ALTER TABLE public.word_cards 
        DROP CONSTRAINT word_cards_user_id_fkey;
    END IF;
END $$;

ALTER TABLE public.word_cards 
ADD CONSTRAINT word_cards_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'word_book_cards_word_book_id_fkey'
        AND table_name = 'word_book_cards'
    ) THEN
        ALTER TABLE public.word_book_cards 
        DROP CONSTRAINT word_book_cards_word_book_id_fkey;
    END IF;
END $$;

ALTER TABLE public.word_book_cards 
ADD CONSTRAINT word_book_cards_word_book_id_fkey 
FOREIGN KEY (word_book_id) REFERENCES public.word_books(id) ON DELETE CASCADE;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'word_book_cards_word_card_id_fkey'
        AND table_name = 'word_book_cards'
    ) THEN
        ALTER TABLE public.word_book_cards 
        DROP CONSTRAINT word_book_cards_word_card_id_fkey;
    END IF;
END $$;

ALTER TABLE public.word_book_cards 
ADD CONSTRAINT word_book_cards_word_card_id_fkey 
FOREIGN KEY (word_card_id) REFERENCES public.word_cards(id) ON DELETE CASCADE;