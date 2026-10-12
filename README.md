# Code Rider Garage

> 本リポジトリは閲覧用の公開版です。開発は非公開リポジトリで行っています。

愛車(オートバイ)の整備記録と維持費を記録・管理するモバイルファーストのWebアプリです。

- 運営: デジタルライド(屋号)
- 運営ブランド: [Code Rider](https://code-rider.com)

## 主な機能

- メールアドレスによるサインアップ・ログイン・ログアウト・パスワード変更。二段階認証(認証アプリのTOTPコード、任意加入)にも対応、アカウント設定から有効化(詳細はCLAUDE.md 5.11)
- バイクの登録・一覧表示・編集・削除(メーカー・モデル・排気量・バイクタイプ・アイコンカラー、選択中のタイプ・カラーのプレビュー付き)。現在は1ユーザー1台までの無料枠制限あり。一覧(マイバイク)の各カードには整備・カスタム・保険・給油・ローンを合算した費用合計と、その内訳のドーナツグラフ(PC表示ではカード右側に配置)を表示
- 整備記録(整備日・カテゴリー・走行距離・費用・メモ)の登録・表示・編集・削除。走行距離は新規登録時に現在の走行距離が初期値になり、現在値より小さい値を入力した場合は確認のうえ登録可能
- カテゴリー絞り込み・整備日並び替え(URLクエリで状態を保持)
- 整備サイクル設定(項目ごとの走行距離・期間の交換目安)と、それに連動して自動計算される次回整備予定
- 整備予定カレンダー(期限超過・期限間近・余裕ありをバッジ表示)。バイク詳細の概要画面には期限が近い整備予定・保険更新期限をそれぞれ最大3件表示
- 走行距離のクイック更新(整備記録を伴わない現在値の更新)
- 費用分析: 整備・カスタム・保険・給油・ローンそれぞれの月別費用(棒グラフ)・カテゴリー別費用(円グラフ)に加えて、5つの合計に対する内訳(全体タブ)。月別走行距離の目安グラフも表示
- カスタムパーツ費用の記録(パーツ名・カテゴリー・ブランド・購入店舗・取付日・取付時走行距離・費用)。整備記録とは別テーブル・別画面で管理(将来の「整備・カスタム・保険・ローン」大ジャンル別費用比率集計を見据えた分離。詳細はCLAUDE.md 6.2)。走行距離欄は整備記録と同様に初期値・確認あり
- 保険情報の管理(自賠責保険・任意保険、保険期間・保険料・支払い頻度)と更新期限のバッジ表示。証券番号は預からない方針のため入力欄なし。保険一覧ページ下部に運営者自身のアフィリエイト広告(「広告」表示付き)を掲載
- 給油記録(給油日・走行距離・給油量・費用・満タン給油フラグ・メモ)の登録・表示・編集・削除。満タン給油同士の連続する記録から燃費(km/L)を自動算出(詳細はCLAUDE.md 5.9)
- ローン費用の管理(借入先・借入総額・返済期間・借入日、年利または月々支払額のどちらか一方を入力すればもう一方を自動計算)。残高・完済までの総利息・今日一括返済した場合に節約できる利息を元利均等返済の計算式から算出(実際の返済記録は持たない電卓的な機能)。賞与払い(年2回・月は自由に選択、任意)にも対応(詳細はCLAUDE.md 5.10)
- バイク詳細画面は概要ページ+「整備」「カスタム」「保険」「給油」「ローン」「分析」の6つのサブページに分割(詳細はCLAUDE.md 5.3, 5.9, 5.10)
- Stripe Checkoutによる単発の「応援」決済(300/500/1000円のプリセット)。ダッシュボード・アカウント設定と同じユーザーメニューの`/support`から。誰がいくら応援してくれたかはWebhook経由で`support_payments`に記録(サブスクは未実装、詳細はCLAUDE.md 5.4)
- アカウント設定からの退会(登録データを含めて削除)
- プライバシーポリシー・利用規約ページ

## 技術スタック

- [Next.js](https://nextjs.org/)(App Router)/ TypeScript
- [Tailwind CSS](https://tailwindcss.com/) / [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/)(Auth / PostgreSQL / Row Level Security)
- [Recharts](https://recharts.org/)(費用分析グラフ)
- [Stripe](https://stripe.com/)(単発の「応援」決済のみ。サブスクは未実装)
- [Sentry](https://sentry.io/)(エラー・パフォーマンス監視。無料枠、未設定なら何もしない)
- [Netlify](https://www.netlify.com/)(ホスティング。2026年8月にVercelから移行、詳細はCLAUDE.md 5.8)
- [pnpm](https://pnpm.io/)

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example` を `.env.local` としてコピーし、値を設定してください。

```bash
cp .env.example .env.local
```

| 変数名 | 用途 | 備考 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | ブラウザにも公開される |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabaseの公開(Publishable/anon)キー | ブラウザにも公開される |
| `SUPABASE_SECRET_KEY` | Supabaseの管理者(Secret)キー | **サーバー専用**。`NEXT_PUBLIC_`を付けない。`lib/supabase/admin.ts` 経由で退会処理・Stripe Webhook・ログイン試行回数の管理にのみ使用 |
| `STRIPE_SECRET_KEY` | Stripeのシークレット(またはRestricted)キー | **サーバー専用**。`NEXT_PUBLIC_`を付けない。「応援」決済(`lib/stripe/server.ts`)でのみ使用。Checkout Sessionsの作成権限のみに絞ったRestricted Key(`rk_...`)を推奨 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhookの署名シークレット | **サーバー専用**。`NEXT_PUBLIC_`を付けない。`/api/stripe/webhook`(`app/api/stripe/webhook/route.ts`)でのみ使用し、リクエストが本当にStripeからのものかを検証する |
| `NEXT_PUBLIC_SENTRY_DSN` | SentryプロジェクトのDSN | 秘匿情報ではない(公開される前提のキー)。未設定ならSentryは何もしない |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentryの組織・プロジェクトのスラッグ | ビルド時プラグイン(`withSentryConfig`)を有効化する条件。未設定ならSentryのラップ自体をスキップする |
| `SENTRY_AUTH_TOKEN` | Sentryの認証トークン | **サーバー専用・任意**。ソースマップのアップロード(見やすいスタックトレース用)にのみ使用。無くてもエラー自体は届く |

Supabase関連は [Supabaseダッシュボード](https://supabase.com/dashboard) の Project Settings > API、Stripe関連は [Stripeダッシュボード](https://dashboard.stripe.com/test/apikeys)(まずはテストモード)から取得できます。Webhookの署名シークレットは、StripeダッシュボードでWebhookエンドポイント(`https://<デプロイ先ドメイン>/api/stripe/webhook`)を作成すると発行されます。ローカル開発では [Stripe CLI](https://docs.stripe.com/cli.md) の `stripe listen --forward-to localhost:3000/api/stripe/webhook` でも取得できます。Sentry関連は [sentry.io](https://sentry.io/)(無料のDeveloperプランで十分)でNext.jsプロジェクトを作成すると取得できます。これらのキーは他人に共有したりコミットしたりしないでください。

### 3. データベースのセットアップ

`supabase/migrations/` 配下のSQLを、SupabaseダッシュボードのSQL Editorで**古い順に**実行してください(Supabase CLIをリンクしている場合は `supabase db push` でも可)。全テーブルでRow Level Securityを有効化し、本人のデータのみ読み書きできるポリシーを設定しています。

### 4. ローカル開発サーバーの起動

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

## スクリプト

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバーを起動 |
| `pnpm build` | 本番ビルド |
| `pnpm start` | 本番ビルドを起動 |
| `pnpm lint` | ESLintを実行 |

デプロイ前には `pnpm lint` と `pnpm build` の両方が通ることを確認してください。

## ディレクトリ構成(概要)

```text
app/
  auth/                              サインアップ・ログイン等の認証ページ
  auth/mfa-verify/                   二段階認証チャレンジ画面(ログイン後)
  dashboard/                         ログイン後のバイク一覧(マイバイク)
  motorcycles/                       バイクの登録・編集・詳細(詳細は概要ページ)
  motorcycles/[id]/maintenance/      整備サイクル設定・カレンダー・整備記録一覧
  motorcycles/[id]/maintenance/new/  整備記録の新規登録
  motorcycles/[id]/cycle-settings/new/ 整備サイクル設定の新規登録
  motorcycles/[id]/schedules/new/    整備予定(手動)の新規登録
  motorcycles/[id]/insurance/        保険一覧
  motorcycles/[id]/insurance/new/    保険情報の新規登録
  motorcycles/[id]/custom-parts/     カスタムパーツ一覧
  motorcycles/[id]/custom-parts/new/ カスタムパーツの新規登録
  motorcycles/[id]/fuel/             給油記録一覧
  motorcycles/[id]/fuel/new/         給油記録の新規登録
  motorcycles/[id]/loans/            ローン一覧
  motorcycles/[id]/loans/new/        ローンの新規登録
  motorcycles/[id]/analysis/         費用分析(整備/カスタム/保険/給油/ローン/全体)+走行距離グラフ+燃費グラフ
  motorcycles/[id]/mileage/          走行距離クイック更新のServer Action
  maintenance/[id]/                  整備記録の詳細・編集
  cycle-settings/[id]/edit/          整備サイクル設定の編集
  schedules/[id]/edit/               整備予定(手動)の編集
  insurance/[id]/edit/               保険情報の編集
  custom-parts/[id]/edit/            カスタムパーツの編集
  fuel/[id]/edit/                    給油記録の編集
  loans/[id]/edit/                   ローンの編集
  account/                           アカウント設定(パスワード変更・二段階認証・退会)
  support/                           「応援」決済ページ+Server Action
  api/stripe/webhook/                Stripe Webhook(Route Handler、支援の記録)
  privacy/, terms/                   プライバシーポリシー・利用規約
components/                          UIコンポーネント(components/ui/ はshadcn/ui)
lib/                                 Supabaseクライアント、集計ロジック、共通設定など
supabase/migrations/                 データベースのマイグレーション(適用順に番号付き)
instrumentation.ts, instrumentation-client.ts,
  sentry.server.config.ts, sentry.edge.config.ts  Sentry初期化(未設定なら何もしない)
```

## セキュリティ上の注意

- `SUPABASE_SECRET_KEY` はサーバー専用です。`lib/supabase/admin.ts` は `server-only` パッケージによりClient Componentからのimportをビルド時に禁止しており、退会処理(`app/account/actions.ts`)・Stripe Webhookハンドラ(`app/api/stripe/webhook/route.ts`、下記)・ログイン試行回数の管理(`app/auth/login/actions.ts`)以外では使用していません。`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` も同様に `lib/stripe/server.ts` / Webhookハンドラが `server-only` でガードしており、「応援」決済関連以外では使用していません。
- 全テーブル(`motorcycles`, `maintenance_records`, `maintenance_cycle_settings`, `maintenance_schedules`, `insurance_policies`, `custom_parts`, `fuel_records`, `loans`, `support_payments`)でRow Level Securityを有効化し、`auth.uid()` に基づくポリシーで本人以外のデータへのアクセスを防いでいます。Server Action側でも所有権を再確認する二重防御を行っています。整備記録と整備予定を同時に整合させる更新は、RLSを迂回しない`SECURITY INVOKER`のPostgres関数(`create_maintenance_record_with_schedule` など)で1トランザクションにまとめています。
- 二段階認証はページ遷移(`lib/supabase/proxy.ts`)とRLSの二層で強制しています。二段階認証を登録済みのユーザーは、認証コードの入力を済ませたセッション(aal2)でなければ、REST APIを直接呼んでも全テーブルにアクセスできません(`supabase/migrations/20261012100000_enforce_mfa_aal2_rls.sql`)。
- パスワードを5回連続で間違えると15分間ログインをロックし、登録メールアドレスへパスワード再設定メールを送ります(送信は1時間に1回まで)。試行回数はサーバー側で管理しています。
- パスワード再設定メールや決済後の戻り先など外部に渡すURLは、偽装可能なリクエストヘッダー(Host等)ではなくビルド時に確定する固定URL(`lib/site-url.ts`)から組み立てています。認証後のリダイレクト先も同一オリジンのパスのみに制限しています。
- `support_payments`(応援決済の記録)は`select`ポリシーのみで、`authenticated`ロールからのinsert/update/deleteポリシーは存在しません。書き込みは`/api/stripe/webhook`がStripeの署名を検証したうえで管理者クライアント経由で行う一方通行の設計です。Stripeからの未認証Webhookリクエストがログイン画面へリダイレクトされないよう、`lib/supabase/proxy.ts`で`/api/stripe/webhook`のみ認証チェックの対象外にしています。
- `.env.local` はコミットしないでください(`.gitignore`で除外済みです)。
- Sentryは`NEXT_PUBLIC_SENTRY_DSN`が設定されていても、`NODE_ENV=production`のとき(=Netlify上の本番実行時)のみイベントを送信します。ローカル開発中のエラーはSentryに送られません(無料枠を温存するための意図的な設計)。

## デプロイ

Netlifyへのデプロイを想定しています(GitHubリポジトリと連携すると、本番ブランチへのpushで自動ビルド・デプロイされます)。デプロイ先の環境変数にも上記の環境変数(`SUPABASE_SECRET_KEY`・`STRIPE_SECRET_KEY`・Sentry関連を含む)を設定してください。本番公開前にStripeを本番(Live)モードに切り替え、Live用のキーに差し替えてください。

Netlify固有の注意点(詳細はCLAUDE.md 5.8):

- サイトの **Visitor access(Project visibility)** は既定で非公開("Team protection"等)になっている場合があるため、**Public** に設定しないと一般ユーザーがアクセスできません
- Turbopackのビルドキャッシュ内でサーバー専用シークレット(`STRIPE_SECRET_KEY`等)が誤検知されビルドが失敗する場合、`SECRETS_SCAN_OMIT_PATHS=.netlify/.next/cache/**` を環境変数に追加してください(このリポジトリでは設定済み)
