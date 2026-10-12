-- ログイン失敗によるアカウントロック用: login_lockouts テーブルの作成。
--
-- パスワード誤入力の回数をクライアント側で数えると攻撃者に容易に迂回される
-- ため、サーバー側(app/auth/login/actions.ts のServer Action)でこの
-- テーブルを使って管理する。ログイン前(未認証)のメールアドレスをキーに
-- 扱うテーブルであり、ユーザーセッションが存在しないタイミングで読み書き
-- される。そのためRLSは有効化した上でポリシーを一切作成せず、
-- anon/authenticatedいずれのロールからもアクセスできないようにする。
-- 読み書きはRLSをバイパスするAdminクライアント(lib/supabase/admin.ts)
-- からのみ行う(support_payments と同様の「クライアントからは触らせない」
-- パターンだが、selectポリシーすら与えない点でより厳格)。

create table public.login_lockouts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz,
  last_reset_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.login_lockouts enable row level security;

-- set_updated_at() は motorcycles 用マイグレーション(20260813140000)で
-- 既に作成済みの汎用トリガー関数を再利用する。
create trigger login_lockouts_set_updated_at
before update on public.login_lockouts
for each row
execute function public.set_updated_at();
