import React, { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { speechService } from '@/services/speechService';

interface SpeechButtonProps {
  text: string;
  language?: 'en' | 'ja' | 'es' | 'fr' | 'it' | 'de' | 'zh' | 'ko' | 'auto';
  size?: number;
  className?: string;
}

export const SpeechButton: React.FC<SpeechButtonProps> = ({
  text,
  language = 'auto',
  size = 20,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation(); // カードのクリックイベントを防ぐ

    if (!speechService.isSupported()) {
      alert('お使いのブラウザは音声再生に対応していません。');
      return;
    }

    if (isPlaying) {
      speechService.stop();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setIsPlaying(true);

    try {
      // 自動言語検出または指定された言語を使用
      const detectedLanguage = language === 'auto' 
        ? speechService.detectLanguage(text)
        : language;
      
      await speechService.speak(text, detectedLanguage);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      alert('音声の再生に失敗しました。');
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const getTooltipText = () => {
    if (isPlaying) return '停止';
    if (language === 'auto') return '音声再生（自動言語検出）';
    return `音声再生（${speechService.getLanguageName(language)}）`;
  };

  if (isLoading) {
    return (
      <button
        className={`text-white/60 transition-colors ${className}`}
        disabled
      >
        <Loader2 size={size} className="animate-spin" />
      </button>
    );
  }

  return (
    <button
      onClick={handleSpeak}
      className={`text-white/60 hover:text-white transition-colors hover:scale-110 transform duration-200 ${className}`}
      title={getTooltipText()}
    >
      {isPlaying ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
};