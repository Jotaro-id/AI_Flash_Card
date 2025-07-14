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

export type LearningStatus = 'not_started' | 'learned' | 'uncertain' | 'forgot'

export interface WordBookCard {
  id: string
  word_book_id: string
  word_card_id: string
  created_at: string
  learning_status?: LearningStatus
  last_reviewed_at?: string
  review_count?: number
}

export interface VerbConjugationHistory {
  id: string
  user_id: string
  word_card_id: string
  practice_type: 'fill-blanks' | 'spell-input'
  tense: string
  mood: string
  person: string
  correct_answer: string
  user_answer?: string
  is_correct: boolean
  response_time_ms?: number
  attempts?: number
  created_at: string
  review_interval_days?: number
  next_review_at?: string
  ease_factor?: number
}