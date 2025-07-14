# AI API設定ガイド

## Gemini APIの制限について

Gemini 1.5 Flash 8Bの無料枠は非常に厳しい制限があります：
- **1日あたり50リクエストのみ**
- 1分あたり15リクエスト
- 1分あたり250,000トークン

## 対策と代替案

### 1. キャッシュ機能（実装済み）
一度生成した単語情報は自動的にキャッシュされ、同じ単語を再度検索する際はAPIを呼び出しません。

### 2. フォールバック機能（実装済み）
制限に達した場合、基本的な単語情報を自動生成して提供します。

### 3. モデルの選択
`.env.local`ファイルで使用するモデルを選択できます：

```env
# Gemini API設定
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here

# モデルの選択（オプション）
# - gemini-1.5-flash-8b: 最も高速だが1日50リクエスト制限（デフォルト）
# - gemini-1.5-flash: より高性能、同じ制限（推奨）
# - gemini-1.5-pro: 最高性能だが1日2リクエストのみ
# - gemini-2.0-flash: 新世代、高速（一般提供開始）
# - gemini-2.0-flash-lite: 最速・最安価（プレビュー）
NEXT_PUBLIC_GEMINI_MODEL=gemini-1.5-flash
```

#### モデル選択の推奨事項
- **開発・テスト**: `gemini-1.5-flash`（バランスが良い）
- **高速処理重視**: `gemini-2.0-flash-lite`（最速）
- **品質重視**: `gemini-1.5-pro`（1日2回まで）

### 4. 代替APIの使用

#### DeepSeek API（推奨）
- 高速な応答速度
- より寛大な無料枠
- OpenAI API互換フォーマット

設定方法：
```env
# DeepSeek API設定
NEXT_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

DeepSeek APIキーの取得：
1. [DeepSeek](https://www.deepseek.com/)にアクセス
2. アカウントを作成
3. APIキーを生成

#### その他の代替案
- **AI/ML API**: 200以上のモデルへのアクセス
- **Together AI**: 200以上のオープンソースモデル
- **Mistral AI**: 高性能なLLM API

## トラブルシューティング

### エラー: "You exceeded your current quota"
- 原因：1日の無料枠（50リクエスト）を使い切った
- 対策：
  1. 翌日まで待つ
  2. 有料プランにアップグレード
  3. 代替APIを使用

### エラー: "API key is not configured"
- 原因：環境変数が設定されていない
- 対策：`.env.local`ファイルにAPIキーを設定

## 推奨事項

1. **開発時**: キャッシュを活用し、同じ単語を何度も生成しない
2. **本番環境**: 有料プランまたは代替APIの使用を検討
3. **テスト時**: フォールバック機能で基本的な動作確認が可能