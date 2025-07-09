import React, { useState } from 'react';
import { AIWordInfo } from '@/types';
import { SpeechButton } from './SpeechButton';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface GrammaticalChangesTableProps {
  grammaticalChanges?: AIWordInfo['grammaticalChanges'];
  wordClass: AIWordInfo['wordClass'];
  targetLanguage: 'en' | 'ja' | 'es' | 'fr' | 'it' | 'de' | 'zh' | 'ko' | 'auto';
}

export const GrammaticalChangesTable: React.FC<GrammaticalChangesTableProps> = ({
  grammaticalChanges,
  wordClass,
  targetLanguage
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!grammaticalChanges) return null;

  // 動詞の活用表
  if (wordClass === 'verb' && grammaticalChanges.verbConjugations) {
    const conjugations = grammaticalChanges.verbConjugations;
    
    // 人称活用がある場合（スペイン語、フランス語、イタリア語など）
    if (conjugations.languageSpecific?.['present_1sg'] || conjugations.languageSpecific?.['present_2sg'] || conjugations.languageSpecific?.['present_3sg']) {
      return (
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-white font-semibold mb-3 hover:text-white/80 transition-colors"
          >
            <h3>動詞の活用</h3>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {isExpanded && (
            <>
              {/* 現在形 */}
              <div className="mb-4">
                <h4 className="text-white/90 font-medium mb-2">現在形</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-white/10">
                    <th className="border border-white/20 text-white/80 p-2 text-center">人称</th>
                    <th className="border border-white/20 text-white/80 p-2 text-center">単数</th>
                    <th className="border border-white/20 text-white/80 p-2 text-center">複数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/20 text-white/80 p-2 bg-white/5">1人称</td>
                    <td className="border border-white/20 text-white font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugations.languageSpecific?.['present_1sg'] || conjugations.present}
                        <SpeechButton 
                          text={conjugations.languageSpecific?.['present_1sg'] || conjugations.present || ''} 
                          language={targetLanguage} 
                          size={14} 
                        />
                      </div>
                    </td>
                    <td className="border border-white/20 text-white font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugations.languageSpecific?.['present_1pl']}
                        {conjugations.languageSpecific?.['present_1pl'] && (
                          <SpeechButton 
                            text={conjugations.languageSpecific['present_1pl']} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 text-white/80 p-2 bg-white/5">2人称</td>
                    <td className="border border-white/20 text-white font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugations.languageSpecific?.['present_2sg']}
                        {conjugations.languageSpecific?.['present_2sg'] && (
                          <SpeechButton 
                            text={conjugations.languageSpecific['present_2sg']} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                    <td className="border border-white/20 text-white font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugations.languageSpecific?.['present_2pl']}
                        {conjugations.languageSpecific?.['present_2pl'] && (
                          <SpeechButton 
                            text={conjugations.languageSpecific['present_2pl']} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 text-white/80 p-2 bg-white/5">3人称</td>
                    <td className="border border-white/20 text-white font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugations.languageSpecific?.['present_3sg']}
                        {conjugations.languageSpecific?.['present_3sg'] && (
                          <SpeechButton 
                            text={conjugations.languageSpecific['present_3sg']} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                    <td className="border border-white/20 text-white font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugations.languageSpecific?.['present_3pl']}
                        {conjugations.languageSpecific?.['present_3pl'] && (
                          <SpeechButton 
                            text={conjugations.languageSpecific['present_3pl']} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* その他の時制 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conjugations.past && (
              <div>
                <h5 className="text-white/80 font-medium mb-1">過去形</h5>
                <div className="flex items-center gap-2">
                  <p className="text-white">{conjugations.past}</p>
                  <SpeechButton text={conjugations.past} language={targetLanguage} size={14} />
                </div>
              </div>
            )}
            {conjugations.future && (
              <div>
                <h5 className="text-white/80 font-medium mb-1">未来形</h5>
                <div className="flex items-center gap-2">
                  <p className="text-white">{conjugations.future}</p>
                  <SpeechButton text={conjugations.future} language={targetLanguage} size={14} />
                </div>
              </div>
            )}
            {conjugations.conditional && (
              <div>
                <h5 className="text-white/80 font-medium mb-1">条件法</h5>
                <div className="flex items-center gap-2">
                  <p className="text-white">{conjugations.conditional}</p>
                  <SpeechButton text={conjugations.conditional} language={targetLanguage} size={14} />
                </div>
              </div>
            )}
            {conjugations.subjunctive && (
              <div>
                <h5 className="text-white/80 font-medium mb-1">接続法</h5>
                <div className="flex items-center gap-2">
                  <p className="text-white">{conjugations.subjunctive}</p>
                  <SpeechButton text={conjugations.subjunctive} language={targetLanguage} size={14} />
                </div>
              </div>
            )}
            {conjugations.imperative && (
              <div>
                <h5 className="text-white/80 font-medium mb-1">命令形</h5>
                <div className="flex items-center gap-2">
                  <p className="text-white">{conjugations.imperative}</p>
                  <SpeechButton text={conjugations.imperative} language={targetLanguage} size={14} />
                </div>
              </div>
            )}
            {conjugations.gerund && (
              <div>
                <h5 className="text-white/80 font-medium mb-1">動名詞</h5>
                <div className="flex items-center gap-2">
                  <p className="text-white">{conjugations.gerund}</p>
                  <SpeechButton text={conjugations.gerund} language={targetLanguage} size={14} />
                </div>
              </div>
            )}
            {conjugations.pastParticiple && (
              <div>
                <h5 className="text-white/80 font-medium mb-1">過去分詞</h5>
                <div className="flex items-center gap-2">
                  <p className="text-white">{conjugations.pastParticiple}</p>
                  <SpeechButton text={conjugations.pastParticiple} language={targetLanguage} size={14} />
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      );
    }

    // 人称活用がない場合（英語など）
    const conjugationPairs = [
      { label: '現在形', value: conjugations.present },
      { label: '過去形', value: conjugations.past },
      { label: '過去分詞', value: conjugations.pastParticiple },
      { label: '動名詞', value: conjugations.gerund },
      { label: '三人称単数現在', value: conjugations.languageSpecific?.['present_3sg'] }
    ].filter(pair => pair.value);

    if (conjugationPairs.length > 0) {
      return (
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-white font-semibold mb-3 hover:text-white/80 transition-colors"
          >
            <h3>動詞の活用</h3>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {isExpanded && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-white/80 p-2">形態</th>
                  <th className="text-left text-white/80 p-2">活用形</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {conjugationPairs.map((pair, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="text-white/90 p-2">{pair.label}</td>
                    <td className="text-white font-medium p-2">{pair.value}</td>
                    <td className="p-2">
                      {pair.value && (
                        <SpeechButton 
                          text={pair.value} 
                          language={targetLanguage} 
                          size={14} 
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      );
    }
  }

  // 名詞・形容詞の性数変化表
  if ((wordClass === 'noun' || wordClass === 'adjective') && grammaticalChanges.genderNumberChanges) {
    const changes = grammaticalChanges.genderNumberChanges;
    
    return (
      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
        <h3 className="text-white font-semibold mb-3">
          {wordClass === 'noun' ? '名詞の性数変化' : '形容詞の性数変化'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left text-white/80 p-2">性</th>
                <th className="text-left text-white/80 p-2">単数</th>
                <th className="text-left text-white/80 p-2">複数</th>
              </tr>
            </thead>
            <tbody>
              {changes.masculine && (
                <tr className="border-b border-white/10">
                  <td className="text-white/90 p-2">男性</td>
                  <td className="text-white font-medium p-2">
                    <div className="flex items-center gap-2">
                      {changes.masculine.singular}
                      {changes.masculine.singular && (
                        <SpeechButton 
                          text={changes.masculine.singular} 
                          language={targetLanguage} 
                          size={14} 
                        />
                      )}
                    </div>
                  </td>
                  <td className="text-white font-medium p-2">
                    <div className="flex items-center gap-2">
                      {changes.masculine.plural}
                      {changes.masculine.plural && (
                        <SpeechButton 
                          text={changes.masculine.plural} 
                          language={targetLanguage} 
                          size={14} 
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {changes.feminine && (
                <tr className="border-b border-white/10">
                  <td className="text-white/90 p-2">女性</td>
                  <td className="text-white font-medium p-2">
                    <div className="flex items-center gap-2">
                      {changes.feminine.singular}
                      {changes.feminine.singular && (
                        <SpeechButton 
                          text={changes.feminine.singular} 
                          language={targetLanguage} 
                          size={14} 
                        />
                      )}
                    </div>
                  </td>
                  <td className="text-white font-medium p-2">
                    <div className="flex items-center gap-2">
                      {changes.feminine.plural}
                      {changes.feminine.plural && (
                        <SpeechButton 
                          text={changes.feminine.plural} 
                          language={targetLanguage} 
                          size={14} 
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {changes.neuter && (
                <tr className="border-b border-white/10">
                  <td className="text-white/90 p-2">中性</td>
                  <td className="text-white font-medium p-2">
                    <div className="flex items-center gap-2">
                      {changes.neuter.singular}
                      {changes.neuter.singular && (
                        <SpeechButton 
                          text={changes.neuter.singular} 
                          language={targetLanguage} 
                          size={14} 
                        />
                      )}
                    </div>
                  </td>
                  <td className="text-white font-medium p-2">
                    <div className="flex items-center gap-2">
                      {changes.neuter.plural}
                      {changes.neuter.plural && (
                        <SpeechButton 
                          text={changes.neuter.plural} 
                          language={targetLanguage} 
                          size={14} 
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 比較級・最上級 */}
        {wordClass === 'adjective' && grammaticalChanges.comparativeForms && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <h4 className="text-white/90 font-medium mb-2">比較変化</h4>
            <div className="grid grid-cols-2 gap-4">
              {grammaticalChanges.comparativeForms.comparative && (
                <div>
                  <p className="text-white/70 text-sm">比較級</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">
                      {grammaticalChanges.comparativeForms.comparative}
                    </p>
                    <SpeechButton 
                      text={grammaticalChanges.comparativeForms.comparative} 
                      language={targetLanguage} 
                      size={14} 
                    />
                  </div>
                </div>
              )}
              {grammaticalChanges.comparativeForms.superlative && (
                <div>
                  <p className="text-white/70 text-sm">最上級</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">
                      {grammaticalChanges.comparativeForms.superlative}
                    </p>
                    <SpeechButton 
                      text={grammaticalChanges.comparativeForms.superlative} 
                      language={targetLanguage} 
                      size={14} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};