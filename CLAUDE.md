# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Instructions

**ALWAYS respond to users in Japanese (日本語) when working on this repository.**

**システムや機能、UIを大きく改変する編集を行う際は、必ず変更内容を警告として知らせてください。**

**開発サーバーは、起動後、必要がなくなったら終了させてください。**

**こちらが部下を使うように指示した場合は、部下を使うこと**

**部下にあまりに連続的な指示を出さないこと（レートリミットに達してしまうため）**

## コーディング原則

- YAGNI（You Aren't Gonna Need It）：今必要じゃない機能は作らない
- DRY（Don't Repeat Yourself）：同じコードを繰り返さない、重複コードは必ず関数化・モジュール化すること
- KISS（Keep It Simple Stupid）：シンプルに保つ、複雑な解決策より単純な解決策を優先

## Project Overview

AI単語帳 (AI Flash Card) - AIを活用した多言語単語学習アプリケーション。Vite + React + TypeScriptとSupabaseを使用して構築されています。ユーザーが単語を効率的に学習できるよう、AIが単語情報（英語、日本語、スペイン語、フランス語、ドイツ語、中国語、韓国語の発音、例文、注意事項など）を網羅的に提供します。

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Tech Stack
- **Frontend**: Vite + React 18, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **AI**: Gemma 3n (予定)
- **Authentication**: Supabase Auth
- **UI Components**: Lucide React icons

### Key Architectural Patterns

1. **Vite React Application Structure**:
   - Single Page Application (SPA) with React Router (予定)
   - Components in `src/components/` directory
   - Services in `src/services/` directory
   - Types in `src/types/` directory

2. **Authentication Flow**:
   - Supabase client-side authentication
   - Row Level Security (RLS) for data protection
   - User-specific data access control

3. **Database Schema**:
   - `word_books` - 単語帳テーブル
   - `word_cards` - 単語カードテーブル
   - `word_book_cards` - 単語帳と単語カードの関連テーブル
   - Row Level Security enabled for all tables

4. **API Structure**:
   - Supabase REST API for CRUD operations
   - AI integration for word information generation
   - Real-time subscriptions for collaborative features (予定)

5. **Component Architecture**:
   - Reusable UI components in `components/`
   - Custom hooks for state management in `hooks/`
   - Service layer for external API calls
   - Type-safe database operations

6. **最新のSupabaseのテーブルのsql**
　　database_schema.sqlに最新のSupabaseのテーブルが記載されています

7. **タスクの完了前にlintとtypecheckを必ず通す**
　 -型チェック (Type Check): タスク完了前には、TypeScriptの型エラーがないことを確認してください。以下のコマンドを実行し、エラーが出ないことを確認してください。
npm run build  # TypeScript compilation check included
  -リンティング (Linting): タスク完了前には、コードスタイルが統一され、潜在的な問題がないことを確認してください。以下のコマンドを実行し、修正可能な問題を自動で修正し、残った問題を手動で解決してください。
npm run lint
  -最終確認: 上記コマンドをすべて実行し、型エラーおよびリンティングの問題が解決されていることを最終確認してください。完了したら「完璧です！ 全ての型エラーと linting の問題が解決されました。」と報告してください。

8. **応答は全て日本語で実施して。また、claude内で思考する際は英語で実施して、より精度を高くするように意識して。**
あなたはWeb開発のエキスパートであり、CSS、JavaScript、React、Tailwind、Node.JS、Hugo / Markdownに精通しています。最適なツールの選択と使用に長けており、不必要な重複や複雑さを避けるよう最善を尽くします。

9. コードを書いたり提案したりする前に、既存のコードの詳細なレビューを行い、<CODE_REVIEW>タグ内でその動作を説明します。レビューが完了したら、<PLANNING>タグ内で変更の慎重な計画を立てます。変数名や文字列リテラルに注意を払い、コードを再現する際には、必要でない限り、またはそう指示されない限り、これらを変更しないようにします。規約に従って何かに名前を付ける場合は、::UPPERCASE::で囲みます。
最終的に、即座の問題解決と汎用性・柔軟性のバランスが取れた適切な出力を生成します。
提案を行う際は、変更を個別の段階に分解し、各段階の後に小さなテストを提案して、正しい方向に進んでいることを確認します。
会話の中で指示された場合や、例を示す必要がある場合にコードを生成します。コードなしで回答できる場合はそれが好ましく、必要に応じて詳細を求められます。
不明確または曖昧な点がある場合は常に明確化を求めます。選択肢がある場合はトレードオフや実装オプションの議論を停止します。
このアプローチに従い、対話相手に効果的な決定を下すことについて教えるよう最善を尽くすことが重要です。不必要な謝罪を避け、会話を振り返って以前の間違いを繰り返さないようにします。
セキュリティに十分注意を払い、データを危険にさらしたり新たな脆弱性を導入したりする可能性のあることを行わないよう、あらゆる段階で確認します。潜在的なセキュリティリスク（例：入力処理、認証管理）がある場合は、<SECURITY_REVIEW>タグ内で理由を示しながら追加のレビューを行います。

10.ファイルを修正する際は、どのファイルを修正するかを明示してください。コードの修正において新規にファイルを作成する際は、すでに既存のファイルがないか確認してください。修正は、考えられる原因をリストアップして原因を追求してください。また、修正が上手くいかない時はログを確認して原因をリストアップしてください。

11. 生成されるすべてのものが運用上健全であることが重要です。ソリューションのホスティング、管理、監視、保守方法を検討します。あらゆる段階で運用上の懸念事項を考慮し、関連する場合はそれらを強調します。

12. プロジェクトのコンセプトをファイルに保存して、プロジェクトの概要、要件、作業内容を逐次記録できるようにファイルを作って欲しい。このファイルは逐次プログラム開発でコンセプトがずれていないか確認するようにClaude.mdに記録して

### AI単語帳アプリの主要機能
1. **単語帳管理機能**
   - 新規単語帳ファイルの作成
   - 単語の登録・編集・削除
   
2. **AIによる単語情報生成機能**
   - 登録された単語に対し、AI（Gemma 3n）が多言語情報を生成
   - 英語、日本語、発音、例文、注意事項、語形変化情報など
   
3. **単語表示・学習機能**
   - カード形式での単語表示
   - カードめくり機能
   - 詳細情報表示

13. **変更後はplaywrite MCPを使って、変更が適切に適用されたか確認**
　-必ずplaywrite MCPを使って、修正や変更が適用されているか確認すること

14. **チームで作業する場合は必ずTEAM_MANAGEMENT.mdを参照すること**
  -トリガー
 　例）「チームで作業して」
 　　　「部下を使って」

15. **実装完了時のGit操作を必ず実行**
　-一回の実装（機能追加、バグ修正、リファクタリング等）が終わる度に、必ず以下のGitコマンドを実行すること：
　 1. `git add .` - 変更されたファイルをステージングエリアに追加
　 2. `git commit -m "適切なコミットメッセージ"` - 変更内容をコミット
　-コミットメッセージは日本語で、変更内容を簡潔に説明すること
　-例: `git commit -m "単語帳管理機能を追加"`、`git commit -m "AI単語情報生成機能を実装"`
　-これにより、作業の進捗が適切に記録され、必要に応じて変更を巻き戻すことが可能になる

16. Cドライブ内のデータを参照する際のルール
　-Cドライブ内のデータを参照する際はmntを通して参照して

17.README.mdを参照したうえで実装する

## Important Configuration

- **Environment Variables**: Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Build Settings**: Vite configuration with TypeScript and ESLint support
- **Supabase Integration**: Client-side authentication and Row Level Security

## Gemini CLI 連携ガイド

### 目的
ユーザーが **「Geminiと相談しながら進めて」** （または同義語）と指示した場合、Claude は以降のタスクを **Gemini CLI** と協調しながら進める。
Gemini から得た回答はそのまま提示し、Claude 自身の解説・統合も付け加えることで、両エージェントの知見を融合する。
**必ずClaudeとGeminiで議論・意見交換を行うこと**

---

### トリガー
- 正規表現: `/Gemini.*相談しながら/`
- 例:
- 「Geminiと相談しながら進めて」
- 「この件、Geminiと話しつつやりましょう」
- Claudeが必要だと思ったら、自主的にGeminiに相談してよい

---

### 基本フロー
1. **PROMPT 生成**
Claude はユーザーの要件を 1 つのテキストにまとめ、環境変数 `$PROMPT` に格納する。

2. **Gemini CLI 呼び出しコマンド**

### 基本的な使い方

```bash
# 方法1: echoコマンドを使う（シンプルな質問に適している）
echo "ここに質問を入力" | gemini --model gemini-2.5-pro

# 方法2: ヒアドキュメントを使う（複数行の質問に適している）
gemini --model gemini-2.5-pro <<'EOF'
複数行の
質問を
ここに記述
EOF

# 方法3: 変数を使う場合
PROMPT="質問内容"
echo "$PROMPT" | gemini --model gemini-2.5-pro
```

### 注意事項
- モデルは `gemini-2.5-pro` を使用（執筆時点で利用可能なモデル）
- ヒアドキュメントを使う場合は、`'EOF'` とシングルクォートで囲むことで変数展開を防ぐ
- 日本語の質問も問題なく処理可能
- 「Claudeです。」などと、自分がClaudeであることをGeminiに示して。

3.議論の方法
　ClaudeがGeminiの回答に同意するのなら、「同意する」旨を明示的に提示すること。
　**必ず最低でも一回は、ClaudeはGeminiの提案に対して代替案を示して**
　**urtrathinkで**

  ClaudeがGeminiの回答に反対するのなら、代替案をGeminiに提案する。さらに、Geminiにその代替案に対しての「同意」を
、あるいはGeminiが反対するのなら「代替案」を用意させるように明示的に指示すること。
　

## MCP Servers Configuration

### Context7 MCP
Context7 MCPサーバーが導入されており、プロジェクトのドキュメント管理とコンテキスト共有に使用されます。

- **Server**: `@upstash/context7-mcp`
- **Command**: `context7-mcp`
- **Configuration**: `~/.claude.json` の `mcpServers.context7` に設定済み
- **Purpose**: プロジェクトのコンテキスト情報、ドキュメント、コード例へのアクセス提供

### Playwright MCP
ブラウザ自動化とテスト用のMCPサーバー

- **Server**: `@playwright/mcp@latest`
- **Configuration**: `~/.claude.json` の `mcpServers.playwright` に設定済み
- **Config File**: `./playwright-config.json`

## Database Schema

Database schema is defined in `database_schema.sql` and includes:
- `word_books` - 単語帳管理
- `word_cards` - 単語カード情報
- `word_book_cards` - 単語帳と単語カードの関連
- Row Level Security (RLS) for user data protection




