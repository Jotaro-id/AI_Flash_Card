import { SupportedLanguage, supportedLanguages } from '../types';

// Datamuse API - 完全無料、APIキー不要
const DATAMUSE_BASE_URL = 'https://api.datamuse.com';

// Free Dictionary API - 完全無料、APIキー不要（将来の拡張用）
// const FREE_DICT_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries';

// 多言語単語サジェスチョン機能
export const getWordSuggestions = async (
  text: string, 
  targetLanguage: SupportedLanguage
): Promise<string[]> => {
  // 入力が空の場合は空配列を返す
  if (!text.trim()) return [];
  
  try {
    // 言語別にサジェスチョン取得方法を分岐
    switch (targetLanguage) {
      case 'en':
        return await getEnglishSuggestions(text);
      case 'es':
        return await getSpanishSuggestions(text);
      case 'fr':
        return await getFrenchSuggestions(text);
      case 'de':
        return await getGermanSuggestions(text);
      case 'it':
        return await getItalianSuggestions(text);
      case 'ja':
        return await getJapaneseSuggestions(text);
      case 'zh':
        return await getChineseSuggestions(text);
      case 'ko':
        return await getKoreanSuggestions(text);
      default:
        return await getEnglishSuggestions(text);
    }
  } catch (error) {
    console.error('Word suggestion error:', error);
    // エラー時はフォールバックサジェスチョンを返す
    return getFallbackSuggestions(text, targetLanguage);
  }
};

// 英語のサジェスチョン（Datamuse API使用）
const getEnglishSuggestions = async (text: string): Promise<string[]> => {
  try {
    // Datamuse APIのサジェスチョンエンドポイント
    const response = await fetch(`${DATAMUSE_BASE_URL}/sug?s=${encodeURIComponent(text)}&max=5`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Datamuse APIのレスポンス形式: [{"word": "hello", "score": 300}, ...]
    return data
      .map((item: { word: string; score: number }) => item.word)
      .slice(0, 3); // 最大3つまで
  } catch (error) {
    console.error('Datamuse API error:', error);
    return getLocalEnglishSuggestions(text);
  }
};

// スペイン語のサジェスチョン（基本的な部分一致）
const getSpanishSuggestions = async (text: string): Promise<string[]> => {
  const commonSpanishWords = [
    'hola', 'adiós', 'gracias', 'por favor', 'disculpe', 'sí', 'no', 'bien', 'mal', 'agua',
    'comida', 'casa', 'escuela', 'trabajo', 'familia', 'amigo', 'tiempo', 'dinero', 'mundo', 'vida',
    'amor', 'niño', 'mujer', 'hombre', 'día', 'noche', 'mañana', 'tarde', 'año', 'mes',
    'semana', 'hora', 'minuto', 'segundo', 'grande', 'pequeño', 'bueno', 'malo', 'nuevo', 'viejo',
    'rojo', 'azul', 'verde', 'amarillo', 'negro', 'blanco', 'abuelo', 'abuela', 'padre', 'madre'
  ];
  
  return commonSpanishWords
    .filter(word => word.toLowerCase().startsWith(text.toLowerCase()))
    .slice(0, 3);
};

// フランス語のサジェスチョン
const getFrenchSuggestions = async (text: string): Promise<string[]> => {
  const commonFrenchWords = [
    'bonjour', 'au revoir', 'merci', 's\'il vous plaît', 'excusez-moi', 'oui', 'non', 'bien', 'mal', 'eau',
    'nourriture', 'maison', 'école', 'travail', 'famille', 'ami', 'temps', 'argent', 'monde', 'vie',
    'amour', 'enfant', 'femme', 'homme', 'jour', 'nuit', 'matin', 'après-midi', 'année', 'mois',
    'semaine', 'heure', 'minute', 'seconde', 'grand', 'petit', 'bon', 'mauvais', 'nouveau', 'vieux',
    'rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'grand-père', 'grand-mère', 'père', 'mère'
  ];
  
  return commonFrenchWords
    .filter(word => word.toLowerCase().startsWith(text.toLowerCase()))
    .slice(0, 3);
};

// ドイツ語のサジェスチョン
const getGermanSuggestions = async (text: string): Promise<string[]> => {
  const commonGermanWords = [
    'hallo', 'auf wiedersehen', 'danke', 'bitte', 'entschuldigung', 'ja', 'nein', 'gut', 'schlecht', 'wasser',
    'essen', 'haus', 'schule', 'arbeit', 'familie', 'freund', 'zeit', 'geld', 'welt', 'leben',
    'liebe', 'kind', 'frau', 'mann', 'tag', 'nacht', 'morgen', 'nachmittag', 'jahr', 'monat',
    'woche', 'stunde', 'minute', 'sekunde', 'groß', 'klein', 'gut', 'schlecht', 'neu', 'alt',
    'rot', 'blau', 'grün', 'gelb', 'schwarz', 'weiß', 'großvater', 'großmutter', 'vater', 'mutter'
  ];
  
  return commonGermanWords
    .filter(word => word.toLowerCase().startsWith(text.toLowerCase()))
    .slice(0, 3);
};

// イタリア語のサジェスチョン
const getItalianSuggestions = async (text: string): Promise<string[]> => {
  const commonItalianWords = [
    'ciao', 'arrivederci', 'grazie', 'prego', 'scusi', 'sì', 'no', 'bene', 'male', 'acqua',
    'cibo', 'casa', 'scuola', 'lavoro', 'famiglia', 'amico', 'tempo', 'denaro', 'mondo', 'vita',
    'amore', 'bambino', 'donna', 'uomo', 'giorno', 'notte', 'mattina', 'pomeriggio', 'anno', 'mese',
    'settimana', 'ora', 'minuto', 'secondo', 'grande', 'piccolo', 'buono', 'cattivo', 'nuovo', 'vecchio',
    'rosso', 'blu', 'verde', 'giallo', 'nero', 'bianco', 'nonno', 'nonna', 'padre', 'madre'
  ];
  
  return commonItalianWords
    .filter(word => word.toLowerCase().startsWith(text.toLowerCase()))
    .slice(0, 3);
};

// 日本語のサジェスチョン
const getJapaneseSuggestions = async (text: string): Promise<string[]> => {
  const commonJapaneseWords = [
    'こんにちは', 'さようなら', 'ありがとう', 'すみません', 'はい', 'いいえ', 'いい', '悪い', '水',
    '食べ物', '家', '学校', '仕事', '家族', '友達', '時間', 'お金', '世界', '人生',
    '愛', '子供', '女性', '男性', '日', '夜', '朝', '午後', '年', '月',
    '週', '時', '分', '秒', '大きい', '小さい', '良い', '悪い', '新しい', '古い',
    '赤', '青', '緑', '黄色', '黒', '白', 'おじいさん', 'おばあさん', 'お父さん', 'お母さん'
  ];
  
  return commonJapaneseWords
    .filter(word => word.includes(text))
    .slice(0, 3);
};

// 中国語のサジェスチョン
const getChineseSuggestions = async (text: string): Promise<string[]> => {
  const commonChineseWords = [
    '你好', '再见', '谢谢', '不客气', '对不起', '是', '不是', '好', '坏', '水',
    '食物', '家', '学校', '工作', '家庭', '朋友', '时间', '钱', '世界', '生活',
    '爱', '孩子', '女人', '男人', '天', '夜', '早上', '下午', '年', '月',
    '周', '小时', '分钟', '秒', '大', '小', '好', '坏', '新', '旧',
    '红', '蓝', '绿', '黄', '黑', '白', '爷爷', '奶奶', '父亲', '母亲'
  ];
  
  return commonChineseWords
    .filter(word => word.includes(text))
    .slice(0, 3);
};

// 韓国語のサジェスチョン
const getKoreanSuggestions = async (text: string): Promise<string[]> => {
  const commonKoreanWords = [
    '안녕하세요', '안녕히 가세요', '감사합니다', '천만에요', '죄송합니다', '네', '아니요', '좋다', '나쁘다', '물',
    '음식', '집', '학교', '일', '가족', '친구', '시간', '돈', '세계', '삶',
    '사랑', '아이', '여자', '남자', '날', '밤', '아침', '오후', '년', '월',
    '주', '시간', '분', '초', '크다', '작다', '좋다', '나쁘다', '새로운', '오래된',
    '빨간색', '파란색', '녹색', '노란색', '검은색', '흰색', '할아버지', '할머니', '아버지', '어머니'
  ];
  
  return commonKoreanWords
    .filter(word => word.includes(text))
    .slice(0, 3);
};

// ローカル英語サジェスチョン（Datamuse APIが使用できない場合のフォールバック）
const getLocalEnglishSuggestions = (text: string): Promise<string[]> => {
  const commonEnglishWords = [
    'hello', 'goodbye', 'thank', 'please', 'sorry', 'yes', 'no', 'good', 'bad', 'water',
    'food', 'house', 'school', 'work', 'family', 'friend', 'time', 'money', 'world', 'life',
    'love', 'child', 'woman', 'man', 'day', 'night', 'morning', 'afternoon', 'year', 'month',
    'week', 'hour', 'minute', 'second', 'big', 'small', 'good', 'bad', 'new', 'old',
    'red', 'blue', 'green', 'yellow', 'black', 'white', 'grandfather', 'grandmother', 'father', 'mother'
  ];
  
  const filtered = commonEnglishWords
    .filter(word => word.toLowerCase().startsWith(text.toLowerCase()))
    .slice(0, 3);
    
  return Promise.resolve(filtered);
};

// フォールバックサジェスチョン
const getFallbackSuggestions = (text: string, targetLanguage: SupportedLanguage): string[] => {
  // デフォルトのサジェスチョン
  return [`${text} (${supportedLanguages[targetLanguage]})`];
};

// 言語検出機能（基本的な文字判定）
export const detectLanguage = (text: string): SupportedLanguage => {
  // 日本語（ひらがな・カタカナ・漢字）
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    return 'ja';
  }
  
  // 中国語（簡体字・繁体字）
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh';
  }
  
  // 韓国語（ハングル）
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return 'ko';
  }
  
  // ヨーロッパ言語の特殊文字による判定
  if (/[àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/.test(text.toLowerCase())) {
    if (/[àâäæçèéêëôöù]/.test(text.toLowerCase())) return 'fr'; // フランス語
    if (/[äöüß]/.test(text.toLowerCase())) return 'de'; // ドイツ語
    if (/[àèéìíîòóù]/.test(text.toLowerCase())) return 'it'; // イタリア語
    if (/[ñáéíóúü]/.test(text.toLowerCase())) return 'es'; // スペイン語
  }
  
  // デフォルトは英語
  return 'en';
};