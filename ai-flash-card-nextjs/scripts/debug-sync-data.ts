// データ同期のデバッグスクリプト
// ローカルストレージのデータ構造を確認するためのスクリプト

import { localStorageService } from '../services/localStorageService';

export function debugSyncData() {
  console.log('=== データ同期デバッグ情報 ===');
  
  const allData = localStorageService.getAllData();
  
  console.log('1. ローカルストレージの全データ:', allData);
  
  if (allData.vocabularyFiles && allData.vocabularyFiles.length > 0) {
    console.log('\n2. 単語帳の詳細:');
    allData.vocabularyFiles.forEach((file, index) => {
      console.log(`\n単語帳 ${index + 1}:`, {
        id: file.id,
        name: file.name,
        targetLanguage: file.targetLanguage,
        wordsCount: file.words?.length || 0
      });
      
      if (file.words && file.words.length > 0) {
        console.log(`最初の単語の構造:`, file.words[0]);
      }
    });
  }
  
  console.log('\n3. 単語の構造サンプル:');
  const sampleWord = allData.vocabularyFiles?.[0]?.words?.[0];
  if (sampleWord) {
    console.log('単語ID:', sampleWord.id);
    console.log('単語:', sampleWord.word);
    console.log('AI生成情報:', sampleWord.aiGenerated);
    console.log('作成日時:', sampleWord.createdAt);
    console.log('学習状態:', sampleWord.learningStatus);
  }
  
  console.log('\n=== デバッグ終了 ===');
}

// コンソールから実行できるようにグローバルに公開
if (typeof window !== 'undefined') {
  (window as any).debugSyncData = debugSyncData;
}