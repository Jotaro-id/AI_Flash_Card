-- AI単語帳アプリのデータベーススキーマ
-- Supabaseで実行するためのSQLファイル

-- 1. 単語帳テーブル (word_books)
CREATE TABLE IF NOT EXISTS word_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_language VARCHAR(10) NOT NULL DEFAULT 'en',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 単語カードテーブル (word_cards)
CREATE TABLE IF NOT EXISTS word_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- AI生成情報の個別フィールド
    ai_generated_info JSONB,
    english_equivalent VARCHAR(255),
    japanese_equivalent VARCHAR(255),
    pronunciation VARCHAR(255),
    example_sentence TEXT,
    example_sentence_japanese TEXT,
    example_sentence_english TEXT,
    usage_notes TEXT,
    word_class VARCHAR(100),
    gender_variations JSONB,
    tense_variations JSONB
);

-- 3. 単語帳と単語カードの関連テーブル (word_book_cards)
-- 学習状況の管理も含む
CREATE TABLE IF NOT EXISTS word_book_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_book_id UUID NOT NULL REFERENCES word_books(id) ON DELETE CASCADE,
    word_card_id UUID NOT NULL REFERENCES word_cards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 学習状況管理のカラム
    learning_status VARCHAR(20) DEFAULT 'not_started' CHECK (learning_status IN ('not_started', 'learned', 'uncertain', 'forgot')),
    last_reviewed_at TIMESTAMPTZ,
    review_count INTEGER DEFAULT 0,
    
    UNIQUE(word_book_id, word_card_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_word_books_user_id ON word_books(user_id);
CREATE INDEX IF NOT EXISTS idx_word_cards_user_id ON word_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_word_book_cards_word_book_id ON word_book_cards(word_book_id);
CREATE INDEX IF NOT EXISTS idx_word_book_cards_word_card_id ON word_book_cards(word_card_id);
CREATE INDEX IF NOT EXISTS idx_word_book_cards_learning_status ON word_book_cards(learning_status);
CREATE INDEX IF NOT EXISTS idx_word_book_cards_last_reviewed_at ON word_book_cards(last_reviewed_at);

-- Row Level Security (RLS) を有効化
ALTER TABLE word_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_book_cards ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成

-- 単語帳テーブルのポリシー
CREATE POLICY IF NOT EXISTS "Users can view own word_books" ON word_books
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own word_books" ON word_books
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own word_books" ON word_books
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own word_books" ON word_books
    FOR DELETE USING (auth.uid() = user_id);

-- 単語カードテーブルのポリシー
CREATE POLICY IF NOT EXISTS "Users can view own word_cards" ON word_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own word_cards" ON word_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own word_cards" ON word_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own word_cards" ON word_cards
    FOR DELETE USING (auth.uid() = user_id);

-- 単語帳と単語カードの関連テーブルのポリシー
CREATE POLICY IF NOT EXISTS "Users can view own word_book_cards" ON word_book_cards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM word_books 
            WHERE word_books.id = word_book_cards.word_book_id 
            AND word_books.user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can insert own word_book_cards" ON word_book_cards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM word_books 
            WHERE word_books.id = word_book_cards.word_book_id 
            AND word_books.user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can update own word_book_cards" ON word_book_cards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM word_books 
            WHERE word_books.id = word_book_cards.word_book_id 
            AND word_books.user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can delete own word_book_cards" ON word_book_cards
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM word_books 
            WHERE word_books.id = word_book_cards.word_book_id 
            AND word_books.user_id = auth.uid()
        )
    );

-- 更新時刻の自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新時刻の自動更新トリガー
CREATE TRIGGER update_word_books_updated_at
    BEFORE UPDATE ON word_books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_word_cards_updated_at
    BEFORE UPDATE ON word_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 動詞活用練習履歴テーブル (verb_conjugation_history)
CREATE TABLE IF NOT EXISTS verb_conjugation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_card_id UUID NOT NULL REFERENCES word_cards(id) ON DELETE CASCADE,
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

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_user_id ON verb_conjugation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_word_card_id ON verb_conjugation_history(word_card_id);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_is_correct ON verb_conjugation_history(is_correct);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_next_review_at ON verb_conjugation_history(next_review_at);
CREATE INDEX IF NOT EXISTS idx_verb_conjugation_history_created_at ON verb_conjugation_history(created_at);

-- RLS を有効化
ALTER TABLE verb_conjugation_history ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY IF NOT EXISTS "Users can manage their own conjugation history"
ON verb_conjugation_history
FOR ALL
USING (auth.uid() = user_id);

-- SRS更新用のトリガー関数
CREATE OR REPLACE FUNCTION update_srs_on_answer()
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

-- トリガーの作成
CREATE TRIGGER srs_update_trigger
BEFORE INSERT ON verb_conjugation_history
FOR EACH ROW
EXECUTE FUNCTION update_srs_on_answer();

-- 統計情報を取得するためのビュー
CREATE OR REPLACE VIEW verb_conjugation_stats AS
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
FROM verb_conjugation_history vch
JOIN word_cards wc ON vch.word_card_id = wc.id
GROUP BY vch.user_id, vch.word_card_id, wc.word, vch.practice_type, vch.tense, vch.mood, vch.person;

-- テストデータの挿入（開発用）
-- 注意: 実際の本番環境では削除してください

-- コメントアウト（実際に実行したい場合はコメントを外す）
/*
-- サンプルユーザーのテストデータ
INSERT INTO word_books (name, description, target_language, user_id) VALUES
('英語基礎単語帳', '基本的な英語単語の練習用', 'en', auth.uid()),
('スペイン語動詞集', 'スペイン語の動詞を集めた単語帳', 'es', auth.uid()),
('フランス語名詞集', 'フランス語の名詞を集めた単語帳', 'fr', auth.uid())
ON CONFLICT DO NOTHING;

INSERT INTO word_cards (word, user_id, english_equivalent, japanese_equivalent, pronunciation, example_sentence, usage_notes, word_class) VALUES
('hello', auth.uid(), 'hello', 'こんにちは', 'həˈloʊ', 'Hello, how are you?', 'Greeting used in English', 'interjection'),
('world', auth.uid(), 'world', '世界', 'wɜːrld', 'The world is beautiful.', 'Refers to the Earth or universe', 'noun'),
('learn', auth.uid(), 'learn', '学ぶ', 'lɜːrn', 'I want to learn new languages.', 'To acquire knowledge or skill', 'verb')
ON CONFLICT DO NOTHING;
*/