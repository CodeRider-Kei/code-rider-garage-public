import Link from "next/link";

import { ExternalLink } from "@/components/external-link";
import {
  BLOG_URL,
  BRAND_NAME,
  ENACTED_DATE,
  OPERATOR_NAME,
  SERVICE_NAME,
} from "@/lib/site-config";

export default function TermsOfServicePage() {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">利用規約</h1>

      <div className="flex flex-col gap-8 text-sm leading-relaxed">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第1条(適用)</h2>
          <p>
            本規約は、{SERVICE_NAME}(以下「本サービス」といいます)の利用条件を定めるものです。
            利用者は、本サービスを利用することにより、本規約に同意したものとみなします。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第2条(サービス内容)</h2>
          <p>
            本サービスは、{OPERATOR_NAME}(屋号。以下「運営者」といいます)が個人で運営する、
            利用者が自己の所有するオートバイの基本情報および整備記録を記録・管理するためのツールです。
            運営者は「<ExternalLink href={BLOG_URL}>{BRAND_NAME}</ExternalLink>
            」のブランド名でバイク用品ブログも運営しており、運営者について詳しくは同ブログをご参照ください。
            なお、同ブログの記事内容は本サービスとは別に提供されるものであり、本規約の適用対象ではありません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第3条(利用登録と認証情報の管理)</h2>
          <p>
            利用希望者は、真実かつ正確な情報を用いてアカウント登録を行うものとします。
            利用者は自己の責任においてアカウント情報(メールアドレス・パスワード)を管理するものとし、
            第三者による不正利用について、運営者は利用者の故意・重過失がある場合を除き責任を負いません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第4条(禁止事項)</h2>
          <p>利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>法令または公序良俗に違反する行為</li>
            <li>他の利用者になりすます行為、または他人の情報を無断で登録する行為</li>
            <li>本サービスのサーバーやネットワークに過度な負荷をかける行為</li>
            <li>本サービスへの不正アクセス、または脆弱性を探索する行為</li>
            <li>本サービスのソースコード等を許可なく複製・改変・リバースエンジニアリングする行為</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第5条(登録情報の管理)</h2>
          <p>
            利用者が本サービスに登録するバイク情報・整備記録の内容の正確性については、
            利用者自身が責任を負うものとします。本サービスは登録内容の正確性を検証・保証しません。
          </p>
          <p>
            利用者は、特に重要な記録については、本サービス上のデータのみに依存せず、
            自己の責任で別途控えを保存することを推奨します。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第6条(サービスの変更・中断・終了)</h2>
          <p>
            運営者は、利用者への事前の通知なく、本サービスの内容を変更し、
            または本サービスの提供を中断・終了することがあります。これにより利用者に
            生じた損害について、運営者は故意または重過失による場合を除き責任を負いません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第7条(免責事項)</h2>
          <p>
            本サービスは現状有姿で提供され、データの消失、破損、またはサービスの中断等により
            利用者に生じた損害について、運営者は故意または重過失による場合を除き責任を負いません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第8条(専門的判断の代替でないこと)</h2>
          <p>
            本サービスに記録される整備記録および各種集計は、あくまで利用者自身の記録・管理を
            目的とするものであり、整備士、バイクメーカー等の専門家・専門機関による点検・整備の判断を
            代替するものではありません。法定点検・車検その他の安全に関わる整備については、
            必ず専門の整備事業者等にご確認ください。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第9条(知的財産権)</h2>
          <p>
            本サービスに関する著作権その他の知的財産権は、運営者または正当な権利を有する第三者に帰属します。
            利用者が入力したバイク情報・整備記録の権利は利用者に帰属しますが、
            利用者は本サービスの提供に必要な範囲で運営者がこれを利用することを許諾するものとします。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第10条(退会とデータの削除)</h2>
          <p>
            利用者は、本サービスの「アカウント設定」画面からいつでも退会(アカウント削除)することができます。
            退会により、登録した全てのバイク情報・整備記録・アカウント情報は削除され、復元することはできません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第11条(利用制限)</h2>
          <p>
            運営者は、利用者が本規約に違反した場合その他運営上必要と判断した場合には、
            事前の通知なく当該利用者による本サービスの利用を制限し、またはアカウントを停止することがあります。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第12条(規約の変更)</h2>
          <p>
            運営者は、必要と判断した場合には、利用者への通知の上、本規約を変更することができるものとします。
            変更後の規約は、本サービス上に掲示した時点から効力を生じるものとします。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">第13条(準拠法・管轄裁判所)</h2>
          <p>
            本規約の解釈にあたっては日本法を準拠法とします。本サービスに関して利用者と運営者との間で
            紛争が生じた場合には、法令により管轄権を有する日本の裁判所を管轄裁判所とします。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <p>制定日: {ENACTED_DATE}</p>
        </section>
      </div>

      <Link href="/" className="text-sm text-center underline underline-offset-4">
        トップページに戻る
      </Link>
    </div>
  );
}
