import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, ArrowRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/client";
import { MakeQuotationModal } from "./MakeQuotationModal";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const STATUS_STYLE = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  expired: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

export const QuotationStatusBadge = ({ status }) => (
  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[status] || STATUS_STYLE.draft}`}>
    {status}
  </span>
);

export const QuotationsSection = ({ projectId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const canCreate = ["Admin", "ProcurementOfficer", "SiteEngineer", "Accountant"].includes(user?.role);

  const { data: quotations } = useQuery({
    queryKey: ["quotations", projectId],
    queryFn: () => api.get(`/projects/${projectId}/quotations`).then((r) => r.data),
  });

  return (
    <div className="mt-10" data-testid="quotations-section">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">Vendor Quotations</div>
        {canCreate && (
          <Button data-testid="make-quotation-button" onClick={() => setModal(true)}
            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wide text-xs">
            <Plus size={14} strokeWidth={3} /> Make Quotation
          </Button>
        )}
      </div>

      {(quotations || []).length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400" data-testid="quotations-empty">
          No quotations yet. Make one from the global product catalog.
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm" data-testid="quotations-table">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <th className="px-4 py-3">Quotation</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} data-testid={`quotation-row-${q.id}`}
                  onClick={() => navigate(`/admin/projects/${projectId}/procurement/quotations/${q.id}`)}
                  className="border-b border-slate-100 dark:border-slate-800/60 cursor-pointer hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                      <FileText size={14} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" /> {q.quotation_number}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{q.vendor_name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{q.quotation_date || "—"}</td>
                  <td className="px-4 py-3"><QuotationStatusBadge status={q.status} /></td>
                  <td className="px-4 py-3 text-right font-bold" data-testid={`quotation-total-${q.id}`}>{fmt(q.quotation_total)}</td>
                  <td className="px-4 py-3 text-right"><ArrowRight size={14} className="inline text-slate-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MakeQuotationModal projectId={projectId} open={modal} onOpenChange={setModal}
        onCreated={(q) => navigate(`/admin/projects/${projectId}/procurement/quotations/${q.id}`)} />
    </div>
  );
};
