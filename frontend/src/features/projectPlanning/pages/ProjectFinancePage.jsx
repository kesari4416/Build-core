import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, IndianRupee, Receipt } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { CommitmentStatusBadge } from "../components/CommitmentStatusBadge";
import { useProject } from "../hooks/useProjects";
import { useAuth } from "../../../context/AuthContext";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtCr = (n) => `${n < 0 ? "−" : ""}₹${(Math.abs(n || 0) / 10000000).toFixed(2)} Cr`;

export const ProjectFinanceSummaryCard = ({ label, value, icon: Icon, accent, testId }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-5" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">{label}</span>
      <Icon size={16} strokeWidth={2.5} className={accent} />
    </div>
    <div className="font-heading font-bold text-3xl mt-3 leading-none">{value}</div>
  </div>
);

export const InvoiceCard = ({ inv, canWrite, onPay }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-4" data-testid={`invoice-card-${inv.id}`}>
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-heading font-bold text-lg text-orange-500">{inv.invoice_number}</span>
      <CommitmentStatusBadge status={inv.status} />
      <span className="text-xs text-zinc-500">Due {inv.due_date || "—"}</span>
      <span className="ml-auto font-semibold text-white">{fmt(inv.total)}</span>
    </div>
    <div className="text-xs text-zinc-400 mt-1">{inv.description}</div>
    <div className="flex items-center gap-4 mt-2 text-xs">
      <span className="text-green-400">Paid {fmt(inv.paid_amount)}</span>
      <span className="text-yellow-400">Balance {fmt(inv.balance_due)}</span>
      {canWrite && inv.balance_due > 0 && inv.status !== "Cancelled" && (
        <button data-testid={`record-payment-${inv.id}`} onClick={() => onPay(inv)}
          className="ml-auto text-[10px] uppercase tracking-wide font-bold text-orange-500 hover:text-orange-400">+ Record Payment</button>
      )}
    </div>
  </div>
);

export default function ProjectFinancePage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const canFin = ["Admin", "Accountant"].includes(user?.role);
  const qc = useQueryClient();
  const { data: project } = useProject(Number(id));
  const { data: s } = useQuery({ queryKey: ["projFinance", id], queryFn: () => api.get(`/projects/${id}/finance/summary`).then((r) => r.data), enabled: canFin || user?.role === "SiteEngineer" });
  const { data: invoices } = useQuery({ queryKey: ["invoices", id], queryFn: () => api.get(`/projects/${id}/invoices`).then((r) => r.data) });
  const { data: expenses } = useQuery({ queryKey: ["expenses", id], queryFn: () => api.get(`/projects/${id}/expenses`).then((r) => r.data), enabled: canFin || user?.role === "SiteEngineer" });
  const [invForm, setInvForm] = useState({ amount: "", due_date: "", description: "" });
  const [expForm, setExpForm] = useState({ category: "", amount: "" });

  const refresh = () => ["projFinance", "invoices", "expenses", "orgFinance"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const run = async (fn, ok) => {
    try { await fn(); toast.success(ok); refresh(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message); }
  };

  const recordPayment = (inv) => {
    const amt = window.prompt(`Payment amount for ${inv.invoice_number} (balance ${fmt(inv.balance_due)})`, inv.balance_due);
    if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) return;
    run(() => api.post(`/invoices/${inv.id}/payments`, { amount: Number(amt) }), "Payment recorded");
  };

  return (
    <div className="p-8" data-testid="project-finance-page">
      <Link to={`/admin/projects/${id}`} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] font-semibold text-zinc-500 hover:text-orange-500 mb-4">
        <ArrowLeft size={14} strokeWidth={2.5} /> {project?.name || "Project"}
      </Link>
      <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none mb-8">Project Finance</h1>
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ProjectFinanceSummaryCard label="Income To Date" value={fmtCr(s.income_to_date)} icon={TrendingUp} accent="text-green-500" testId="pf-income" />
          <ProjectFinanceSummaryCard label="Cost To Date" value={fmtCr(s.cost_to_date)} icon={TrendingDown} accent="text-orange-500" testId="pf-cost" />
          <ProjectFinanceSummaryCard label="Profit" value={fmtCr(s.profit)} icon={IndianRupee} accent={s.profit < 0 ? "text-red-500" : "text-green-500"} testId="pf-profit" />
          <ProjectFinanceSummaryCard label="Outstanding" value={fmtCr(s.outstanding_invoices)} icon={Receipt} accent="text-sky-400" testId="pf-outstanding" />
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Invoices & Payments</div>
          {canFin && (
            <div className="border border-zinc-800 bg-zinc-900/60 p-4 flex flex-wrap items-end gap-3">
              <Input data-testid="invoice-amount-input" type="number" placeholder="Amount ₹" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-9 w-36" />
              <Input data-testid="invoice-due-input" type="date" value={invForm.due_date} onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-9 w-40" />
              <Input data-testid="invoice-desc-input" placeholder="Description" value={invForm.description} onChange={(e) => setInvForm({ ...invForm, description: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-9 flex-1 min-w-[160px]" />
              <Button data-testid="invoice-create" disabled={!invForm.amount}
                onClick={async () => { await run(() => api.post(`/projects/${id}/invoices`, { amount: Number(invForm.amount), due_date: invForm.due_date || null, description: invForm.description || null }), "Invoice created"); setInvForm({ amount: "", due_date: "", description: "" }); }}
                className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-wide h-9"><Plus size={14} strokeWidth={3} /> Invoice</Button>
            </div>
          )}
          {(invoices || []).map((inv) => <InvoiceCard key={inv.id} inv={inv} canWrite={canFin} onPay={recordPayment} />)}
          {(invoices || []).length === 0 && <div className="border border-zinc-800 p-8 text-center text-xs text-zinc-500" data-testid="invoices-empty">No invoices yet.</div>}
        </div>
        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Expense Log</div>
          {(canFin || user?.role === "SiteEngineer") && (
            <div className="border border-zinc-800 bg-zinc-900/60 p-3 flex gap-2">
              <Input data-testid="expense-category-input" placeholder="Category" value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-9" />
              <Input data-testid="expense-amount-input" type="number" placeholder="₹" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-9 w-28" />
              <Button data-testid="expense-create" disabled={!expForm.amount}
                onClick={async () => { await run(() => api.post(`/projects/${id}/expenses`, { category: expForm.category || "Misc", amount: Number(expForm.amount) }), "Expense added"); setExpForm({ category: "", amount: "" }); }}
                className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold h-9 px-3"><Plus size={14} strokeWidth={3} /></Button>
            </div>
          )}
          {(expenses || []).map((e) => (
            <div key={e.id} className="flex items-center gap-3 border border-zinc-800 bg-zinc-900/40 p-3 text-sm" data-testid={`expense-${e.id}`}>
              <span className="text-zinc-200">{e.category}</span>
              <span className="text-xs text-zinc-500">{e.expense_date}</span>
              <span className="ml-auto font-semibold text-white">{fmt(e.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
