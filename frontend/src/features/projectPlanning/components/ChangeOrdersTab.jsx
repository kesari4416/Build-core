import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronUp, GitBranch, CalendarClock, FileDiff } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { ChangeOrderStatusBadge } from "./ChangeOrderStatusBadge";
import { ChangeOrderFormModal } from "./ChangeOrderFormModal";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const STATUSES = ["Draft", "Pending Client Review", "Revision Requested", "Approved", "Rejected"];
const CATEGORIES = ["Client Modification", "Rework", "Design Change", "Site Condition"];

const SummaryCell = ({ label, value, sub, accent, testId }) => (
  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4" data-testid={testId}>
    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">{label}</div>
    <div className={`font-heading font-bold text-2xl mt-2 leading-none ${accent || "text-slate-900 dark:text-slate-100"}`}>{value}</div>
    {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">{sub}</div>}
  </div>
);

const ChangeOrderRow = ({ co, canDecide, canContract, onAction, onRevise }) => {
  const [open, setOpen] = useState(false);
  const decidable = ["Pending Client Review", "Revision Requested"].includes(co.status);
  const revisable = ["Draft", "Pending Client Review", "Revision Requested", "Rejected"].includes(co.status);
  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" data-testid={`change-order-${co.id}`}>
      <div className="p-4 flex flex-wrap items-center gap-3 cursor-pointer" onClick={() => setOpen((o) => !o)} data-testid={`co-row-header-${co.id}`}>
        <span className="font-heading font-bold text-amber-600 dark:text-amber-400">{co.co_number}</span>
        <div className="flex-1 min-w-[180px]">
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{co.title}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {co.category}{co.phase_name ? ` · ${co.phase_name}` : ""} · by {co.requested_by} on {co.date_requested}
          </div>
        </div>
        <div className="text-right">
          <div className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100">
            +{fmt(co.status === "Approved" && co.approved_cost != null ? co.approved_cost : co.estimated_cost)}
          </div>
          {co.estimated_time_impact_days > 0 && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-end">
              <CalendarClock size={11} strokeWidth={2.5} /> +{co.estimated_time_impact_days} days
            </div>
          )}
        </div>
        <ChangeOrderStatusBadge status={co.status} />
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>
      {open && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4" data-testid={`co-detail-${co.id}`}>
          {co.description && <p className="text-sm text-slate-600 dark:text-slate-300">{co.description}</p>}
          {co.status === "Approved" && (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold" data-testid={`co-approved-info-${co.id}`}>
              Approved by {co.approved_by} on {co.approval_date?.slice(0, 10)} at {fmt(co.approved_cost)}
            </div>
          )}
          {co.revisions?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                <GitBranch size={11} strokeWidth={2.5} /> Estimate History
              </div>
              <div className="space-y-1">
                {co.revisions.map((r) => (
                  <div key={r.version} className="flex flex-wrap items-center gap-3 text-xs border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5" data-testid={`co-revision-${co.id}-v${r.version}`}>
                    <span className="font-bold text-slate-700 dark:text-slate-300">v{r.version}</span>
                    <span className="font-semibold">{fmt(r.estimated_cost)}</span>
                    <span className="text-slate-500 dark:text-slate-400">+{r.estimated_time_impact_days}d</span>
                    {r.note && <span className="text-slate-500 dark:text-slate-400 italic">"{r.note}"</span>}
                    <span className="ml-auto text-slate-400 dark:text-slate-500">{r.by} · {r.at?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {co.events?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-semibold mb-1.5">Activity</div>
              <div className="space-y-1">
                {co.events.map((e, i) => (
                  <div key={i} className="text-xs text-slate-500 dark:text-slate-400" data-testid={`co-event-${co.id}-${i}`}>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{e.by}</span> — {e.action}
                    {e.comment && <span className="italic">: "{e.comment}"</span>}
                    <span className="ml-1.5 text-slate-400 dark:text-slate-500">{e.at?.slice(0, 16).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {canDecide && decidable && (
              <>
                <Button size="sm" data-testid={`co-approve-btn-${co.id}`} onClick={() => onAction(co, "approve")}
                  className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wide h-8">Approve</Button>
                <Button size="sm" variant="outline" data-testid={`co-reject-btn-${co.id}`} onClick={() => onAction(co, "reject")}
                  className="rounded-md border-red-400/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-bold uppercase tracking-wide h-8">Reject</Button>
                {co.status === "Pending Client Review" && (
                  <Button size="sm" variant="outline" data-testid={`co-request-revision-btn-${co.id}`} onClick={() => onAction(co, "request-revision")}
                    className="rounded-md border-sky-400/60 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 text-xs font-bold uppercase tracking-wide h-8">Request Revision</Button>
                )}
              </>
            )}
            {canContract && revisable && (
              <Button size="sm" variant="outline" data-testid={`co-revise-btn-${co.id}`} onClick={() => onRevise(co)}
                className="rounded-md border-slate-300 dark:border-slate-700 hover:border-blue-400 text-xs font-bold uppercase tracking-wide h-8">
                {co.status === "Draft" ? "Submit for Review" : "Revise Estimate"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ChangeOrdersTab = ({ projectId, phases }) => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modal, setModal] = useState({ open: false, co: null });
  const { user } = useAuth();
  const role = user?.role;
  const { data } = useQuery({
    queryKey: ["changeOrders", projectId, statusFilter, categoryFilter],
    queryFn: () => api.get(`/projects/${projectId}/change-orders`, {
      params: { ...(statusFilter && { status: statusFilter }), ...(categoryFilter && { category: categoryFilter }) },
    }).then((r) => r.data),
  });

  const canContract = ["Admin", "SiteEngineer"].includes(role);
  const canDecide = ["Client", "Admin"].includes(role);
  const refresh = () => ["changeOrders", "projFinance", "projectBalanceSheet", "notifications"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const onAction = async (co, action) => {
    let comment = null;
    if (action === "approve") {
      if (!window.confirm(`Approve ${co.co_number} — "${co.title}" at ${fmt(co.estimated_cost)}?\n\nThis amount will be added to the project's contract value and financial ledger.`)) return;
    } else if (action === "reject") {
      comment = window.prompt(`Reject ${co.co_number}? Add an optional reason:`) ;
      if (comment === null) return;
    } else {
      comment = window.prompt(`What should be revised in ${co.co_number}? (required)`);
      if (!comment || !comment.trim()) return;
    }
    try {
      await api.post(`/change-orders/${co.id}/${action}`, { comment: comment || null, confirm: true });
      toast.success(action === "approve" ? `${co.co_number} approved` : action === "reject" ? `${co.co_number} rejected` : "Revision requested");
      refresh();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const s = data?.summary;
  const filterCls = "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md h-9 text-sm text-slate-700 dark:text-slate-300 px-2";

  return (
    <div data-testid="change-orders-tab">
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCell label="Original Contract" value={fmt(s.original_budget)} testId="co-sum-original" />
          <SummaryCell label="Approved Variations" value={`+${fmt(s.approved_variations)}`}
            sub={`${s.approved_count} approved · +${s.increase_pct}% of contract`} accent="text-amber-600 dark:text-amber-400" testId="co-sum-approved" />
          <SummaryCell label="Revised Contract Value" value={fmt(s.revised_contract_value)} accent="text-blue-600 dark:text-blue-400" testId="co-sum-revised" />
          <SummaryCell label="Pending Review" value={fmt(s.pending_co_value)} accent="text-sky-600 dark:text-sky-400" testId="co-sum-pending" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
          <FileDiff size={13} strokeWidth={2.5} /> Change Orders · {data?.change_orders?.length ?? 0}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <select data-testid="co-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterCls}>
            <option value="">All statuses</option>
            {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <select data-testid="co-category-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={filterCls}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {canContract && (
            <Button data-testid="new-change-order-button" size="sm" onClick={() => setModal({ open: true, co: null })}
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-[0.12em] h-9">
              <Plus size={14} strokeWidth={3} /> New Change Order
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {(data?.change_orders || []).map((co) => (
          <ChangeOrderRow key={co.id} co={co} canDecide={canDecide} canContract={canContract}
            onAction={onAction} onRevise={(c) => setModal({ open: true, co: c })} />
        ))}
        {data && data.change_orders.length === 0 && (
          <div className="border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500 dark:text-slate-400" data-testid="change-orders-empty">
            No change orders {statusFilter || categoryFilter ? "match the selected filters" : "yet — client modifications and scope variations will appear here, separate from the base contract"}.
          </div>
        )}
      </div>
      <ChangeOrderFormModal open={modal.open} onOpenChange={(o) => setModal({ open: o, co: o ? modal.co : null })}
        projectId={projectId} phases={phases} co={modal.co} />
    </div>
  );
};
