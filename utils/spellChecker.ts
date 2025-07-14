// よくあるスペルミスパターン（オフライン対応用）
export const commonMisspellingPatterns: { [key: string]: string } = {
  // 基本的なスペルミス
  'recieve': 'receive',
  'beleive': 'believe',
  'acheive': 'achieve',
  'freind': 'friend',
  'definately': 'definitely',
  'seperate': 'separate',
  'neccessary': 'necessary',
  'tommorow': 'tomorrow',
  'becuase': 'because',
  'beautifull': 'beautiful',
  'restaraunt': 'restaurant',
  'accomodation': 'accommodation',
  'embarass': 'embarrass',
  'occurence': 'occurrence',
  'occassionally': 'occasionally',
  'apreciate': 'appreciate',
  'congradulations': 'congratulations',
  'goverment': 'government',
  'immediatly': 'immediately',
  'independant': 'independent',
  'reccomend': 'recommend',
  'wierd': 'weird',
  'thier': 'their',
  'teh': 'the',
  'recieved': 'received',
  'wich': 'which',
  'begining': 'beginning',
  'catagory': 'category',
  'concious': 'conscious',
  'dissapear': 'disappear',
  'enviroment': 'environment',
  'existance': 'existence',
  'grammer': 'grammar',
  'happend': 'happened',
  'knowlege': 'knowledge',
  'lisence': 'license',
  'maintainance': 'maintenance',
  'persue': 'pursue',
  'recepient': 'recipient',
  'sucessful': 'successful',
  'untill': 'until',
  'wellcome': 'welcome'
};

// オフラインでの簡易スペルチェック
export function checkOfflineSpelling(word: string): string | null {
  const lowerWord = word.toLowerCase();
  return commonMisspellingPatterns[lowerWord] || null;
}

// レーベンシュタイン距離計算（簡易的な類似度チェック用）
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // 削除
          dp[i][j - 1] + 1,    // 挿入
          dp[i - 1][j - 1] + 1 // 置換
        );
      }
    }
  }

  return dp[m][n];
}

// スペル補完の候補を取得（ハイブリッドアプローチ）
export interface SpellSuggestion {
  word: string;
  confidence: number;
  source: 'offline' | 'ai';
}

export async function getSpellSuggestions(
  input: string
): Promise<SpellSuggestion[]> {
  const suggestions: SpellSuggestion[] = [];
  
  // まずオフラインパターンをチェック
  const offlineCorrection = checkOfflineSpelling(input);
  if (offlineCorrection) {
    suggestions.push({
      word: offlineCorrection,
      confidence: 1.0,
      source: 'offline'
    });
  }
  
  // よくあるパターンで類似度チェック
  const inputLower = input.toLowerCase();
  for (const [misspelling, correct] of Object.entries(commonMisspellingPatterns)) {
    if (misspelling !== inputLower) {
      const distance = calculateLevenshteinDistance(inputLower, misspelling);
      if (distance <= 2 && distance > 0) {
        suggestions.push({
          word: correct,
          confidence: 1 - (distance / Math.max(inputLower.length, misspelling.length)),
          source: 'offline'
        });
      }
    }
  }
  
  // 重複を削除し、信頼度でソート
  const uniqueSuggestions = Array.from(
    new Map(suggestions.map(s => [s.word, s])).values()
  ).sort((a, b) => b.confidence - a.confidence);
  
  return uniqueSuggestions.slice(0, 5);
}