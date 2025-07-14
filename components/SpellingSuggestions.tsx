import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface SpellingSuggestionsProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  isVisible: boolean;
  currentWord: string;
}

export const SpellingSuggestions: React.FC<SpellingSuggestionsProps> = ({
  suggestions,
  onSelectSuggestion,
  isVisible,
  currentWord
}) => {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  // 現在の単語が提案に含まれている場合は、スペルが正しい
  const isCorrectSpelling = suggestions.length === 1 && suggestions[0].toLowerCase() === currentWord.toLowerCase();

  return (
    <div className="absolute z-50 right-0 mt-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 overflow-hidden max-w-xs">
      {isCorrectSpelling ? (
        <div className="px-3 py-2 flex items-center gap-1.5 text-green-600">
          <Check size={14} />
          <span className="text-xs">スペルは正しいです</span>
        </div>
      ) : (
        <>
          <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-amber-600" />
            <span className="text-xs text-amber-700">もしかして：</span>
          </div>
          <div className="py-0.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestion(suggestion)}
                className="w-full px-3 py-1.5 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group"
              >
                <span className="text-sm text-gray-800">{suggestion}</span>
                <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  修正
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};