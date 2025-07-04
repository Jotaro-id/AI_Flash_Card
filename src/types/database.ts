export interface WordCard {
  id: string
  word: string
  language: string
  english_translation: string
  japanese_translation: string
  pronunciation: string
  example_sentence: string
  example_sentence_japanese: string
  example_sentence_english: string
  notes: string
  gender_number_info: string
  tense_info: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface WordBook {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface WordBookCard {
  id: string
  word_book_id: string
  word_card_id: string
  created_at: string
}