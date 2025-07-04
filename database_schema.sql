-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.word_book_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  word_book_id uuid,
  word_card_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT word_book_cards_pkey PRIMARY KEY (id),
  CONSTRAINT word_book_cards_word_card_id_fkey FOREIGN KEY (word_card_id) REFERENCES public.word_cards(id),
  CONSTRAINT word_book_cards_word_book_id_fkey FOREIGN KEY (word_book_id) REFERENCES public.word_books(id)
);
CREATE TABLE public.word_books (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT word_books_pkey PRIMARY KEY (id),
  CONSTRAINT word_books_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.word_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  word character varying NOT NULL,
  language character varying NOT NULL,
  english_translation text,
  japanese_translation text,
  pronunciation text,
  example_sentence text,
  example_sentence_japanese text,
  example_sentence_english text,
  notes text,
  gender_number_info text,
  tense_info text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT word_cards_pkey PRIMARY KEY (id),
  CONSTRAINT word_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);