import Link from "next/link";

import { ExternalLink } from "@/components/external-link";
import {
  BLOG_NAME,
  BLOG_URL,
  BRAND_NAME,
  CONTACT_EMAIL,
  ENACTED_DATE,
  OPERATOR_NAME,
  SERVICE_NAME,
  X_HANDLE,
  X_URL,
} from "@/lib/site-config";

export default function PrivacyPolicyPage() {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">プライバシーポリシー</h1>

      <div className="flex flex-col gap-8 text-sm leading-relaxed">
        <section className="flex flex-col gap-2">
          <p>
            {SERVICE_NAME}(以下「本サービス」といいます)は、{OPERATOR_NAME}
            (屋号。以下「運営者」といいます)が個人で運営するオートバイ整備記録管理サービスです。
            運営者は、利用者の個人情報を適切に取り扱うため、
            以下のとおりプライバシーポリシー(以下「本ポリシー」といいます)を定めます。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">1. 取得する情報</h2>
          <p>本サービスは、利用に際して以下の情報を取得します。</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>メールアドレス(アカウント登録・認証のため)</li>
            <li>Supabase Authが発行するユーザーID</li>
            <li>利用者が登録したバイク情報(表示名、メーカー、モデル、現在の走行距離)</li>
            <li>利用者が登録した整備記録(整備日、カテゴリー、走行距離、費用、メモ)</li>
            <li>利用者が登録した整備予定(整備項目名、カテゴリー、次回予定日、メモ)</li>
            <li>
              アクセス日時、ブラウザ情報、IPアドレスなど、サービス基盤(Netlify、Supabase)が
              自動的に記録する技術情報およびエラーログ
            </li>
            <li>お問い合わせいただいた際に、メール本文等でご提供いただいた情報</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">2. 利用目的</h2>
          <p>取得した情報は、以下の目的のために利用します。</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>本人確認および認証のため</li>
            <li>本サービスの提供、維持、改善のため</li>
            <li>登録データ(バイク情報・整備記録・整備予定)の保存、表示、編集、削除のため</li>
            <li>不具合の調査、不正利用の防止、セキュリティ対応のため</li>
            <li>お問い合わせへの対応のため</li>
            <li>本サービスに関する重要な変更をお知らせするため</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">3. 利用する外部サービス</h2>
          <p>本サービスは、以下の外部サービスを利用してデータを保管・処理します。</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Supabase(認証基盤、データベース)</li>
            <li>Netlify(アプリケーションのホスティング)</li>
          </ul>
          <p>
            これらのサービスにおける情報の取り扱いは、各社が定めるプライバシーポリシー等にも従います。
          </p>
          <p>
            また、一部の画面では運営者自身が参加するアフィリエイトプログラム
            (<ExternalLink href="https://www.a8.net/">A8.net</ExternalLink>)を通じた広告を、
            「広告」の表示とともに掲載しています。広告の表示・クリックに伴い、
            A8.netにより閲覧環境等の情報が効果測定目的で収集される場合があります。
            A8.netにおける情報の取り扱いについては、同社が定めるプライバシーポリシーをご確認ください。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">4. 運営者によるデータの確認について</h2>
          <p>
            運営者は、本サービスの保守や不具合対応、お問い合わせへの対応など、
            運営上必要な場合に限り、必要最小限の範囲で保存されたデータを確認することがあります。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">5. 第三者提供について</h2>
          <p>
            運営者は、法令に基づく場合を除き、利用者の同意なく取得した情報を第三者に提供しません。
            ただし、前項に定める外部サービスへのデータの預託は、本ポリシーにおける第三者提供には該当しないものとします。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">6. 安全管理措置</h2>
          <p>
            本サービスは、データベースへのアクセス制御(Row Level Security)により、
            利用者本人以外が他の利用者のデータへアクセスできないよう技術的な対策を講じています。
            通信は暗号化(HTTPS)された経路で行われます。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">7. 保存期間</h2>
          <p>
            取得した情報は、アカウントが存在する間保存します。ただし、外部サービスのバックアップ等により、
            一定期間データが残存する場合があります。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">8. 退会について</h2>
          <p>
            利用者は、本サービスの「アカウント設定」画面からいつでも退会(アカウント削除)することができます。
            退会すると、登録したバイク情報・整備記録・整備予定を含むすべての関連データおよびアカウント情報が削除され、復元できません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">9. 開示・訂正・削除・利用停止への対応</h2>
          <p>
            登録したバイク情報・整備記録・整備予定については、利用者自身が本サービスの画面上でいつでも
            確認・訂正・削除できます。アカウントごと削除したい場合は前項の退会機能をご利用ください。
            その他、保有する個人情報の開示・訂正・削除・利用停止等をご希望の場合は、
            下記お問い合わせ先までご連絡ください。運営者は、本人確認のうえ、法令に従い合理的な範囲で対応します。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">10. 運営者情報・お問い合わせ先</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>運営者: {OPERATOR_NAME}(屋号)</li>
            <li>運営ブランド: {BRAND_NAME}</li>
            <li>
              運営ブログ: <ExternalLink href={BLOG_URL}>{BLOG_NAME}</ExternalLink>
            </li>
            <li>
              X(旧Twitter): <ExternalLink href={X_URL}>{X_HANDLE}</ExternalLink>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            上記の運営ブログ・Xアカウントは運営者情報としての掲載であり、お問い合わせ窓口ではありません。
          </p>
          <p>本ポリシーおよび本サービスに関するお問い合わせは、以下のメールアドレスまでご連絡ください。</p>
          <p>お問い合わせ: {CONTACT_EMAIL.replace("@", " [at] ")}</p>
          <p className="text-xs text-muted-foreground">
            ※ [at] を @ に置き換えてください。(迷惑メール対策のため画像・リンクではなくテキストで表記しています)
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">11. 本ポリシーの改定</h2>
          <p>
            本ポリシーの内容は、必要に応じて変更されることがあります。重要な変更を行う場合は、
            本サービス上での告知その他適切な方法により利用者に周知します。
          </p>
          <p>制定日: {ENACTED_DATE}</p>
        </section>
      </div>

      <Link href="/" className="text-sm text-center underline underline-offset-4">
        トップページに戻る
      </Link>
    </div>
  );
}
