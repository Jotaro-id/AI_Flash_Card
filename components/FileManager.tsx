import React, { useState } from 'react';
import { Plus, FileText, Trash2, Globe } from 'lucide-react';
import { VocabularyFile, ColorTheme, supportedLanguages, SupportedLanguage } from '@/types';
import { ThemeSelector } from './ThemeSelector';
import { UserMenu } from './UserMenu';
import { RateLimitStatus } from './RateLimitStatus';
import { ConnectionStatus } from './ConnectionStatus';
import { SyncStatus } from './SyncStatus';

interface FileManagerProps {
  files: VocabularyFile[];
  onCreateFile: (name: string, targetLanguage?: SupportedLanguage) => void;
  onDeleteFile: (id: string) => void;
  onSelectFile: (file: VocabularyFile) => void;
  onSignOut?: () => void;
  currentTheme: ColorTheme;
  availableThemes: ColorTheme[];
  onThemeChange: (themeId: string) => void;
  currentUser?: { email?: string; id: string } | null;
  onDebug?: () => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  onCreateFile,
  onDeleteFile,
  onSelectFile,
  onSignOut,
  currentTheme,
  availableThemes,
  onThemeChange,
  currentUser,
  onDebug
}) => {
  console.log('FileManager: レンダリング開始', { 
    filesCount: files.length, 
    files,
    filesType: Array.isArray(files) ? 'array' : typeof files,
    firstFile: files.length > 0 ? files[0] : 'no files'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [fileName, setFileName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('en');
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  const handleCreateFile = () => {
    if (fileName.trim()) {
      onCreateFile(fileName.trim(), targetLanguage);
      setFileName('');
      setTargetLanguage('en');
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFile();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setFileName('');
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.fileManager || 'from-purple-400 via-pink-500 to-red-500'} p-4`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">AI単語帳</h1>
            <div className="flex items-center gap-3">
              <ThemeSelector
                currentTheme={currentTheme}
                availableThemes={availableThemes}
                onThemeChange={onThemeChange}
                isOpen={isThemeSelectorOpen}
                onToggle={() => setIsThemeSelectorOpen(!isThemeSelectorOpen)}
              />
              <RateLimitStatus />
              <ConnectionStatus />
              {currentUser && <SyncStatus showDetails={true} />}
              {currentUser && onSignOut && (
                <UserMenu user={currentUser} onSignOut={onSignOut} />
              )}
              {onDebug && (
                <button
                  onClick={onDebug}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  title="LocalStorageのデータをコンソールに出力"
                >
                  Debug
                </button>
              )}
              <button
                onClick={() => setIsCreating(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 hover:scale-105"
              >
                <Plus size={20} />
                新規作成
              </button>
            </div>
          </div>

          {isCreating && (
            <div className="mb-6 p-4 bg-white/20 rounded-lg backdrop-blur-sm">
              <div className="space-y-3">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="ファイル名を入力..."
                  className="w-full p-3 bg-white/20 text-white placeholder-white/70 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                  autoFocus
                />
                
                <div className="flex items-center gap-3">
                  <Globe className="text-white/80" size={20} />
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
                    className="flex-1 p-3 bg-white/20 text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    {Object.entries(supportedLanguages).map(([code, name]) => (
                      <option key={code} value={code} className="bg-gray-800">
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreateFile}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  作成
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setFileName('');
                    setTargetLanguage('en');
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-white/20 backdrop-blur-sm rounded-xl p-6 hover:bg-white/30 transition-all duration-200 cursor-pointer hover:scale-105 group"
                onClick={() => onSelectFile(file)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="text-white/80" size={24} />
                    <div>
                      <h3 className="text-white font-semibold text-lg">{file.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-white/70 text-sm">
                          {file.words.length} 単語
                        </p>
                        {file.targetLanguage && (
                          <>
                            <span className="text-white/50">•</span>
                            <div className="flex items-center gap-1">
                              <Globe className="text-white/60" size={14} />
                              <span className="text-white/70 text-sm">
                                {supportedLanguages[file.targetLanguage]}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`「${file.name}」を削除してもよろしいですか？\n\nこの操作は取り消せません。関連する単語データもすべて削除されます。`)) {
                        onDeleteFile(file.id);
                      }
                    }}
                    className="text-white/60 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                    title="ファイルを削除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="mt-4 text-white/60 text-xs">
                  作成日: {new Date(file.createdAt).toLocaleDateString('ja-JP')}
                </div>
              </div>
            ))}
          </div>

          {files.length === 0 && !isCreating && (
            <div className="text-center py-12">
              <FileText className="mx-auto text-white/60 mb-4" size={48} />
              <p className="text-white/80 text-lg">まだファイルがありません</p>
              <p className="text-white/60">新規作成ボタンから始めましょう</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};