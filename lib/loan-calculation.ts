import { getTodayDateString } from "./maintenance-schedule";

/**
 * 開始日から基準日までの暦月の差分(日にちは無視、YYYY-MM同士の差)。
 * マイナス(まだ開始日前)や返済期間超過は呼び出し側でクランプする。
 */
export function monthsElapsed(startDate: string, todayDateStr: string): number {
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [todayYear, todayMonth] = todayDateStr.split("-").map(Number);
  return (todayYear - startYear) * 12 + (todayMonth - startMonth);
}

/**
 * 返済スケジュールの各月(1〜termMonths、開始月を1とする)が、指定した賞与月
 * (1〜12)のどちらかに該当するかを表す真偽値配列を返す。賞与払いを使わない
 * (bonusMonth1/bonusMonth2がnull)場合は全てfalseの配列になる。
 */
export function getBonusMonthFlags(
  startDate: string,
  termMonths: number,
  bonusMonth1: number | null,
  bonusMonth2: number | null,
): boolean[] {
  const [, startMonth] = startDate.split("-").map(Number);
  const flags: boolean[] = [];
  for (let i = 0; i < termMonths; i++) {
    const calendarMonth = ((startMonth - 1 + i) % 12) + 1;
    flags.push(calendarMonth === bonusMonth1 || calendarMonth === bonusMonth2);
  }
  return flags;
}

/**
 * 元利均等返済の月々支払額(賞与払いにも対応)。bonusMonthFlagsでtrueの月は
 * 月々支払額に加えてbonusPaymentも上乗せされる前提で、termMonths経過後に
 * 残高がちょうど0になる月々支払額を閉じた式で求める。
 * 賞与払いなし(bonusPayment=0, bonusMonthFlags=[])のときは従来どおりの
 * 単純な元利均等返済の式と完全に一致する。
 */
export function monthlyPaymentForRate(
  principal: number,
  monthlyRate: number,
  termMonths: number,
  bonusPayment = 0,
  bonusMonthFlags: boolean[] = [],
): number {
  const bonusCount = bonusMonthFlags.filter(Boolean).length;

  if (monthlyRate === 0) {
    return (principal - bonusPayment * bonusCount) / termMonths;
  }

  const factor = Math.pow(1 + monthlyRate, termMonths);
  const annuityFactor = (factor - 1) / monthlyRate;

  // 賞与払い分の将来価値(各賞与月に払う金額を、返済完了時点まで複利で
  // 運用したとみなした場合の合計)。元金の将来価値からこれを差し引いてから
  // 年金現価係数で割ることで、月々の均等返済額を求める。
  let bonusFutureValue = 0;
  bonusMonthFlags.forEach((isBonus, index) => {
    if (isBonus) {
      const k = index + 1; // 1-indexed month
      bonusFutureValue += Math.pow(1 + monthlyRate, termMonths - k);
    }
  });

  return (principal * factor - bonusPayment * bonusFutureValue) / annuityFactor;
}

/**
 * 月々支払額(+賞与払い)から月利を逆算する。元利均等返済の式は金利について
 * 解析的に解けないため、二分探索で数値的に求める。monthlyPaymentForRateは
 * 金利について単調増加なので二分探索が使える(月利0%〜100%の範囲、100回反復で収束)。
 */
export function solveMonthlyRate(
  principal: number,
  monthlyPayment: number,
  termMonths: number,
  bonusPayment = 0,
  bonusMonthFlags: boolean[] = [],
): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const payment = monthlyPaymentForRate(
      principal,
      mid,
      termMonths,
      bonusPayment,
      bonusMonthFlags,
    );
    if (payment > monthlyPayment) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

export type AmortizationEntry = {
  month: number;
  interest: number;
  principal: number;
  balance: number;
};

/**
 * 1ヶ月ごとの利息・元金・残高の配列を返す。賞与月に該当する月は
 * monthlyPaymentにbonusPaymentを上乗せしてから利息・元金を按分する。
 * 最終回は端数調整のため残高をそのまま元金に充当し、残高がちょうど0円で
 * 終わるようにする。
 */
export function buildAmortizationSchedule(
  principal: number,
  monthlyRate: number,
  monthlyPayment: number,
  termMonths: number,
  bonusPayment = 0,
  bonusMonthFlags: boolean[] = [],
): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];
  let balance = principal;

  for (let month = 1; month <= termMonths; month++) {
    const payment = monthlyPayment + (bonusMonthFlags[month - 1] ? bonusPayment : 0);
    const interest = balance * monthlyRate;
    let principalPortion = payment - interest;
    if (month === termMonths) {
      principalPortion = balance;
    }
    balance = Math.max(0, balance - principalPortion);
    schedule.push({ month, interest, principal: principalPortion, balance });
  }

  return schedule;
}

export type LoanSummary = {
  monthlyPayment: number;
  annualInterestRatePercent: number;
  bonusPaymentAmount: number | null;
  bonusMonth1: number | null;
  bonusMonth2: number | null;
  monthsElapsed: number;
  remainingMonths: number;
  remainingBalance: number;
  totalInterest: number;
  /** 今日一括返済した場合に節約できる利息(=残り全期間分の利息の合計) */
  remainingInterest: number;
  isPaidOff: boolean;
};

/**
 * ローンの契約条件から、月々支払額・残高・利息などを計算する。
 * annual_interest_rateとmonthly_paymentはどちらか一方がnullである前提
 * (DB制約 loans_rate_xor_payment で保証済み)。bonus_payment_amount/
 * bonus_month_1/bonus_month_2は3つともnull(賞与払いなし)か3つとも
 * 非null(賞与払いあり)である前提(DB制約 loans_bonus_fields_consistent で保証済み)。
 */
export function summarizeLoan(
  loan: {
    principal: number;
    annual_interest_rate: number | null;
    monthly_payment: number | null;
    term_months: number;
    start_date: string;
    bonus_payment_amount: number | null;
    bonus_month_1: number | null;
    bonus_month_2: number | null;
  },
  todayDateStr: string = getTodayDateString(),
): LoanSummary {
  const bonusPayment = loan.bonus_payment_amount ?? 0;
  const bonusMonthFlags = getBonusMonthFlags(
    loan.start_date,
    loan.term_months,
    loan.bonus_month_1,
    loan.bonus_month_2,
  );

  const monthlyRate =
    loan.annual_interest_rate !== null
      ? loan.annual_interest_rate / 100 / 12
      : solveMonthlyRate(
          loan.principal,
          loan.monthly_payment!,
          loan.term_months,
          bonusPayment,
          bonusMonthFlags,
        );

  const monthlyPayment =
    loan.monthly_payment ??
    monthlyPaymentForRate(loan.principal, monthlyRate, loan.term_months, bonusPayment, bonusMonthFlags);

  const schedule = buildAmortizationSchedule(
    loan.principal,
    monthlyRate,
    monthlyPayment,
    loan.term_months,
    bonusPayment,
    bonusMonthFlags,
  );

  const elapsed = Math.min(
    Math.max(monthsElapsed(loan.start_date, todayDateStr), 0),
    loan.term_months,
  );
  const remainingBalance = elapsed === 0 ? loan.principal : schedule[elapsed - 1].balance;
  const totalInterest = schedule.reduce((sum, entry) => sum + entry.interest, 0);
  const remainingInterest = schedule
    .slice(elapsed)
    .reduce((sum, entry) => sum + entry.interest, 0);

  return {
    monthlyPayment,
    annualInterestRatePercent: monthlyRate * 12 * 100,
    bonusPaymentAmount: loan.bonus_payment_amount,
    bonusMonth1: loan.bonus_month_1,
    bonusMonth2: loan.bonus_month_2,
    monthsElapsed: elapsed,
    remainingMonths: loan.term_months - elapsed,
    remainingBalance,
    totalInterest,
    remainingInterest,
    isPaidOff: elapsed >= loan.term_months,
  };
}

/**
 * 開始月から経過月数分だけ、{date: "YYYY-MM-01", cost}を生成する
 * (賞与月に該当する月はcostにbonusPaymentも加算する)。未来の月は含めない
 * (整備/カスタム/保険/給油の「全体」集計はすべて「すでに発生した費用」の
 * 合計であり、ローンもそれに合わせて支払い済み分だけを費用として扱う)。
 * この配列は lib/cost-analysis.ts の aggregateMonthlyCost にそのまま渡せる。
 */
/**
 * ローンの「支払い済み累計額」(=経過月数分の月々支払額+賞与払いの合計)。
 * ダッシュボード・バイク詳細・費用分析ページで同じ計算が必要になるため、
 * summarizeLoan + elapsedMonthlyPaymentEntries の呼び出しをここに集約する。
 */
export function getLoanCostToDate(
  loan: {
    principal: number;
    annual_interest_rate: number | null;
    monthly_payment: number | null;
    term_months: number;
    start_date: string;
    bonus_payment_amount: number | null;
    bonus_month_1: number | null;
    bonus_month_2: number | null;
  },
  todayDateStr: string = getTodayDateString(),
): number {
  const summary = summarizeLoan(loan, todayDateStr);
  const entries = elapsedMonthlyPaymentEntries(loan, summary.monthlyPayment, todayDateStr);
  return entries.reduce((sum, entry) => sum + entry.cost, 0);
}

export function elapsedMonthlyPaymentEntries(
  loan: {
    start_date: string;
    term_months: number;
    bonus_payment_amount: number | null;
    bonus_month_1: number | null;
    bonus_month_2: number | null;
  },
  monthlyPayment: number,
  todayDateStr: string = getTodayDateString(),
): { date: string; cost: number }[] {
  const elapsed = Math.min(
    Math.max(monthsElapsed(loan.start_date, todayDateStr), 0),
    loan.term_months,
  );
  const bonusMonthFlags = getBonusMonthFlags(
    loan.start_date,
    loan.term_months,
    loan.bonus_month_1,
    loan.bonus_month_2,
  );
  const bonusPayment = loan.bonus_payment_amount ?? 0;
  const [startYear, startMonth] = loan.start_date.split("-").map(Number);

  const entries: { date: string; cost: number }[] = [];
  for (let i = 0; i < elapsed; i++) {
    const d = new Date(Date.UTC(startYear, startMonth - 1 + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const cost = monthlyPayment + (bonusMonthFlags[i] ? bonusPayment : 0);
    entries.push({ date: key, cost });
  }
  return entries;
}
