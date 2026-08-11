import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { IndianRupee, TrendingUp, TrendingDown, Wallet, FileDown, FileSpreadsheet } from "lucide-react";
import api from "../../../api/client";
import { downloadFile } from "../utils/downloadFile";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtCr = (n) => `${n < 0 ? "−" : ""}₹${(Math.abs(n || 0) / 10000000).toFixed(2)} Cr`;

const Card = ({ label, value, sub, icon: Icon, accent, testId }) => (
  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">{label}</span>
      <Icon size={16} strokeWidth={2.5} className={accent} />
    </div>
    <div className={`font-heading font-bold text-3xl mt-3 leading-none ${accent}`}>{value}</div>
    {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 tracking-wide">{sub}</div>}
  </div>
);

export const ProjectBalanceSheetTab = ({ projectId }) => {
  const { data: bs } = useQuery({
    queryKey: ["projectBalanceSheet", projectId],
    queryFn: () => api.get(`/projects/${projectId}/balance-sheet`).then((r) => r.data),
  });

  if (!bs) return <div className="border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading balance sheet…</div>;
  const r = bs.released;

  return (
    <div data-testid="project-balance-sheet">
      <div className="flex justify-end gap-2 mb-4">
        <button data-testid="pbs-export-pdf" onClick={() => downloadFile(`/projects/${projectId}/balance-sheet/export?fmt=pdf`, "project-balance-sheet.pdf").catch(() => toast.error("Export failed"))}
          className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 px-3 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400 transition-colors">
          <FileDown size={14} strokeWidth={2.5} /> Export PDF
        </button>
        <button data-testid="pbs-export-excel" onClick={() => downloadFile(`/projects/${projectId}/balance-sheet/export?fmt=xlsx`, "project-balance-sheet.xlsx").catch(() => toast.error("Export failed"))}
          className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 px-3 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400 transition-colors">
          <FileSpreadsheet size={14} strokeWidth={2.5} /> Export Excel
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card label="Total Budget" value={fmtCr(bs.budget)} icon={IndianRupee} accent="text-sky-600 dark:text-sky-400" testId="pbs-budget" />
        <Card label="Client Payment (In)" value={fmtCr(bs.client_paid)} sub={`Outstanding from client: ${fmt(bs.client_outstanding)}`} icon={TrendingUp} accent="text-emerald-600 dark:text-emerald-400" testId="pbs-client-paid" />
        <Card label="Payment Released (Out)" value={fmtCr(bs.total_released)} icon={TrendingDown} accent="text-red-600 dark:text-red-400" testId="pbs-released" />
        <Card label="Balance (In − Out)" value={fmtCr(bs.balance)} sub={`Budget remaining: ${fmtCr(bs.budget_remaining)}`} icon={Wallet} accent={bs.balance < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"} testId="pbs-balance" />
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 mb-6" data-testid="pbs-released-breakdown">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold mb-3">Where the money is going — Payment Released Breakdown</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            ["Daily-Wage Labour", r.labour_wages, "pbs-bd-labour"],
            ["Staff Payroll", r.staff_payroll, "pbs-bd-payroll"],
            ["Site Expenses", r.expenses, "pbs-bd-expenses"],
            ["Procurement / Vendors", r.procurement, "pbs-bd-procurement"],
          ].map(([label, amt, tid]) => (
            <div key={tid} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3" data-testid={tid}>
              <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-semibold">{label}</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-1.5">{fmt(amt)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">All Transactions — Latest First</div>
        <div className="flex gap-4 text-xs">
          <span className="text-emerald-600 dark:text-emerald-400" data-testid="pbs-tx-credit">Credit: {fmt(bs.total_credit)}</span>
          <span className="text-red-600 dark:text-red-400" data-testid="pbs-tx-debit">Debit: {fmt(bs.total_debit)}</span>
        </div>
      </div>
      <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm" data-testid="pbs-transactions-table">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Credit (In)</th><th className="px-4 py-3 text-right">Debit (Out)</th>
            </tr>
          </thead>
          <tbody>
            {bs.entries.map((en, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60" data-testid={`pbs-tx-row-${i}`}>
                <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{en.date || "—"}</td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{en.description}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{en.type === "credit" ? fmt(en.amount) : ""}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-red-600 dark:text-red-400">{en.type === "debit" ? fmt(en.amount) : ""}</td>
              </tr>
            ))}
            {bs.entries.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" data-testid="pbs-tx-empty">No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
