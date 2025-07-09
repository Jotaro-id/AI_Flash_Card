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
  const [isExpanded, setIsExpanded] = useState(true); // デフォルトで展開
  
  console.log('[GrammaticalChangesTable] Props:', {
    grammaticalChanges,
    wordClass,
    targetLanguage
  });
  
  if (!grammaticalChanges) {
    console.log('[GrammaticalChangesTable] No grammaticalChanges provided');
    return null;
  }
  
  // 名詞・形容詞の場合の確認
  if (wordClass === 'noun' || wordClass === 'adjective') {
    console.log('[GrammaticalChangesTable] Checking for gender/number changes...');
    console.log('[GrammaticalChangesTable] genderNumberChanges:', grammaticalChanges.genderNumberChanges);
  }

  // 動詞の活用表
  if (wordClass === 'verb' && grammaticalChanges.verbConjugations) {
    const conjugations = grammaticalChanges.verbConjugations;
    console.log('[GrammaticalChangesTable] Verb conjugations found:', conjugations);
    console.log('[GrammaticalChangesTable] languageSpecific:', conjugations.languageSpecific);
    
    // スペイン語の動詞活用データが単一のオブジェクトとして保存されている場合の処理
    const checkForSpanishConjugations = () => {
      // スペイン語のすべての時制をチェック
      
      // conjugationsオブジェクト内のすべてのフィールドもチェック
      const allFields = Object.keys(conjugations);
      console.log('[checkForSpanishConjugations] All conjugation fields:', allFields);
      
      for (const field of allFields) {
        const tenseData = conjugations[field as keyof typeof conjugations];
        if (tenseData && typeof tenseData === 'object' && !Array.isArray(tenseData)) {
          const keys = Object.keys(tenseData);
          // スペイン語の人称代名詞が含まれているかチェック
          const spanishPronouns = [
            'yo', 'Yo', 'tú', 'Tú', 'él', 'Él', 'ella', 'Ella', 'usted', 'Usted',
            'él/ella/usted', 'Él/Ella/Usted', 'nosotros', 'Nosotros', 'nosotras', 'Nosotras',
            'nosotros/nosotras', 'Nosotros/Nosotras', 'vosotros', 'Vosotros', 'vosotras', 'Vosotras',
            'vosotros/vosotras', 'Vosotros/Vosotras', 'ellos', 'Ellos', 'ellas', 'Ellas',
            'ustedes', 'Ustedes', 'ellos/ellas/ustedes', 'Ellos/Ellas/Ustedes'
          ];
          if (keys.some(key => spanishPronouns.includes(key))) {
            return { tense: field, data: tenseData };
          }
        }
      }
      return null;
    };
    
    const spanishConjugation = checkForSpanishConjugations();
    console.log('[GrammaticalChangesTable] Spanish conjugation found:', spanishConjugation);
    
    // スペイン語の動詞活用が見つかった場合の処理
    if (spanishConjugation) {
      // 複数の時制をチェック
      const allSpanishConjugations = [];
      
      // すべてのフィールドをチェック
      const allFields = Object.keys(conjugations);
      console.log('[GrammaticalChangesTable] Checking all conjugation fields:', allFields);
      
      for (const field of allFields) {
        const tenseData = conjugations[field as keyof typeof conjugations];
        if (tenseData && typeof tenseData === 'object' && !Array.isArray(tenseData)) {
          const keys = Object.keys(tenseData);
          const spanishPronouns = [
            'yo', 'Yo', 'tú', 'Tú', 'él', 'Él', 'ella', 'Ella', 'usted', 'Usted',
            'él/ella/usted', 'Él/Ella/Usted', 'nosotros', 'Nosotros', 'nosotras', 'Nosotras',
            'nosotros/nosotras', 'Nosotros/Nosotras', 'vosotros', 'Vosotros', 'vosotras', 'Vosotras',
            'vosotros/vosotras', 'Vosotros/Vosotras', 'ellos', 'Ellos', 'ellas', 'Ellas',
            'ustedes', 'Ustedes', 'ellos/ellas/ustedes', 'Ellos/Ellas/Ustedes'
          ];
          if (keys.some(key => spanishPronouns.includes(key))) {
            console.log(`[GrammaticalChangesTable] Found Spanish conjugation for ${field}:`, tenseData);
            allSpanishConjugations.push({ tense: field, data: tenseData });
          }
        }
      }
      
      const renderConjugationTable = (conjugation: { tense: string; data: Record<string, string | undefined> }) => {
        const tenseLabels: { [key: string]: string } = {
          'present': '直説法現在形',
          'preterite': '直説法点過去形',
          'imperfect': '直説法線過去形',
          'future': '直説法未来形',
          'conditional': '条件法現在',
          'subjunctive': '接続法現在',
          'subjunctive_imperfect': '接続法過去',
          'imperative': '命令法',
          'past': '過去形',
          'presentPerfect': '現在完了',
          'pastPerfect': '過去完了',
          'futurePerfect': '未来完了',
          'conditionalPerfect': '条件法完了'
        };
        
        console.log(`[renderConjugationTable] Rendering ${conjugation.tense}:`, conjugation.data);
        
        return (
          <div className="mb-4" key={conjugation.tense}>
            <h4 className="text-gray-700 font-medium mb-2">
              {tenseLabels[conjugation.tense] || conjugation.tense}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 text-gray-700 p-2 text-center">人称</th>
                    <th className="border border-gray-300 text-gray-700 p-2 text-center">単数</th>
                    <th className="border border-gray-300 text-gray-700 p-2 text-center">複数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 text-gray-700 p-2 bg-gray-50">1人称</td>
                    <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugation.data['yo'] || conjugation.data['Yo'] || '-'}
                        {(conjugation.data['yo'] || conjugation.data['Yo']) && (
                          <SpeechButton 
                            text={conjugation.data['yo'] || conjugation.data['Yo'] || ''} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugation.data['nosotros/nosotras'] || conjugation.data['nosotros'] || conjugation.data['Nosotros/Nosotras'] || conjugation.data['Nosotros'] || '-'}
                        {(conjugation.data['nosotros/nosotras'] || conjugation.data['nosotros'] || conjugation.data['Nosotros/Nosotras'] || conjugation.data['Nosotros']) && (
                          <SpeechButton 
                            text={conjugation.data['nosotros/nosotras'] || conjugation.data['nosotros'] || conjugation.data['Nosotros/Nosotras'] || conjugation.data['Nosotros'] || ''} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 text-gray-700 p-2 bg-gray-50">2人称</td>
                    <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugation.data['tú'] || conjugation.data['Tú'] || '-'}
                        {(conjugation.data['tú'] || conjugation.data['Tú']) && (
                          <SpeechButton 
                            text={conjugation.data['tú'] || conjugation.data['Tú'] || ''} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugation.data['vosotros/vosotras'] || conjugation.data['vosotros'] || conjugation.data['Vosotros/Vosotras'] || conjugation.data['Vosotros'] || '-'}
                        {(conjugation.data['vosotros/vosotras'] || conjugation.data['vosotros'] || conjugation.data['Vosotros/Vosotras'] || conjugation.data['Vosotros']) && (
                          <SpeechButton 
                            text={conjugation.data['vosotros/vosotras'] || conjugation.data['vosotros'] || conjugation.data['Vosotros/Vosotras'] || conjugation.data['Vosotros'] || ''} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 text-gray-700 p-2 bg-gray-50">3人称</td>
                    <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugation.data['él/ella/usted'] || conjugation.data['él'] || conjugation.data['ella'] || conjugation.data['usted'] || conjugation.data['Él/Ella/Usted'] || conjugation.data['Él'] || '-'}
                        {(conjugation.data['él/ella/usted'] || conjugation.data['él'] || conjugation.data['ella'] || conjugation.data['usted'] || conjugation.data['Él/Ella/Usted'] || conjugation.data['Él']) && (
                          <SpeechButton 
                            text={conjugation.data['él/ella/usted'] || conjugation.data['él'] || conjugation.data['ella'] || conjugation.data['usted'] || conjugation.data['Él/Ella/Usted'] || conjugation.data['Él'] || ''} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {conjugation.data['ellos/ellas/ustedes'] || conjugation.data['ellos'] || conjugation.data['ellas'] || conjugation.data['ustedes'] || conjugation.data['Ellos/Ellas/Ustedes'] || conjugation.data['Ellos'] || '-'}
                        {(conjugation.data['ellos/ellas/ustedes'] || conjugation.data['ellos'] || conjugation.data['ellas'] || conjugation.data['ustedes'] || conjugation.data['Ellos/Ellas/Ustedes'] || conjugation.data['Ellos']) && (
                          <SpeechButton 
                            text={conjugation.data['ellos/ellas/ustedes'] || conjugation.data['ellos'] || conjugation.data['ellas'] || conjugation.data['ustedes'] || conjugation.data['Ellos/Ellas/Ustedes'] || conjugation.data['Ellos'] || ''} 
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
        );
      };
      
      // 時制の表示順序を定義
      const tenseOrder = [
        'present', 'preterite', 'imperfect', 'future', 'conditional',
        'presentPerfect', 'pastPerfect', 'futurePerfect', 'conditionalPerfect',
        'subjunctive', 'subjunctive_imperfect', 'imperative'
      ];
      
      // 時制を順序通りに並び替え
      const sortedConjugations = allSpanishConjugations.sort((a, b) => {
        const indexA = tenseOrder.indexOf(a.tense);
        const indexB = tenseOrder.indexOf(b.tense);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      
      console.log('[GrammaticalChangesTable] All Spanish conjugations found:', sortedConjugations.map(c => c.tense));
      
      return (
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-gray-800 font-semibold mb-3 hover:text-gray-600 transition-colors"
          >
            <h3>動詞の活用</h3>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {isExpanded && (
            <div>
              {sortedConjugations.length > 0 ? (
                sortedConjugations.map(conjugation => renderConjugationTable(conjugation))
              ) : (
                <p className="text-gray-600">活用形情報がありません。</p>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // 人称活用がある場合（スペイン語、フランス語、イタリア語など）
    if (conjugations.languageSpecific && Object.keys(conjugations.languageSpecific).length > 0) {
      console.log('[GrammaticalChangesTable] languageSpecific keys:', Object.keys(conjugations.languageSpecific));
      console.log('[GrammaticalChangesTable] languageSpecific values:', conjugations.languageSpecific);
      console.log('[GrammaticalChangesTable] Rendering person conjugations table');
      console.log('[GrammaticalChangesTable] isExpanded:', isExpanded);
      return (
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-gray-800 font-semibold mb-3 hover:text-gray-600 transition-colors"
          >
            <h3>動詞の活用</h3>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {isExpanded && (
            <>
              {/* 活用表を表示する関数 */}
              {(() => {
                const renderConjugationTable = (
                  title: string,
                  prefix: string,
                  showIfAny: boolean = true
                ) => {
                  const hasConjugations = showIfAny ? 
                    ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'].some(
                      person => conjugations.languageSpecific?.[`${prefix}_${person}`]
                    ) : true;

                  console.log(`[renderConjugationTable] ${title} - prefix: ${prefix}, hasConjugations: ${hasConjugations}`);
                  
                  if (!hasConjugations) return null;

                  return (
                    <div className="mb-4">
                      <h4 className="text-gray-700 font-medium mb-2">{title}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="border border-gray-300 text-gray-700 p-2 text-center">人称</th>
                              <th className="border border-gray-300 text-gray-700 p-2 text-center">単数</th>
                              <th className="border border-gray-300 text-gray-700 p-2 text-center">複数</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 text-gray-700 p-2 bg-gray-50">1人称</td>
                              <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {conjugations.languageSpecific?.[`${prefix}_1sg`] || 
                                   (prefix === 'present' && typeof conjugations.present === 'string' ? conjugations.present : '')}
                                  {(conjugations.languageSpecific?.[`${prefix}_1sg`] || 
                                    (prefix === 'present' && typeof conjugations.present === 'string' && conjugations.present)) && (
                                    <SpeechButton 
                                      text={conjugations.languageSpecific?.[`${prefix}_1sg`] || (typeof conjugations.present === 'string' ? conjugations.present : '') || ''} 
                                      language={targetLanguage} 
                                      size={14} 
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {conjugations.languageSpecific?.[`${prefix}_1pl`]}
                                  {conjugations.languageSpecific?.[`${prefix}_1pl`] && (
                                    <SpeechButton 
                                      text={conjugations.languageSpecific[`${prefix}_1pl`] || ''} 
                                      language={targetLanguage} 
                                      size={14} 
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 text-gray-700 p-2 bg-gray-50">2人称</td>
                              <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {conjugations.languageSpecific?.[`${prefix}_2sg`]}
                                  {conjugations.languageSpecific?.[`${prefix}_2sg`] && (
                                    <SpeechButton 
                                      text={conjugations.languageSpecific[`${prefix}_2sg`] || ''} 
                                      language={targetLanguage} 
                                      size={14} 
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {conjugations.languageSpecific?.[`${prefix}_2pl`]}
                                  {conjugations.languageSpecific?.[`${prefix}_2pl`] && (
                                    <SpeechButton 
                                      text={conjugations.languageSpecific[`${prefix}_2pl`] || ''} 
                                      language={targetLanguage} 
                                      size={14} 
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 text-gray-700 p-2 bg-gray-50">3人称</td>
                              <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {conjugations.languageSpecific?.[`${prefix}_3sg`]}
                                  {conjugations.languageSpecific?.[`${prefix}_3sg`] && (
                                    <SpeechButton 
                                      text={conjugations.languageSpecific[`${prefix}_3sg`] || ''} 
                                      language={targetLanguage} 
                                      size={14} 
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="border border-gray-300 text-gray-800 font-medium p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {conjugations.languageSpecific?.[`${prefix}_3pl`]}
                                  {conjugations.languageSpecific?.[`${prefix}_3pl`] && (
                                    <SpeechButton 
                                      text={conjugations.languageSpecific[`${prefix}_3pl`] || ''} 
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
                  );
                };

                console.log('[GrammaticalChangesTable] About to render conjugation tables');
                const tables = (
                  <>
                    {/* 直接法現在形 */}
                    {renderConjugationTable('直接法現在形', 'present', false)}
                    
                    {/* 点過去形 */}
                    {renderConjugationTable('点過去形', 'preterite')}
                    
                    {/* 線過去形 */}
                    {renderConjugationTable('線過去形', 'imperfect')}
                    
                    {/* 未来形 */}
                    {renderConjugationTable('未来形', 'future')}
                    
                    {/* 条件法現在 */}
                    {renderConjugationTable('条件法現在', 'conditional')}
                    
                    {/* 接続法現在 */}
                    {renderConjugationTable('接続法現在', 'subjunctive_present')}
                    
                    {/* 接続法過去 */}
                    {renderConjugationTable('接続法過去', 'subjunctive_past')}
                  </>
                );
                console.log('[GrammaticalChangesTable] Tables rendered');
                return tables;
              })()}

          {/* その他の時制 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conjugations.past && (
              <div>
                <h5 className="text-gray-600 font-medium mb-1">過去形</h5>
                <div className="flex items-center gap-2">
                  <p className="text-gray-800">
                    {typeof conjugations.past === 'string' 
                      ? conjugations.past 
                      : typeof conjugations.past === 'object' 
                        ? Object.entries(conjugations.past).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : ''
                    }
                  </p>
                  <SpeechButton 
                    text={typeof conjugations.past === 'string' ? conjugations.past : ''} 
                    language={targetLanguage} 
                    size={14} 
                  />
                </div>
              </div>
            )}
            {conjugations.future && (
              <div>
                <h5 className="text-gray-600 font-medium mb-1">未来形</h5>
                <div className="flex items-center gap-2">
                  <p className="text-gray-800">
                    {typeof conjugations.future === 'string' 
                      ? conjugations.future 
                      : typeof conjugations.future === 'object' 
                        ? Object.entries(conjugations.future).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : ''
                    }
                  </p>
                  <SpeechButton 
                    text={typeof conjugations.future === 'string' ? conjugations.future : ''} 
                    language={targetLanguage} 
                    size={14} 
                  />
                </div>
              </div>
            )}
            {conjugations.conditional && (
              <div>
                <h5 className="text-gray-600 font-medium mb-1">条件法</h5>
                <div className="flex items-center gap-2">
                  <p className="text-gray-800">
                    {typeof conjugations.conditional === 'string' 
                      ? conjugations.conditional 
                      : typeof conjugations.conditional === 'object' 
                        ? Object.entries(conjugations.conditional).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : ''
                    }
                  </p>
                  <SpeechButton 
                    text={typeof conjugations.conditional === 'string' ? conjugations.conditional : ''} 
                    language={targetLanguage} 
                    size={14} 
                  />
                </div>
              </div>
            )}
            {conjugations.subjunctive && (
              <div>
                <h5 className="text-gray-600 font-medium mb-1">接続法</h5>
                <div className="flex items-center gap-2">
                  <p className="text-gray-800">
                    {typeof conjugations.subjunctive === 'string' 
                      ? conjugations.subjunctive 
                      : typeof conjugations.subjunctive === 'object' 
                        ? Object.entries(conjugations.subjunctive).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : ''
                    }
                  </p>
                  <SpeechButton 
                    text={typeof conjugations.subjunctive === 'string' ? conjugations.subjunctive : ''} 
                    language={targetLanguage} 
                    size={14} 
                  />
                </div>
              </div>
            )}
            {conjugations.imperative && (
              <div>
                <h5 className="text-gray-600 font-medium mb-1">命令形</h5>
                <div className="flex items-center gap-2">
                  <p className="text-gray-800">
                    {typeof conjugations.imperative === 'string' 
                      ? conjugations.imperative 
                      : typeof conjugations.imperative === 'object' 
                        ? Object.entries(conjugations.imperative).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : ''
                    }
                  </p>
                  <SpeechButton 
                    text={typeof conjugations.imperative === 'string' ? conjugations.imperative : ''} 
                    language={targetLanguage} 
                    size={14} 
                  />
                </div>
              </div>
            )}
            {conjugations.gerund && (
              <div>
                <h5 className="text-gray-600 font-medium mb-1">動名詞</h5>
                <div className="flex items-center gap-2">
                  <p className="text-gray-800">
                    {typeof conjugations.gerund === 'string' 
                      ? conjugations.gerund 
                      : typeof conjugations.gerund === 'object' 
                        ? Object.entries(conjugations.gerund).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : ''
                    }
                  </p>
                  <SpeechButton 
                    text={typeof conjugations.gerund === 'string' ? conjugations.gerund : ''} 
                    language={targetLanguage} 
                    size={14} 
                  />
                </div>
              </div>
            )}
            {conjugations.pastParticiple && (
              <div>
                <h5 className="text-gray-600 font-medium mb-1">過去分詞</h5>
                <div className="flex items-center gap-2">
                  <p className="text-gray-800">
                    {typeof conjugations.pastParticiple === 'string' 
                      ? conjugations.pastParticiple 
                      : typeof conjugations.pastParticiple === 'object' 
                        ? Object.entries(conjugations.pastParticiple).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : ''
                    }
                  </p>
                  <SpeechButton 
                    text={typeof conjugations.pastParticiple === 'string' ? conjugations.pastParticiple : ''} 
                    language={targetLanguage} 
                    size={14} 
                  />
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
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-gray-800 font-semibold mb-3 hover:text-gray-600 transition-colors"
          >
            <h3>動詞の活用</h3>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {isExpanded && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left text-gray-700 p-2">形態</th>
                  <th className="text-left text-gray-700 p-2">活用形</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {conjugationPairs.map((pair, index) => {
                  const displayValue = typeof pair.value === 'string' 
                    ? pair.value 
                    : typeof pair.value === 'object' 
                      ? Object.entries(pair.value).map(([key, value]) => `${key}: ${value}`).join(', ')
                      : '';
                  const speechText = typeof pair.value === 'string' ? pair.value : '';
                  
                  return (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="text-gray-700 p-2">{pair.label}</td>
                      <td className="text-gray-800 font-medium p-2">{displayValue}</td>
                      <td className="p-2">
                        {speechText && (
                          <SpeechButton 
                            text={speechText} 
                            language={targetLanguage} 
                            size={14} 
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
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
    console.log('[GrammaticalChangesTable] Gender/Number changes for', wordClass, ':', changes);
    
    return (
      <div className="bg-gray-100 rounded-lg p-4 mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-gray-800 font-semibold mb-3 hover:text-gray-600 transition-colors"
        >
          <h3>{wordClass === 'noun' ? '名詞の性数変化' : '形容詞の性数変化'}</h3>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {isExpanded && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left text-gray-700 p-2">性</th>
                    <th className="text-left text-gray-700 p-2">単数</th>
                    <th className="text-left text-gray-700 p-2">複数</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.masculine && (
                    <tr className="border-b border-gray-200">
                      <td className="text-gray-700 p-2">男性</td>
                      <td className="text-gray-800 font-medium p-2">
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
                      <td className="text-gray-800 font-medium p-2">
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
                    <tr className="border-b border-gray-200">
                  <td className="text-gray-700 p-2">女性</td>
                  <td className="text-gray-800 font-medium p-2">
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
                  <td className="text-gray-800 font-medium p-2">
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
                    <tr className="border-b border-gray-200">
                  <td className="text-gray-700 p-2">中性</td>
                  <td className="text-gray-800 font-medium p-2">
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
                  <td className="text-gray-800 font-medium p-2">
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
              <div className="mt-4 pt-4 border-t border-gray-300">
                <h4 className="text-gray-700 font-medium mb-2">比較変化</h4>
                <div className="grid grid-cols-2 gap-4">
                  {grammaticalChanges.comparativeForms.comparative && (
                    <div>
                  <p className="text-gray-600 text-sm">比較級</p>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-800 font-medium">
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
                  <p className="text-gray-600 text-sm">最上級</p>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-800 font-medium">
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
          </>
        )}
      </div>
    );
  }

  // 形容詞・名詞で性数変化がない場合の表示
  if ((wordClass === 'noun' || wordClass === 'adjective')) {
    const hasChanges = grammaticalChanges.genderNumberChanges && 
      (grammaticalChanges.genderNumberChanges.masculine || 
       grammaticalChanges.genderNumberChanges.feminine || 
       grammaticalChanges.genderNumberChanges.neuter);
    
    if (!hasChanges) {
      console.log('[GrammaticalChangesTable] No gender/number changes for', wordClass);
      
      return (
      <div className="bg-gray-100 rounded-lg p-4 mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-gray-800 font-semibold mb-3 hover:text-gray-600 transition-colors"
        >
          <h3>{wordClass === 'noun' ? '名詞の性数変化' : '形容詞の性数変化'}</h3>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {isExpanded && (
          <div className="text-gray-600 text-sm p-4 bg-gray-50 rounded">
            <p>この{wordClass === 'noun' ? '名詞' : '形容詞'}は性数変化がありません。</p>
            {targetLanguage === 'en' && (
              <p className="mt-2">英語の{wordClass === 'noun' ? '名詞' : '形容詞'}は通常、性による変化はありません。</p>
            )}
            {targetLanguage === 'ja' && (
              <p className="mt-2">日本語の{wordClass === 'noun' ? '名詞' : '形容詞'}は性による変化はありません。</p>
            )}
            {targetLanguage === 'zh' && (
              <p className="mt-2">中国語の{wordClass === 'noun' ? '名詞' : '形容詞'}は性による変化はありません。</p>
            )}
            {targetLanguage === 'ko' && (
              <p className="mt-2">韓国語の{wordClass === 'noun' ? '名詞' : '形容詞'}は性による変化はありません。</p>
            )}
          </div>
        )}
      </div>
      );
    }
  }

  return null;
};