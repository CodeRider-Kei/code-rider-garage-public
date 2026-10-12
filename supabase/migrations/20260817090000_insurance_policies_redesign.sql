-- 保険フォームの見直し:
-- 1. 証券番号(policy_number)を廃止する。ユーザーから「証券番号を預かるのは不安」との
--    フィードバックがあり、保険会社・保険種別・保険期間・保険料が分かれば用は足りるため、
--    個人情報寄りの識別子はそもそも保持しない方針に変更する。
-- 2. 支払い頻度(payment_frequency: 月払い/年払い)を追加する。既存のpremium_costは
--    「選択した支払い頻度あたりの金額」として扱う(月払いなら月額、年払いなら年額)。
--    将来的にカスタム・整備費用と合わせた費用換算をする際の元データとして使う想定
--    (集計ロジック自体は今回実装しない)。
--
-- insurance_policiesは本番に適用済みのため、作成時のマイグレーション
-- (20260816120000, 20260816122000)は変更せず、ALTERで追記する。

alter table public.insurance_policies
  drop constraint if exists insurance_policies_policy_number_length;

alter table public.insurance_policies
  drop column if exists policy_number;

alter table public.insurance_policies
  add column payment_frequency text
    check (payment_frequency in ('monthly', 'yearly'));

-- 既存行(本番投入済みの可能性があるため)は月払いとして扱う暫定値で埋めてからNOT NULL化する。
update public.insurance_policies
set payment_frequency = 'monthly'
where payment_frequency is null;

alter table public.insurance_policies
  alter column payment_frequency set not null;
