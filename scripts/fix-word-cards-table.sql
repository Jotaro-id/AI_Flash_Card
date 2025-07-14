-- word_cardsテーブルの修正スクリプト
-- Supabase SQL Editorで実行してください

-- 1. 既存のword_cardsテーブルを確認
DO $$
BEGIN
    -- テーブルが存在しない場合は作成
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'word_cards'
    ) THEN
        CREATE TABLE public.word_cards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            word TEXT NOT NULL,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            ai_generated_info JSONB,
            english_equivalent TEXT,
            japanese_equivalent TEXT,
            pronunciation TEXT,
            example_sentence TEXT,
            usage_notes TEXT,
            word_class TEXT,
            gender_variations JSONB,
            tense_variations JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'word_cardsテーブルを作成しました';
    END IF;
END $$;

-- 2. 必要なカラムを追加（存在しない場合のみ）
DO $$
BEGIN
    -- wordカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'word'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN word TEXT NOT NULL;
    END IF;
    
    -- user_idカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- ai_generated_infoカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'ai_generated_info'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN ai_generated_info JSONB;
    END IF;
    
    -- english_equivalentカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'english_equivalent'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN english_equivalent TEXT;
    END IF;
    
    -- japanese_equivalentカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'japanese_equivalent'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN japanese_equivalent TEXT;
    END IF;
    
    -- pronunciationカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'pronunciation'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN pronunciation TEXT;
    END IF;
    
    -- example_sentenceカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'example_sentence'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN example_sentence TEXT;
    END IF;
    
    -- usage_notesカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'usage_notes'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN usage_notes TEXT;
    END IF;
    
    -- word_classカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'word_class'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN word_class TEXT;
    END IF;
    
    -- gender_variationsカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'gender_variations'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN gender_variations JSONB;
    END IF;
    
    -- tense_variationsカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'tense_variations'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN tense_variations JSONB;
    END IF;
    
    -- created_atカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- updated_atカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'word_cards' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.word_cards ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_word_cards_word ON public.word_cards(word);
CREATE INDEX IF NOT EXISTS idx_word_cards_user_id ON public.word_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_word_cards_created_at ON public.word_cards(created_at);

-- 4. RLSを有効化
ALTER TABLE public.word_cards ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシーを作成
DO $$
BEGIN
    -- 既存のポリシーを削除
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'word_cards_select_policy'
        AND tablename = 'word_cards'
    ) THEN
        DROP POLICY word_cards_select_policy ON public.word_cards;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'word_cards_insert_policy'
        AND tablename = 'word_cards'
    ) THEN
        DROP POLICY word_cards_insert_policy ON public.word_cards;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'word_cards_update_policy'
        AND tablename = 'word_cards'
    ) THEN
        DROP POLICY word_cards_update_policy ON public.word_cards;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'word_cards_delete_policy'
        AND tablename = 'word_cards'
    ) THEN
        DROP POLICY word_cards_delete_policy ON public.word_cards;
    END IF;
END $$;

-- 新しいポリシーを作成
CREATE POLICY word_cards_select_policy ON public.word_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY word_cards_insert_policy ON public.word_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY word_cards_update_policy ON public.word_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY word_cards_delete_policy ON public.word_cards
    FOR DELETE USING (auth.uid() = user_id);

-- 6. 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- 7. UNIQUE制約を追加（単語とユーザーIDの組み合わせ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'word_cards_unique_word_user' 
        AND table_name = 'word_cards'
    ) THEN
        ALTER TABLE public.word_cards 
        ADD CONSTRAINT word_cards_unique_word_user 
        UNIQUE(word, user_id);
    END IF;
END $$;

-- 完了メッセージ
SELECT 'word_cardsテーブルの修正が完了しました！' as status;

-- 最終的なテーブル構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'word_cards'
ORDER BY ordinal_position;