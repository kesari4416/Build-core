import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, IndianRupee, AlertTriangle, Users } from "lucide-react";
import api from "../../../api/client";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtCr = (n) => `${n < 0 ? "−" : ""}₹${(Math.abs(n || 0) / 10000000).toFixed(2)} Cr`;

const StatCard = ({ label, value, icon: Icon, accent, testId }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-5" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">{label}</span>
      <Icon size={16} strokeWidth={2.5} className={accent} />
    </div>
    <div className={`font-heading font-bold text-3xl mt-3 leading-none ${accent}`}>{value}</div>
  </div>
);

export const OrgBalanceSheetTab = () => {
  const { data: bs } = useQuery({
    queryKey: ["orgBalanceSheet"],
    queryFn: () => api.get("/finance/balance-sheet").then((r) => r.data),
  });

  if (!bs) return <div className="border border-zinc-800 p-8 text-center text-xs text-zinc-500">Loading balance sheet…</div>;
  const dues = bs.employee_dues;

  return (
    <div data-testid="org-balance-sheet">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Credit (In)" value={fmtCr(bs.total_credit)} icon={TrendingUp} accent="text-green-400" testId="bs-total-credit" />
        <StatCard label="Total Debit (Out)" value={fmtCr(bs.total_debit)} icon={TrendingDown} accent="text-red-400" testId="bs-total-debit" />
        <StatCard label="Overall Profit" value={fmtCr(bs.overall_profit)} icon={IndianRupee} accent="text-green-400" testId="bs-overall-profit" />
        <StatCard label="Overall Loss" value={fmtCr(bs.overall_loss)} icon={AlertTriangle} accent="text-red-400" testId="bs-overall-loss" />
      </div>

      {bs.loss_projects.length > 0 && (
        <div className="border border-red-500/40 bg-red-500/5 p-4 mb-6" data-testid="loss-projects-panel">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-red-400 font-semibold mb-3">
            <AlertTriangle size={13} strokeWidth={2.5} /> Loss-Making Projects
          </div>
          <div className="flex flex-wrap gap-2">
            {bs.loss_projects.map((lp) => (
              <Link key={lp.project_id} to={`/admin/projects/${lp.project_id}`} data-testid={`loss-project-${lp.project_id}`}
                className="flex items-center gap-2 border border-red-500/30 bg-zinc-950/60 px-3 py-2 text-sm hover:border-red-500 transition-colors">
                <span className="text-zinc-200">{lp.name}</span>
                <span className="font-semibold text-red-400">−{fmtCr(lp.loss).replace("−", "")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">All Projects — Balance Sheet</div>
          <div className="border border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm" data-testid="bs-projects-table">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3 text-right">Credit (In)</th>
                  <th className="px-4 py-3 text-right">Debit (Out)</th>
                  <th className="px-4 py-3 text-right">Profit / Loss</th>
                </tr>
              </thead>
              <tbody>
                {bs.projects.map((p) => (
                  <tr key={p.project_id} data-testid={`bs-row-${p.project_id}`}
                    className={`border-b border-zinc-800/50 ${p.is_loss ? "bg-red-500/5" : ""}`}>
                    <td className="px-4 py-2.5">
                      <Link to={`/admin/projects/${p.project_id}`} className={`hover:text-orange-500 transition-colors ${p.is_loss ? "text-red-300" : "text-zinc-200"}`}>{p.name}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-400">{fmtCr(p.budget)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-400">{fmt(p.credit)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-red-400">{fmt(p.debit)}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${p.is_loss ? "text-red-400" : "text-green-400"}`}>{fmt(p.profit_loss)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-700 bg-zinc-900/60 font-bold">
                  <td className="px-4 py-3 text-zinc-200 uppercase text-xs tracking-wide">Total</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-green-400" data-testid="bs-foot-credit">{fmt(bs.total_credit)}</td>
                  <td className="px-4 py-3 text-right text-red-400" data-testid="bs-foot-debit">{fmt(bs.total_debit)}</td>
                  <td className={`px-4 py-3 text-right ${bs.net < 0 ? "text-red-400" : "text-green-400"}`} data-testid="bs-foot-net">{fmt(bs.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">Required Employee Payments</div>
          <div className="border border-zinc-800 bg-zinc-900/60 p-4" data-testid="employee-dues-panel">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <span className="flex items-center gap-2 text-sm text-zinc-300"><Users size={14} strokeWidth={2.5} className="text-orange-500" /> Staff payroll pending</span>
              <span className="font-semibold text-white" data-testid="dues-payroll-pending">{fmt(dues.staff_payroll_pending)}</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold mb-2">Daily-wage labour dues by type</div>
            <div className="space-y-1.5 mb-3">
              {dues.labour_by_category.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-sm" data-testid={`dues-cat-${c.category}`}>
                  <span className="text-zinc-400">{c.category}</span>
                  <span className="text-zinc-200 font-medium">{fmt(c.amount)}</span>
                </div>
              ))}
              {dues.labour_by_category.length === 0 && <div className="text-xs text-zinc-600">No labour attendance recorded.</div>}
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-xs uppercase tracking-wide font-semibold text-zinc-400">Total required</span>
              <span className="font-heading font-bold text-xl text-orange-500" data-testid="dues-total">{fmt(dues.total_required)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
