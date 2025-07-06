# デバッグガイド - 読み込み中画面で止まる問題

## 問題の確認方法

### 1. ブラウザの開発者ツールを開く
- Chrome/Edge: F12キー または 右クリック → 「検証」
- Firefox: F12キー または 右クリック → 「要素を調査」

### 2. コンソールタブを確認
以下のログメッセージを確認してください：

1. `App component rendering...` - Appコンポーネントがレンダリングされているか
2. `Environment check - VITE_SUPABASE_URL:` - 環境変数が設定されているか
3. `Environment check - VITE_SUPABASE_ANON_KEY:` - 環境変数が設定されているか
4. `App component mounted. Starting auth check...` - 認証チェックが開始されているか
5. `Checking Supabase session...` - Supabaseセッションの確認中
6. `Session check result:` - セッションの結果（nullまたはセッションオブジェクト）
7. `Finished auth check. Setting isLoading to false.` - 認証チェック完了

### 3. エラーメッセージの確認
赤色のエラーメッセージがある場合は、その内容を確認してください。

## よくある原因と解決方法

### 1. 環境変数が設定されていない
- `.env`ファイルが存在することを確認
- `.env`ファイルに以下が設定されていることを確認：
  ```
  VITE_SUPABASE_URL=your-supabase-url
  VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```

### 2. Supabaseの接続エラー
- Supabaseプロジェクトが有効であることを確認
- URLとAPIキーが正しいことを確認

### 3. 認証状態の問題
- セッションがない場合は認証画面が表示されるはず
- 認証画面が表示されない場合は、Authコンポーネントの問題の可能性

## 一時的な解決方法

### ローカルストレージのクリア
1. 開発者ツールの「Application」タブを開く
2. 左側のメニューから「Local Storage」を選択
3. アプリケーションのURLを右クリック → 「Clear」

### 強制リロード
- Windows/Linux: Ctrl + Shift + R
- Mac: Cmd + Shift + R

## それでも解決しない場合
コンソールのログとエラーメッセージをコピーして共有してください。