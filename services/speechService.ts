export class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    // ブラウザ環境でのみ初期化
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      
      // ボイスが非同期で読み込まれる場合があるため
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (this.synth) {
      this.voices = this.synth.getVoices();
    }
  }

  private getLanguageCode(language: string): string {
    const languageCodes: Record<string, string> = {
      'en': 'en-US',
      'ja': 'ja-JP',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'it': 'it-IT',
      'de': 'de-DE',
      'zh': 'zh-CN',
      'ko': 'ko-KR'
    };
    return languageCodes[language] || 'en-US';
  }

  private getPreferredVoice(lang: string): SpeechSynthesisVoice | null {
    const langCode = this.getLanguageCode(lang);
    
    // 指定された言語の音声を探す
    const langVoices = this.voices.filter(voice => 
      voice.lang.startsWith(lang) || voice.lang.startsWith(langCode)
    );
    
    if (langVoices.length === 0) return null;

    // より自然な音声を優先
    const preferredVoice = langVoices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.name.includes('Apple') ||
      voice.localService === false
    );

    return preferredVoice || langVoices[0];
  }

  private getOptimalSettings(language: string) {
    // 言語ごとに最適化された音声設定
    const settings = {
      'en': { rate: 0.8, pitch: 1.0, volume: 0.8 },
      'ja': { rate: 0.7, pitch: 1.0, volume: 0.8 },
      'es': { rate: 0.8, pitch: 1.0, volume: 0.8 },
      'fr': { rate: 0.8, pitch: 1.0, volume: 0.8 },
      'it': { rate: 0.8, pitch: 1.0, volume: 0.8 },
      'de': { rate: 0.7, pitch: 1.0, volume: 0.8 },
      'zh': { rate: 0.6, pitch: 1.1, volume: 0.8 },
      'ko': { rate: 0.7, pitch: 1.0, volume: 0.8 }
    };
    
    return settings[language as keyof typeof settings] || settings['en'];
  }

  public speak(text: string, language: 'en' | 'ja' | 'es' | 'fr' | 'it' | 'de' | 'zh' | 'ko' = 'en'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis is not available'));
        return;
      }
      
      // 既存の音声を停止
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // 言語設定
      const langCode = this.getLanguageCode(language);
      utterance.lang = langCode;
      
      // 適切な音声を選択
      const voice = this.getPreferredVoice(language);
      if (voice) {
        utterance.voice = voice;
      }

      // 言語に最適化された音声設定
      const settings = this.getOptimalSettings(language);
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      // イベントハンドラー
      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        // 'interrupted' エラーは期待される動作なので、エラーとして扱わない
        if (event.error === 'interrupted') {
          resolve();
        } else {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };

      // 音声再生
      this.synth.speak(utterance);
    });
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getAvailableLanguages(): string[] {
    const supportedLanguages = ['en', 'ja', 'es', 'fr', 'it', 'de', 'zh', 'ko'];
    const availableLanguages = new Set<string>();
    
    this.voices.forEach(voice => {
      supportedLanguages.forEach(lang => {
        const langCode = this.getLanguageCode(lang);
        if (voice.lang.startsWith(lang) || voice.lang.startsWith(langCode)) {
          availableLanguages.add(lang);
        }
      });
    });
    
    return Array.from(availableLanguages);
  }

  public getLanguageName(code: string): string {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'ja': '日本語',
      'es': 'Español',
      'fr': 'Français',
      'it': 'Italiano',
      'de': 'Deutsch',
      'zh': '中文',
      'ko': '한국어'
    };
    return languageNames[code] || code;
  }

  public detectLanguage(text: string): 'en' | 'ja' | 'es' | 'fr' | 'it' | 'de' | 'zh' | 'ko' {
    // 簡単な言語検出ロジック
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
      // ひらがな、カタカナ、漢字が含まれている場合は日本語
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
        return 'ja';
      }
      // 漢字のみの場合は中国語の可能性
      return 'zh';
    }
    
    if (/[\uAC00-\uD7AF]/.test(text)) {
      // ハングルが含まれている場合は韓国語
      return 'ko';
    }
    
    // ヨーロッパ言語の特徴的な文字で判定
    if (/[àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/.test(text.toLowerCase())) {
      if (/[àâæçèéêëîïôùûüÿ]/.test(text.toLowerCase())) return 'fr';
      if (/[àáèéìíîïòóùú]/.test(text.toLowerCase())) return 'it';
      if (/[áéíñóúü]/.test(text.toLowerCase())) return 'es';
      if (/[äöüß]/.test(text.toLowerCase())) return 'de';
    }
    
    // デフォルトは英語
    return 'en';
  }
}

// シングルトンインスタンス（ブラウザ環境でのみ初期化）
let speechServiceInstance: SpeechService | null = null;

if (typeof window !== 'undefined') {
  speechServiceInstance = new SpeechService();
}

export const speechService = speechServiceInstance || new SpeechService();