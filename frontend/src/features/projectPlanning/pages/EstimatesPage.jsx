import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Calculator } from "lucide-react";
import api, { assetUrl, formatApiErrorDetail } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { EstimateFormModal } from "../components/EstimateFormModal";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const STATUS_COLOR = {
  Approved: "border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
  Rejected: "border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10",
  "Pending Approval": "border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
};

export default function EstimatesPage() {
  const [modal, setModal] = useState(false);
  const qc = useQueryClient();
  const { user } = useAuth();
  const canDelete = ["Admin", "Accountant"].includes(user?.role);

  const { data: estimates } = useQuery({ queryKey: ["estimates"], queryFn: () => api.get("/estimates").then((r) => r.data) });
  const { data: categories } = useQuery({ queryKey: ["estimateCategories"], queryFn: () => api.get("/estimate-categories").then((r) => r.data) });
  const { data: statuses } = useQuery({ queryKey: ["estimateStatuses"], queryFn: () => api.get("/estimate-statuses").then((r) => r.data) });

  const remove = async (e) => {
    if (!window.confirm(`Delete estimate for "${e.project_name}"?`)) return;
    try {
      await api.delete(`/estimates/${e.id}`);
      toast.success("Estimate deleted");
      qc.invalidateQueries({ queryKey: ["estimates"] });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <div data-testid="estimates-page">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 font-semibold mb-1 flex items-center gap-2">
            <Calculator size={13} strokeWidth={2.5} /> Pre-construction
          </div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight leading-none">Estimates</h1>
        </div>
        <button data-testid="create-estimate-button" onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs uppercase tracking-[0.15em] font-bold transition-colors rounded-md">
          <Plus size={15} strokeWidth={3} /> Create Estimate
        </button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm" data-testid="estimates-table">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3">Project Name</th><th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3">Category</th><th className="px-4 py-3">Drawing</th>
              <th className="px-4 py-3 text-right">Total Amount</th><th className="px-4 py-3 text-center">Current Status</th>
              <th className="px-4 py-3 text-right">Created</th>
              {canDelete && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {(estimates || []).map((e) => (
              <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors" data-testid={`estimate-row-${e.id}`}>
                <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{e.project_name}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{e.phase || "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{e.category}</td>
                <td className="px-4 py-2.5">
                  {e.drawing_url ? (
                    <a href={assetUrl(e.drawing_url)} target="_blank" rel="noreferrer" data-testid={`estimate-drawing-${e.id}`} title={e.drawing_filename}>
                      {/\.pdf$/i.test(e.drawing_url) ? (
                        <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold hover:underline">
                          <FileText size={14} strokeWidth={2.5} /> PDF
                        </span>
                      ) : (
                        <img src={assetUrl(e.drawing_url)} alt={e.drawing_filename || "drawing"}
                          className="w-12 h-9 object-cover border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors" />
                      )}
                    </a>
                  ) : <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-heading font-bold text-slate-900 dark:text-slate-100">{fmt(e.total_amount)}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-bold ${STATUS_COLOR[e.current_status] || "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800"}`}>
                    {e.current_status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-slate-500 dark:text-slate-400">{e.created_at?.slice(0, 10)}</td>
                {canDelete && (
                  <td className="px-4 py-2.5 text-right">
                    <button data-testid={`delete-estimate-${e.id}`} title="Delete" onClick={() => remove(e)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={14} strokeWidth={2.5} /></button>
                  </td>
                )}
              </tr>
            ))}
            {estimates && estimates.length === 0 && (
              <tr><td colSpan={canDelete ? 8 : 7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400" data-testid="estimates-empty">
                No estimates yet — click "Create Estimate" to add your first one.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <EstimateFormModal open={modal} onOpenChange={setModal} categories={categories} statuses={statuses} />
    </div>
  );
}
