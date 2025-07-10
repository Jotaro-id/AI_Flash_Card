-- 動詞活用練習履歴テーブル (verb_conjugation_history)
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