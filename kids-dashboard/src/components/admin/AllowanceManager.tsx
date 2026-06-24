import { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  PiggyBank,
  Wallet as WalletIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  subscribeTransactions,
  addTransaction,
  deleteTransaction,
  walletBalance,
} from "../../lib/data";
import { formatNumber, todayId } from "../../lib/dates";
import type { Transaction, TxType, Wallet } from "../../types";
import type { LogLevel } from "../../hooks/useLog";

const WALLET_LABEL: Record<Wallet, string> = {
  main: "메인지갑",
  second: "세컨드지갑",
};

export default function AllowanceManager({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [wallet, setWallet] = useState<Wallet>("main");
  const [type, setType] = useState<TxType>("in");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeTransactions(setTxs), []);

  const mainBalance = walletBalance(txs, "main");
  const secondBalance = walletBalance(txs, "second");

  async function handleAdd() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      log("ERROR", "금액을 올바르게 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      await addTransaction({
        wallet,
        type,
        amount: amt,
        memo: memo.trim(),
        date: todayId(),
      });
      log(
        "SUCCESS",
        `${WALLET_LABEL[wallet]} ${type === "in" ? "입금" : "출금"} ${formatNumber(amt)}원`,
      );
      setAmount("");
      setMemo("");
    } catch (e) {
      log("ERROR", `용돈 저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(tx: Transaction) {
    if (!tx.id) return;
    if (!confirm("이 거래를 삭제할까요?")) return;
    try {
      await deleteTransaction(tx.id);
      log("INFO", `거래 삭제: ${formatNumber(tx.amount)}원`);
    } catch (e) {
      log("ERROR", `삭제 실패: ${(e as Error).message}`);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 잔액 */}
      <div className="grid grid-cols-2 gap-3">
        <BalanceBox
          icon={WalletIcon}
          label="메인지갑"
          balance={mainBalance}
          color="border-sky-200 bg-sky-50 text-sky-700"
        />
        <BalanceBox
          icon={PiggyBank}
          label="세컨드지갑"
          balance={secondBalance}
          color="border-emerald-200 bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* 입력 폼 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={wallet}
            onChange={(e) => setWallet(e.target.value as Wallet)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-lg outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          >
            <option value="main">메인지갑</option>
            <option value="second">세컨드지갑</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("in")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 font-bold transition ${type === "in" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              <ArrowDownCircle size={17} strokeWidth={2.4} />
              입금
            </button>
            <button
              type="button"
              onClick={() => setType("out")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 font-bold transition ${type === "out" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              <ArrowUpCircle size={17} strokeWidth={2.4} />
              출금
            </button>
          </div>
        </div>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="금액 (원)"
          className="rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (예: 용돈, 군것질)"
          className="rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 font-bold text-white transition hover:bg-sky-600 disabled:opacity-50"
        >
          <Plus size={18} strokeWidth={2.6} />
          {busy ? "저장 중…" : "거래 추가"}
        </button>
      </div>

      {/* 최근 거래 내역 */}
      <div>
        <h3 className="font-bold text-slate-600 mb-2">최근 거래 내역</h3>
        {txs.length === 0 ? (
          <p className="text-slate-400 text-center py-4">거래 내역이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {txs.slice(0, 30).map((tx) => (
              <li
                key={tx.id}
                className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-3 py-2"
              >
                <span className="text-sm text-slate-400 w-20 flex-shrink-0">
                  {tx.date.slice(5)}
                </span>
                <span className="text-sm text-slate-500 w-24 flex-shrink-0">
                  {WALLET_LABEL[tx.wallet]}
                </span>
                <span className="flex-1 truncate text-slate-700">
                  {tx.memo || "—"}
                </span>
                <span
                  className={`font-bold tabular-nums ${tx.type === "in" ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {tx.type === "in" ? "+" : "-"}
                  {formatNumber(tx.amount)}
                </span>
                <button
                  onClick={() => handleDelete(tx)}
                  className="rounded-lg p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  aria-label="삭제"
                >
                  <X size={16} strokeWidth={2.6} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BalanceBox({
  icon: Icon,
  label,
  balance,
  color,
}: {
  icon: LucideIcon;
  label: string;
  balance: number;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${color}`}>
      <p className="flex items-center gap-2 text-sm font-bold">
        <Icon size={18} strokeWidth={2.4} />
        {label}
      </p>
      <p className="text-2xl font-extrabold tabular-nums mt-1">
        {formatNumber(balance)}
        <span className="text-base ml-1">원</span>
      </p>
    </div>
  );
}
