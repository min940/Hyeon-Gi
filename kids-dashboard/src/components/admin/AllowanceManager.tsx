import { useEffect, useState } from "react";
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
  main: "👛 메인지갑",
  second: "🐷 세컨드지갑",
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
        <BalanceBox label="메인지갑" balance={mainBalance} color="bg-violet-100 text-violet-700" />
        <BalanceBox label="세컨드지갑" balance={secondBalance} color="bg-teal-100 text-teal-700" />
      </div>

      {/* 입력 폼 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={wallet}
            onChange={(e) => setWallet(e.target.value as Wallet)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-lg bg-white"
          >
            <option value="main">👛 메인지갑</option>
            <option value="second">🐷 세컨드지갑</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("in")}
              className={`rounded-lg py-2 font-bold ${type === "in" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              입금
            </button>
            <button
              type="button"
              onClick={() => setType("out")}
              className={`rounded-lg py-2 font-bold ${type === "out" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}
            >
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
          className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
        />
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (예: 용돈, 군것질)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
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
                  className="text-slate-300 hover:text-rose-500 px-1"
                  aria-label="삭제"
                >
                  ✕
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
  label,
  balance,
  color,
}: {
  label: string;
  balance: number;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums mt-1">
        {formatNumber(balance)}
        <span className="text-base ml-1">원</span>
      </p>
    </div>
  );
}
