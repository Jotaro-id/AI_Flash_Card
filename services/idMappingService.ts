/**
 * LocalStorageのIDとSupabaseのUUIDをマッピングするサービス
 */
class IdMappingService {
  private wordBookMapping: Map<string, string> = new Map(); // LocalStorage ID -> Supabase UUID
  private wordCardMapping: Map<string, string> = new Map(); // LocalStorage ID -> Supabase UUID

  /**
   * 単語帳IDのマッピングを設定
   */
  setWordBookMapping(localId: string, supabaseId: string): void {
    this.wordBookMapping.set(localId, supabaseId);
  }

  /**
   * 単語カードIDのマッピングを設定
   */
  setWordCardMapping(localId: string, supabaseId: string): void {
    this.wordCardMapping.set(localId, supabaseId);
  }

  /**
   * LocalStorageの単語帳IDからSupabaseのUUIDを取得
   */
  getWordBookSupabaseId(localId: string): string | undefined {
    return this.wordBookMapping.get(localId);
  }

  /**
   * LocalStorageの単語カードIDからSupabaseのUUIDを取得
   */
  getWordCardSupabaseId(localId: string): string | undefined {
    return this.wordCardMapping.get(localId);
  }

  /**
   * 複数のLocalStorage IDから単語カードのSupabase IDを生成
   * @param fileId LocalStorageの単語帳ID
   * @param wordId LocalStorageの単語ID
   */
  generateWordCardLocalId(fileId: string, wordId: string): string {
    return `${fileId}_${wordId}`;
  }

  /**
   * マッピングをクリア
   */
  clear(): void {
    this.wordBookMapping.clear();
    this.wordCardMapping.clear();
  }

  /**
   * 単語帳マッピングをバッチで設定
   */
  setWordBookMappingBatch(mappings: Array<{ localId: string; supabaseId: string }>): void {
    mappings.forEach(({ localId, supabaseId }) => {
      this.wordBookMapping.set(localId, supabaseId);
    });
  }

  /**
   * 単語カードマッピングをバッチで設定
   */
  setWordCardMappingBatch(mappings: Array<{ localId: string; supabaseId: string }>): void {
    mappings.forEach(({ localId, supabaseId }) => {
      this.wordCardMapping.set(localId, supabaseId);
    });
  }
}

export const idMappingService = new IdMappingService();