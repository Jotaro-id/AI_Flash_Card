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