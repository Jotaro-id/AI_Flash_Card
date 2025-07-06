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