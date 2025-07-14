-- Supabaseテーブルセットアップスクリプト
-- このSQLをSupabaseのSQL Editorで実行してください

-- 1. 動詞活用練習履歴テーブルの作成
CREATE TABLE IF NOT EXISTS public.verb_conjugation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_card_id UUID NOT NULL,
    practice_type VARCHAR(50) NOT NULL CHECK (practice_type IN ('fill-blanks', 'spell-input')),
    tense VARCHAR(100) NOT NULL,
    mood VARCHAR(100) NOT NULL,
    person VARCHAR(20) NOT NULL,
    correct_answer TEXT NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    attempts INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    review_interval_days INTEGER DEFAULT 1,
    next_review_at TIMESTAMPTZ DEFAULT NOW() + interval '1 day',
    ease_factor REAL DEFAULT 2.5
);

-- 2. word_book_cardsテーブルに学習状況カラムを追加
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

-- 3. word_cardsテーブルに追加カラムを作成
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

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_user_id ON public.verb_conjugation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_word_card_id ON public.verb_conjugation_history(word_card_id);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_is_correct ON public.verb_conjugation_history(is_correct);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_created_at ON public.verb_conjugation_history(created_at);

CREATE INDEX IF NOT EXISTS idx_word_book_cards_learning_status ON public.word_book_cards(learning_status);
CREATE INDEX IF NOT EXISTS idx_word_book_cards_last_reviewed_at ON public.word_book_cards(last_reviewed_at);

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

-- 7. UNIQUE制約の追加
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

-- 完了メッセージ
SELECT 'テーブルセットアップが完了しました！' as status;