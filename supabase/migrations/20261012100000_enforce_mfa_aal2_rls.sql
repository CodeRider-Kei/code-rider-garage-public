-- 二段階認証(TOTP MFA)をRLSでも強制する。
--
-- これまでMFAの強制は lib/supabase/proxy.ts(アプリのページ遷移)だけで行っており、
-- MFA登録済みユーザーのaal1(パスワード認証のみ)のアクセストークンでも、
-- Supabase REST APIを直接呼べばデータを読み書きできた。
-- ここでは各アプリテーブルに RESTRICTIVE ポリシーを追加し、
-- 「検証済みMFAファクターを持つユーザーはaal2のセッションでなければ一切アクセス不可」
-- をDB側でも保証する(MFA未登録のユーザーは従来通りaal1で利用可能)。
--
-- RESTRICTIVE ポリシーは既存のPERMISSIVEポリシー(本人の行のみ許可)とAND条件で
-- 評価されるため、既存ポリシーには手を加えない。
--
-- Supabase公式ドキュメントの例はポリシー内で auth.mfa_factors を直接参照するが、
-- authenticated ロールの auth.mfa_factors への権限はドキュメント上保証されておらず、
-- 権限不足だと全クエリが permission denied で失敗する。そのため判定を
-- SECURITY DEFINER 関数に切り出す。関数はAPI(PostgREST)に公開されない
-- private スキーマに置き、呼び出し元本人(auth.uid())のファクター有無しか見ないため、
-- 他ユーザーの情報は漏れない。
--
-- 対象外: login_lockouts(ポリシー0件でanon/authenticatedから元々アクセス不可)。
-- create_/update_maintenance_record_with_schedule は SECURITY INVOKER のため、
-- 内部のテーブルアクセスにこのポリシーがそのまま適用される。

create schema if not exists private;

create or replace function private.mfa_aal_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    or not exists (
      select 1
      from auth.mfa_factors
      where user_id = auth.uid()
        and status = 'verified'
    );
$$;

revoke all on function private.mfa_aal_satisfied() from public;
grant usage on schema private to authenticated;
grant execute on function private.mfa_aal_satisfied() to authenticated;

-- (select ...) で包むことで、行ごとではなくクエリごとに1回だけ評価させる
-- (既存ポリシーの (select auth.uid()) と同じ最適化)。
do $$
declare
  t text;
begin
  foreach t in array array[
    'motorcycles',
    'maintenance_records',
    'maintenance_cycle_settings',
    'maintenance_schedules',
    'insurance_policies',
    'custom_parts',
    'support_payments',
    'fuel_records',
    'loans'
  ]
  loop
    execute format(
      'create policy "Require aal2 when MFA is enrolled" on public.%I '
      'as restrictive for all to authenticated '
      'using ((select private.mfa_aal_satisfied())) '
      'with check ((select private.mfa_aal_satisfied()))',
      t
    );
  end loop;
end
$$;
