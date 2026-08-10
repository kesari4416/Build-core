import { useQuery } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import api from "../../../api/client";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtCr = (n) => `${n < 0 ? "−" : ""}₹${(Math.abs(n || 0) / 10000000).toFixed(2)} Cr`;

const Card = ({ label, value, sub, icon: Icon, accent, testId }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-5" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">{label}</span>
      <Icon size={16} strokeWidth={2.5} className={accent} />
    </div>
    <div className={`font-heading font-bold text-3xl mt-3 leading-none ${accent}`}>{value}</div>
    {sub && <div className="text-[10px] text-zinc-500 mt-2 tracking-wide">{sub}</div>}
  </div>
);

export const ProjectBalanceSheetTab = ({ projectId }) => {
  const { data: bs } = useQuery({
    queryKey: ["projectBalanceSheet", projectId],
    queryFn: () => api.get(`/projects/${projectId}/balance-sheet`).then((r) => r.data),
  });

  if (!bs) return <div className="border border-zinc-800 p-8 text-center text-xs text-zinc-500">Loading balance sheet…</div>;
  const r = bs.released;

  return (
    <div data-testid="project-balance-sheet">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card label="Total Budget" value={fmtCr(bs.budget)} icon={IndianRupee} accent="text-sky-400" testId="pbs-budget" />
        <Card label="Client Payment (In)" value={fmtCr(bs.client_paid)} sub={`Outstanding from client: ${fmt(bs.client_outstanding)}`} icon={TrendingUp} accent="text-green-400" testId="pbs-client-paid" />
        <Card label="Payment Released (Out)" value={fmtCr(bs.total_released)} icon={TrendingDown} accent="text-red-400" testId="pbs-released" />
        <Card label="Balance (In − Out)" value={fmtCr(bs.balance)} sub={`Budget remaining: ${fmtCr(bs.budget_remaining)}`} icon={Wallet} accent={bs.balance < 0 ? "text-red-400" : "text-green-400"} testId="pbs-balance" />
      </div>

      <div className="border border-zinc-800 bg-zinc-900/60 p-4 mb-6" data-testid="pbs-released-breakdown">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">Where the money is going — Payment Released Breakdown</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            ["Daily-Wage Labour", r.labour_wages, "pbs-bd-labour"],
            ["Staff Payroll", r.staff_payroll, "pbs-bd-payroll"],
            ["Site Expenses", r.expenses, "pbs-bd-expenses"],
            ["Procurement / Vendors", r.procurement, "pbs-bd-procurement"],
          ].map(([label, amt, tid]) => (
            <div key={tid} className="border border-zinc-800/70 bg-zinc-950/40 p-3" data-testid={tid}>
              <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">{label}</div>
              <div className="font-semibold text-white mt-1.5">{fmt(amt)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">All Transactions — Latest First</div>
        <div className="flex gap-4 text-xs">
          <span className="text-green-400" data-testid="pbs-tx-credit">Credit: {fmt(bs.total_credit)}</span>
          <span className="text-red-400" data-testid="pbs-tx-debit">Debit: {fmt(bs.total_debit)}</span>
        </div>
      </div>
      <div className="border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm" data-testid="pbs-transactions-table">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Credit (In)</th><th className="px-4 py-3 text-right">Debit (Out)</th>
            </tr>
          </thead>
          <tbody>
            {bs.entries.map((en, i) => (
              <tr key={i} className="border-b border-zinc-800/50" data-testid={`pbs-tx-row-${i}`}>
                <td className="px-4 py-2.5 text-xs text-zinc-400">{en.date || "—"}</td>
                <td className="px-4 py-2.5 text-zinc-200">{en.description}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-green-400">{en.type === "credit" ? fmt(en.amount) : ""}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-red-400">{en.type === "debit" ? fmt(en.amount) : ""}</td>
              </tr>
            ))}
            {bs.entries.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500" data-testid="pbs-tx-empty">No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
