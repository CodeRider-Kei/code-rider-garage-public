-- 「応援」決済(Stripe Checkout単発決済)の記録。
--
-- 元々は「何もfulfillするものがないので永続化不要」という判断だったが、
-- 「誰がいくら応援してくれたか知りたい」という要望により記録するテーブルを追加する。
-- クライアントから直接書き込ませず、Webhookハンドラ(app/api/stripe/webhook/route.ts)が
-- 管理者クライアント(RLSをバイパス)で checkout.session.completed /
-- checkout.session.async_payment_succeeded を受けて書き込む。
-- stripe_checkout_session_id にUNIQUE制約を付け、Webhookの再送(at-least-once配信)による
-- 重複記録を防ぐ(upsertでconflictを無視する)。

create table public.support_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  currency text not null default 'jpy',
  stripe_checkout_session_id text not null unique,
  created_at timestamptz not null default now()
);

create index support_payments_user_id_idx
on public.support_payments(user_id);

alter table public.support_payments enable row level security;

-- 本人は自分の応援履歴を閲覧できる。insert/update/deleteのポリシーは意図的に作らない
-- (書き込みはWebhookの管理者クライアント経由のみとし、クライアントから改ざん・偽装できないようにする)。
create policy "Users can select own support payments"
on public.support_payments
for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.support_payments to authenticated;
