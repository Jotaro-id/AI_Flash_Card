This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🚀 AI単語帳アプリ

ローカルストレージとクラウド同期に対応したAI単語学習アプリケーションです。

## 📋 機能

- 💾 **ローカルモード**: パスワード不要、ブラウザ内でデータ管理
- ☁️ **クラウドモード**: Supabase認証 + 自動同期機能
- 🤖 **AI単語情報生成**: 多言語対応の単語情報自動生成
- 📚 **動詞活用練習**: スペイン語動詞の活用練習機能
- 🎯 **学習進捗管理**: 単語ごとの学習状況追跡

## 🛠️ Supabaseセットアップ（クラウドモード用）

クラウドモードで同期機能を使用するには、Supabaseでテーブルをセットアップしてください：

### 1. 環境変数の設定

`.env.local` ファイルを作成し、Supabaseの情報を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. データベーステーブルの作成

以下のいずれかの方法でテーブルを作成してください：

#### 方法A: 簡単セットアップ（推奨）
1. Supabaseダッシュボードの **SQL Editor** を開く
2. `scripts/setup-supabase-tables.sql` の内容をコピー&ペースト
3. **Run** ボタンをクリックして実行

#### 方法B: 完全マイグレーション
1. Supabaseダッシュボードの **SQL Editor** を開く
2. `supabase/migrations/20250110000002_add_missing_tables_fixed.sql` の内容を実行

### 3. 認証の設定

Supabaseダッシュボードの **Authentication** > **Settings** で：
- Email confirmationを有効/無効に設定
- 必要に応じて追加の認証プロバイダーを設定

## 🔧 セットアップ手順

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
