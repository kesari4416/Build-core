import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { CommitmentStatusBadge } from "../components/CommitmentStatusBadge";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const PayrollRunTable = ({ run, onProcess, onMarkPaid }) => {
  const { data: entries } = useQuery({
    queryKey: ["payrollEntries", run.id],
    queryFn: () => api.get(`/payroll-runs/${run.id}/entries`).then((r) => r.data),
    enabled: run.status !== "Draft",
  });
  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 space-y-3" data-testid={`payroll-run-${run.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-heading font-bold text-lg text-blue-600 dark:text-blue-400">Run #{run.id}</span>
        <span className="text-sm text-slate-600 dark:text-slate-400">{run.period_start} → {run.period_end}</span>
        <CommitmentStatusBadge status={run.status} />
        <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100">{fmt(run.total_net_pay)}</span>
        {run.status === "Draft" && (
          <Button size="sm" data-testid={`process-run-${run.id}`} onClick={() => onProcess(run)}
            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs uppercase font-bold h-8">Process</Button>
        )}
      </div>
      {entries?.length > 0 && (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <th className="py-1.5">Staff</th><th className="py-1.5">Role</th><th className="py-1.5 text-right">Net Pay</th><th className="py-1.5 text-right">Status</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/60" data-testid={`payroll-entry-${e.id}`}>
                <td className="py-2 text-slate-900 dark:text-slate-100">{e.staff_name}</td>
                <td className="py-2 text-slate-500 dark:text-slate-400">{e.role_at_time}</td>
                <td className="py-2 text-right text-slate-700 dark:text-slate-300">{fmt(e.net_pay)}</td>
                <td className="py-2 text-right">
                  {e.payment_status === "Paid" ? <CommitmentStatusBadge status="Paid" /> : (
                    <button data-testid={`mark-paid-${e.id}`} onClick={() => onMarkPaid(e, run)}
                      className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400">Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default function PayrollPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ period_start: "", period_end: "" });
  const { data: runs } = useQuery({
    queryKey: ["payrollRuns"],
    queryFn: () => api.get("/payroll-runs").then((r) => r.data),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["payrollRuns"] });
    qc.invalidateQueries({ queryKey: ["payrollEntries"] });
    qc.invalidateQueries({ queryKey: ["orgFinance"] });
  };
  const run = async (fn, ok) => {
    try { await fn(); toast.success(ok); refresh(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message); }
  };

  return (
    <div className="p-4 sm:p-8" data-testid="payroll-page">
      <Link to="/admin/finance" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400 mb-4">
        <ArrowLeft size={14} strokeWidth={2.5} /> Finance
      </Link>
      <h1 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight leading-none mb-8">Payroll</h1>
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-wrap items-end gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">Period Start</div>
          <Input data-testid="payroll-start-input" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md h-9" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">Period End</div>
          <Input data-testid="payroll-end-input" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md h-9" />
        </div>
        <Button data-testid="payroll-create" disabled={!form.period_start || !form.period_end}
          onClick={() => run(() => api.post("/payroll-runs", form), "Payroll run created")}
          className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wide h-9">
          <Plus size={14} strokeWidth={3} /> New Run
        </Button>
      </div>
      <div className="space-y-4">
        {(runs || []).map((r) => (
          <PayrollRunTable key={r.id} run={r}
            onProcess={(r2) => run(() => api.post(`/payroll-runs/${r2.id}/process`), "Payroll processed")}
            onMarkPaid={(e) => run(() => api.post(`/payroll-entries/${e.id}/mark-paid`), "Marked paid")} />
        ))}
        {(runs || []).length === 0 && <div className="border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400" data-testid="payroll-empty">No payroll runs yet.</div>}
      </div>
    </div>
  );
}
