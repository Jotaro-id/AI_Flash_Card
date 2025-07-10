-- word_cardsテーブルの診断スクリプト
-- Supabase SQL Editorで実行してください

-- 1. テーブルの存在確認
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'word_cards'
) as table_exists;

-- 2. word_cardsテーブルのカラム構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'word_cards'
ORDER BY ordinal_position;

-- 3. インデックスの確認
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'word_cards';

-- 4. 制約の確認
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'word_cards';

-- 5. RLSポリシーの確認
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'word_cards';

-- 6. 外部キー制約の詳細
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'word_cards';

-- 7. サンプルデータ（存在する場合）
SELECT * FROM public.word_cards LIMIT 5;

-- 8. RLSが有効かどうかの確認
SELECT 
    relname,
    relrowsecurity
FROM pg_class
WHERE relname = 'word_cards'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');