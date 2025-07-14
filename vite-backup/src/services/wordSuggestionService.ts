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

// スペイン語のサジェスチョン（複数のAPIを使用）
const getSpanishSuggestions = async (text: string): Promise<string[]> => {
  // 短すぎる入力は処理しない
  if (text.length < 2) return [];
  
  try {
    // 複数のAPI戦略を並行して実行
    const [wordnikSuggestions, datamideSuggestions, localSuggestions] = await Promise.allSettled([
      getSpanishWordnikSuggestions(text),
      getSpanishDatamuseSuggestions(text),
      Promise.resolve(getExtendedSpanishLocalSuggestions(text))
    ]);
    
    // 結果を統合
    const allSuggestions: string[] = [];
    
    // ローカル辞書を最優先
    if (localSuggestions.status === 'fulfilled') {
      allSuggestions.push(...localSuggestions.value);
    }
    
    // Wordnik APIの結果を追加
    if (wordnikSuggestions.status === 'fulfilled') {
      allSuggestions.push(...wordnikSuggestions.value);
    }
    
    // Datamuse APIの結果を追加
    if (datamideSuggestions.status === 'fulfilled') {
      allSuggestions.push(...datamideSuggestions.value);
    }
    
    // 重複を除去し、スペイン語単語を優先してソート
    const uniqueSuggestions = Array.from(new Set(allSuggestions));
    return scoreAndSortSpanishWords(uniqueSuggestions, text).slice(0, 8);
    
  } catch (error) {
    console.error('Spanish suggestions error:', error);
    return getExtendedSpanishLocalSuggestions(text);
  }
};

// Wordnik APIを使用したスペイン語サジェスチョン
const getSpanishWordnikSuggestions = async (text: string): Promise<string[]> => {
  try {
    // Free Dictionary APIを使用してスペイン語の単語を検索
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(text)}`);
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const suggestions = data.map(entry => entry.word).filter(word => word && word.startsWith(text));
        return suggestions.slice(0, 3);
      }
    }
  } catch (error) {
    console.error('Wordnik API error:', error);
  }
  
  return [];
};

// Datamuse APIを使用したスペイン語サジェスチョン（改良版）
const getSpanishDatamuseSuggestions = async (text: string): Promise<string[]> => {
  try {
    // Datamuse APIで類似語を検索
    const response = await fetch(`${DATAMUSE_BASE_URL}/sug?s=${encodeURIComponent(text)}&max=20`);
    
    if (response.ok) {
      const data = await response.json();
      const apiSuggestions = data
        .map((item: { word: string; score: number }) => item.word)
        .filter((word: string) => isSpanishWord(word, text));
      
      return apiSuggestions.slice(0, 5);
    }
  } catch (error) {
    console.error('Datamuse API error:', error);
  }
  
  return [];
};

// スペイン語の単語かどうかを判定する関数
const isSpanishWord = (word: string, inputText: string): boolean => {
  // 明確な英語単語を除外
  const englishWords = [
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been',
    'diaspora', 'diabetes', 'diatribe', 'dialogue', 'diagnosis', 'diamond', 'diagonal', 'diagram', 'dial',
    'dialectic', 'diameter', 'diary', 'dice', 'dictate', 'dictionary', 'die', 'diet', 'different', 'difficult',
    'digital', 'dignity', 'dimension', 'dinosaur', 'diplomatic', 'direct', 'directory', 'dirty', 'disability',
    'disappear', 'disaster', 'discipline', 'discount', 'discover', 'discussion', 'disease', 'disguise',
    'distance', 'district', 'divide', 'doctor', 'document', 'dollar', 'domestic', 'dominant', 'door',
    'double', 'doubt', 'down', 'download', 'dramatic', 'dream', 'dress', 'drink', 'drive', 'drop'
  ];
  
  if (englishWords.includes(word.toLowerCase())) {
    return false;
  }
  
  // スペイン語特有の特徴を持つ単語を優先
  if (/[ñáéíóúü]/.test(word)) {
    return true;
  }
  
  // スペイン語の動詞語尾
  if (word.endsWith('ar') || word.endsWith('er') || word.endsWith('ir')) {
    return true;
  }
  
  // スペイン語の名詞語尾
  if (word.endsWith('ción') || word.endsWith('dad') || word.endsWith('mente') || word.endsWith('ería')) {
    return true;
  }
  
  // スペイン語の基本単語
  if (/^(el|la|los|las|un|una|de|del|que|en|es|por|para|con|sin|día|días|donde|cuando|como|quien|cual)$/i.test(word)) {
    return true;
  }
  
  // 入力文字で始まる場合は候補とする（ただし、明らかに英語でない場合のみ）
  if (word.toLowerCase().startsWith(inputText.toLowerCase())) {
    // 英語らしい特徴を持つ単語を除外
    if (/^(th|wh|sh|ch|gh|ph|ght|ough|tion|sion)/.test(word.toLowerCase())) {
      return false;
    }
    return true;
  }
  
  return false;
};

// スペイン語単語のスコアリングとソート
const scoreAndSortSpanishWords = (words: string[], inputText: string): string[] => {
  const scored = words.map(word => {
    let score = 0;
    
    // 完全一致
    if (word.toLowerCase() === inputText.toLowerCase()) {
      score += 100;
    }
    
    // 前方一致の精度
    if (word.toLowerCase().startsWith(inputText.toLowerCase())) {
      score += 50;
    }
    
    // スペイン語特有の文字を含む場合は高得点
    if (/[ñáéíóúü]/.test(word)) {
      score += 20;
    }
    
    // スペイン語の典型的な語尾
    if (word.endsWith('ar') || word.endsWith('er') || word.endsWith('ir')) {
      score += 15;
    }
    
    if (word.endsWith('ción') || word.endsWith('dad') || word.endsWith('mente')) {
      score += 15;
    }
    
    // 長さの近さ
    score -= Math.abs(word.length - inputText.length);
    
    return { word, score };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .map(item => item.word);
};

// 拡張されたスペイン語ローカル辞書
const getExtendedSpanishLocalSuggestions = (text: string): string[] => {
  const extendedSpanishWords = [
    // 基本的な挨拶・表現
    'hola', 'adiós', 'gracias', 'por favor', 'disculpe', 'sí', 'no', 'bien', 'mal', 'agua',
    // 一般的な名詞
    'comida', 'casa', 'escuela', 'trabajo', 'familia', 'amigo', 'tiempo', 'dinero', 'mundo', 'vida',
    'amor', 'niño', 'niña', 'mujer', 'hombre', 'día', 'noche', 'mañana', 'tarde', 'año', 'mes',
    // 「d」で始まる単語
    'dedo', 'dentro', 'después', 'desde', 'decir', 'dejar', 'delante', 'demás', 'democracia', 'departamento',
    'derecho', 'desarrollo', 'descanso', 'deseo', 'despertar', 'detalle', 'devolver', 'diabético', 'diario',
    'dibujo', 'diferente', 'difícil', 'digital', 'dinámico', 'director', 'discutir', 'diseño', 'distancia',
    'distrito', 'diverso', 'divertido', 'dividir', 'documento', 'dolor', 'domingo', 'donde', 'dorado', 'drama',
    // 動詞 - 原形
    'comprar', 'comprender', 'completar', 'comenzar', 'comer', 'conocer', 'conseguir', 'considerar',
    'construir', 'contar', 'continuar', 'contribuir', 'conversar', 'convertir', 'correr', 'cortar',
    'crear', 'crecer', 'creer', 'cruzar', 'cubrir', 'cumplir', 'cambiar', 'caminar', 'cantar',
    'estar', 'ser', 'tener', 'hacer', 'ir', 'venir', 'querer', 'poder', 'decir', 'saber',
    'dar', 'ver', 'pasar', 'deber', 'poner', 'parecer', 'quedar', 'pensar', 'sentir', 'llegar',
    'llevar', 'dejar', 'encontrar', 'llamar', 'volver', 'tomar', 'vivir', 'sentir', 'contar', 'buscar',
    'existir', 'entrar', 'trabajar', 'escribir', 'perder', 'producir', 'ocurrir', 'entender', 'pedir',
    'recibir', 'recordar', 'terminar', 'permitir', 'aparecer', 'conseguir', 'empezar', 'servir', 'sacar',
    'necesitar', 'mantener', 'resultar', 'leer', 'caer', 'cambiar', 'presentar', 'oír', 'hablar',
    // 動詞 - 活用形（一人称単数現在）
    'compro', 'comprendo', 'completo', 'comienzo', 'como', 'conozco', 'consigo', 'considero',
    'construyo', 'cuento', 'continúo', 'contribuyo', 'converso', 'convierto', 'corro', 'corto',
    'creo', 'crezco', 'cruzo', 'cubro', 'cumplo', 'cambio', 'camino', 'canto',
    'estoy', 'soy', 'tengo', 'hago', 'voy', 'vengo', 'quiero', 'puedo', 'digo', 'sé',
    // 動詞 - 過去形
    'compré', 'comprendí', 'completé', 'comencé', 'comí', 'conocí', 'conseguí', 'consideré',
    'construí', 'conté', 'continué', 'contribuí', 'conversé', 'convertí', 'corrí', 'corté',
    // 形容詞
    'completo', 'complejo', 'común', 'conocido', 'contento', 'contrario', 'conveniente', 'correcto',
    'corto', 'cultural', 'curioso', 'cierto', 'claro', 'comercial', 'complicado', 'concreto',
    // 特殊文字を含む単語
    'español', 'mañana', 'señor', 'señora', 'niño', 'niña', 'año', 'añadir', 'cumpleaños', 'tamaño',
    'sueño', 'otoño', 'montaña', 'cañón', 'compañero', 'compañía', 'diseño', 'enseñar', 'pequeño',
    'café', 'árbol', 'música', 'médico', 'teléfono', 'número', 'lápiz', 'máquina', 'cámara', 'fácil',
    'difícil', 'último', 'próximo', 'rápido', 'débil', 'útil', 'líquido', 'sólido', 'público', 'básico'
  ];
  
  // 入力テキストをノーマライズ
  const normalizeText = (str: string): string => {
    return str.toLowerCase()
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/ü/g, 'u');
  };
  
  const normalizedInput = normalizeText(text);
  
  // 候補を検索
  const suggestions = extendedSpanishWords.filter(word => {
    const normalizedWord = normalizeText(word);
    return word.toLowerCase().startsWith(text.toLowerCase()) || 
           normalizedWord.startsWith(normalizedInput);
  });
  
  // 重複を除去してユニークな候補のみを返す
  const uniqueSuggestions = Array.from(new Set(suggestions));
  
  // スコアリング
  const scored = uniqueSuggestions.map(word => {
    let score = 0;
    // 完全一致
    if (word.toLowerCase() === text.toLowerCase()) {
      score += 100;
    }
    // 前方一致の精度
    if (word.toLowerCase().startsWith(text.toLowerCase())) {
      score += 50;
    }
    // 特殊文字を含む単語を優先
    if (/[ñáéíóúü]/.test(word)) {
      score += 10;
    }
    // 長さの近さ
    score -= Math.abs(word.length - text.length) * 2;
    
    return { word, score };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .map(item => item.word)
    .slice(0, 8); // 8つまで候補を表示
};


// フランス語のサジェスチョン（特殊文字を考慮）
const getFrenchSuggestions = async (text: string): Promise<string[]> => {
  const commonFrenchWords = [
    'bonjour', 'au revoir', 'merci', 's\'il vous plaît', 'excusez-moi', 'oui', 'non', 'bien', 'mal', 'eau',
    'nourriture', 'maison', 'école', 'travail', 'famille', 'ami', 'temps', 'argent', 'monde', 'vie',
    'amour', 'enfant', 'femme', 'homme', 'jour', 'nuit', 'matin', 'après-midi', 'année', 'mois',
    'semaine', 'heure', 'minute', 'seconde', 'grand', 'petit', 'bon', 'mauvais', 'nouveau', 'vieux',
    'rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'grand-père', 'grand-mère', 'père', 'mère',
    // 特殊文字を含む単語
    'être', 'avoir', 'aller', 'faire', 'très', 'déjà', 'bientôt', 'peut-être', 'même', 'hôtel',
    'café', 'château', 'forêt', 'frère', 'sœur', 'œuvre', 'cœur', 'élève', 'étudiant', 'préférer',
    'espérer', 'créer', 'idée', 'problème', 'système', 'théâtre', 'cinéma', 'musée', 'lycée', 'université',
    'français', 'européen', 'médecin', 'ingénieur', 'présent', 'futur', 'passé', 'début', 'façon', 'leçon'
  ];
  
  const normalizeText = (str: string): string => {
    return str.toLowerCase()
      .replace(/[àâä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[îï]/g, 'i')
      .replace(/[ôö]/g, 'o')
      .replace(/[ùûü]/g, 'u')
      .replace(/ÿ/g, 'y')
      .replace(/ç/g, 'c')
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae');
  };
  
  const normalizedInput = normalizeText(text);
  
  const suggestions = commonFrenchWords.filter(word => {
    const normalizedWord = normalizeText(word);
    return word.toLowerCase().startsWith(text.toLowerCase()) || 
           normalizedWord.startsWith(normalizedInput);
  });
  
  return suggestions.slice(0, 5);
};

// ドイツ語のサジェスチョン（特殊文字を考慮）
const getGermanSuggestions = async (text: string): Promise<string[]> => {
  const commonGermanWords = [
    'hallo', 'auf wiedersehen', 'danke', 'bitte', 'entschuldigung', 'ja', 'nein', 'gut', 'schlecht', 'wasser',
    'essen', 'haus', 'schule', 'arbeit', 'familie', 'freund', 'zeit', 'geld', 'welt', 'leben',
    'liebe', 'kind', 'frau', 'mann', 'tag', 'nacht', 'morgen', 'nachmittag', 'jahr', 'monat',
    'woche', 'stunde', 'minute', 'sekunde', 'groß', 'klein', 'gut', 'schlecht', 'neu', 'alt',
    'rot', 'blau', 'grün', 'gelb', 'schwarz', 'weiß', 'großvater', 'großmutter', 'vater', 'mutter',
    // 特殊文字を含む単語
    'können', 'müssen', 'möchten', 'würde', 'hätte', 'wäre', 'für', 'über', 'schön', 'größer',
    'höher', 'länger', 'stärker', 'jünger', 'älter', 'früher', 'später', 'öffnen', 'hören', 'gehören',
    'führen', 'berühren', 'erzählen', 'erklären', 'verstärken', 'überlegen', 'übersetzen', 'überraschen',
    'straße', 'größe', 'süß', 'heiß', 'fließen', 'schließen', 'genießen', 'beißen', 'reißen', 'gießen'
  ];
  
  const normalizeText = (str: string): string => {
    return str.toLowerCase()
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ß/g, 'ss');
  };
  
  const normalizedInput = normalizeText(text);
  
  const suggestions = commonGermanWords.filter(word => {
    const normalizedWord = normalizeText(word);
    return word.toLowerCase().startsWith(text.toLowerCase()) || 
           normalizedWord.startsWith(normalizedInput);
  });
  
  return suggestions.slice(0, 5);
};

// イタリア語のサジェスチョン（特殊文字を考慮）
const getItalianSuggestions = async (text: string): Promise<string[]> => {
  const commonItalianWords = [
    'ciao', 'arrivederci', 'grazie', 'prego', 'scusi', 'sì', 'no', 'bene', 'male', 'acqua',
    'cibo', 'casa', 'scuola', 'lavoro', 'famiglia', 'amico', 'tempo', 'denaro', 'mondo', 'vita',
    'amore', 'bambino', 'donna', 'uomo', 'giorno', 'notte', 'mattina', 'pomeriggio', 'anno', 'mese',
    'settimana', 'ora', 'minuto', 'secondo', 'grande', 'piccolo', 'buono', 'cattivo', 'nuovo', 'vecchio',
    'rosso', 'blu', 'verde', 'giallo', 'nero', 'bianco', 'nonno', 'nonna', 'padre', 'madre',
    // 特殊文字を含む単語
    'caffè', 'città', 'università', 'possibilità', 'libertà', 'verità', 'società', 'qualità', 'quantità',
    'più', 'già', 'però', 'perché', 'così', 'là', 'qua', 'può', 'sarà', 'farà', 'andrà',
    'è', 'sarò', 'farò', 'andrò', 'verrò', 'dirò', 'avrò', 'saprò', 'potrò', 'dovrò',
    'papà', 'bebè', 'virtù', 'gioventù', 'servitù', 'tribù', 'menù', 'tabù', 'perciò', 'cioè'
  ];
  
  const normalizeText = (str: string): string => {
    return str.toLowerCase()
      .replace(/[àá]/g, 'a')
      .replace(/[èé]/g, 'e')
      .replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o')
      .replace(/[ùú]/g, 'u');
  };
  
  const normalizedInput = normalizeText(text);
  
  const suggestions = commonItalianWords.filter(word => {
    const normalizedWord = normalizeText(word);
    return word.toLowerCase().startsWith(text.toLowerCase()) || 
           normalizedWord.startsWith(normalizedInput);
  });
  
  return suggestions.slice(0, 5);
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