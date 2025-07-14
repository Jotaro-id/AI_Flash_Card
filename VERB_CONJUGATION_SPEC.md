# 動詞活用学習モード仕様書

## 概要
動詞の活用形に特化した学習モードを実装し、時制・法ごとに集中的に練習できる機能を提供する。

## 機能要件

### 1. 学習モード選択
- メインメニューから「動詞活用練習」を選択可能
- 単語帳内の動詞のみをフィルタリングして表示

### 2. 練習タイプ

#### 2.1 活用表穴埋め（Fill-in-the-Blanks）
- 時制・法を選択（例：直接法現在、点過去）
- 6つの人称のうちランダムに2-3個を空欄に
- 正解/不正解の即時フィードバック
- ヒント機能（最初の文字を表示）

#### 2.2 スペル入力（Spell Input）
- 不定詞 + 人称 + 時制を表示
- ユーザーが活用形を入力
- リアルタイムスペルチェック（文字数、アクセント記号）
- 正解時は次の問題へ自動遷移

#### 2.3 選択式クイズ（Multiple Choice）
- 4択から正しい活用形を選択
- 誤答は類似の活用形や別時制の活用形
- 解答後に正解と解説を表示

### 3. 学習進捗管理
- 動詞ごと、時制ごとの正答率を記録
- 苦手な活用形を重点的に出題
- 学習履歴をグラフで可視化

### 4. UI/UXデザイン
- 既存のテーマシステムを活用
- モバイルフレンドリーなレイアウト
- キーボードショートカット対応（デスクトップ）

## 技術仕様

### データ構造
```typescript
interface VerbConjugationSession {
  wordId: number;
  verb: string;
  targetLanguage: SupportedLanguage;
  practiceType: 'fill-blanks' | 'spell-input' | 'multiple-choice';
  tense: string; // e.g., 'present', 'preterite'
  mood: string;  // e.g., 'indicative', 'subjunctive'
  questions: ConjugationQuestion[];
  score: number;
  startedAt: Date;
}

interface ConjugationQuestion {
  person: string; // e.g., 'yo', 'tú'
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  hints?: string[];
}
```

### コンポーネント構成
```
├── VerbConjugationContainer.tsx  // メインコンテナ
├── VerbFilter.tsx               // 動詞フィルタリング
├── PracticeTypeSelector.tsx     // 練習タイプ選択
├── TenseMoodSelector.tsx        // 時制・法選択
├── FillBlanksExercise.tsx      // 穴埋め問題
├── SpellInputExercise.tsx      // スペル入力
├── MultipleChoiceExercise.tsx  // 選択式クイズ
└── ConjugationProgress.tsx     // 進捗表示
```

### データベース拡張
```sql
-- 動詞活用練習履歴テーブル
CREATE TABLE verb_conjugation_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  word_id INTEGER REFERENCES word_cards(id) NOT NULL,
  practice_type TEXT NOT NULL,
  tense TEXT NOT NULL,
  mood TEXT NOT NULL,
  person TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_verb_history_user_word ON verb_conjugation_history(user_id, word_id);
CREATE INDEX idx_verb_history_created ON verb_conjugation_history(created_at);
```

## 実装優先順位
1. 動詞フィルタリング機能
2. 穴埋め問題モード
3. スペル入力モード
4. 進捗管理システム
5. 選択式クイズモード
6. 統計・分析機能