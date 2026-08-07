import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Award } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { CommitmentStatusBadge } from "../components/CommitmentStatusBadge";
import { BestValueBadge } from "../components/BestValueBadge";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const BidComparisonTable = ({ data, isAdmin, onAward }) => (
  <div className="border border-zinc-800 overflow-x-auto">
    <table className="w-full text-sm" data-testid="bid-comparison-table">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
          <th className="px-4 py-3 min-w-[220px]">Line Item</th>
          {data.vendors.map((v) => (
            <th key={v.bid_id} className="px-4 py-3 min-w-[160px]">
              <div className="text-white normal-case tracking-normal text-sm font-semibold">{v.vendor_name}</div>
              <CommitmentStatusBadge status={v.status} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.line_items.map((li) => (
          <tr key={li.id} className="border-b border-zinc-800/50" data-testid={`comparison-row-${li.id}`}>
            <td className="px-4 py-3">
              <div className="text-white font-medium">{li.item_description}</div>
              <div className="text-xs text-zinc-500">{li.quantity_required} {li.unit || ""} · {li.cost_code || "—"}</div>
            </td>
            {data.vendors.map((v) => {
              const q = li.quotes.find((x) => x.bid_id === v.bid_id);
              return (
                <td key={v.bid_id} className={`px-4 py-3 ${q?.is_best ? "bg-green-500/5" : ""}`} data-testid={`quote-cell-${li.id}-${v.vendor_id}`}>
                  {q ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${q.is_best ? "text-green-400" : "text-white"}`}>{fmt(q.unit_price)}</span>
                        {q.is_best && <BestValueBadge />}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Total {fmt(q.line_total)}{q.lead_time_days != null ? ` · ${q.lead_time_days}d lead` : ""}
                      </div>
                    </div>
                  ) : <span className="text-zinc-600 text-xs">No quote</span>}
                </td>
              );
            })}
          </tr>
        ))}
        <tr className="bg-zinc-900/60" data-testid="comparison-totals-row">
          <td className="px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Bid Total</td>
          {data.vendors.map((v) => {
            const best = Math.min(...data.vendors.filter((x) => x.total > 0).map((x) => x.total));
            return (
              <td key={v.bid_id} className="px-4 py-3">
                <div className={`font-heading font-bold text-xl ${v.total === best && v.total > 0 ? "text-green-400" : "text-white"}`}>{fmt(v.total)}</div>
                {isAdmin && data.status !== "Awarded" && v.status !== "Awarded" && (
                  <div className="flex gap-1.5 mt-2">
                    <button data-testid={`award-po-${v.vendor_id}`} onClick={() => onAward(v, "po")}
                      className="border border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-zinc-950 px-2 py-1 text-[10px] uppercase tracking-wide font-bold transition-colors">
                      Award PO
                    </button>
                    <button data-testid={`award-sub-${v.vendor_id}`} onClick={() => onAward(v, "subcontract")}
                      className="border border-zinc-600 text-zinc-400 hover:border-orange-500 hover:text-orange-500 px-2 py-1 text-[10px] uppercase tracking-wide font-bold transition-colors">
                      Award Sub
                    </button>
                  </div>
                )}
                {v.status === "Awarded" && (
                  <span className="flex items-center gap-1 mt-2 text-[10px] uppercase tracking-wide font-bold text-green-400">
                    <Award size={12} strokeWidth={2.5} /> Awarded
                  </span>
                )}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  </div>
);

export default function BidComparisonPage() {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [liForm, setLiForm] = useState({ item_description: "", unit: "", quantity_required: "" });
  const { data, isLoading } = useQuery({
    queryKey: ["comparison", id],
    queryFn: () => api.get(`/bid-packages/${id}/comparison`).then((r) => r.data),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["comparison", id] });
    qc.invalidateQueries({ queryKey: ["allBidPackages"] });
  };
  const run = async (fn, ok) => {
    try { await fn(); toast.success(ok); refresh(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message); }
  };

  const award = (v, type) => {
    if (!window.confirm(`Award "${data.title}" to ${v.vendor_name} as ${type === "po" ? "a Purchase Order" : "a Subcontract"}?`)) return;
    run(() => api.post(`/bid-packages/${id}/award`, { bid_id: v.bid_id, commitment_type: type }), `Awarded to ${v.vendor_name}`);
  };

  const canEdit = ["Admin", "SiteEngineer", "ProcurementOfficer"].includes(user?.role);

  return (
    <div className="p-8" data-testid="bid-comparison-page">
      <Link to="/admin/procurement/vendors" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] font-semibold text-zinc-500 hover:text-orange-500 mb-4">
        <ArrowLeft size={14} strokeWidth={2.5} /> Vendors & Quotes
      </Link>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="text-orange-500 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Quote Comparison</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none" data-testid="comparison-title">{data?.title || "—"}</h1>
          <div className="flex items-center gap-3 mt-3">
            {data && <CommitmentStatusBadge status={data.status} />}
            <span className="text-xs text-zinc-500">Bids due {data?.bid_due_date || "—"}</span>
          </div>
        </div>
      </div>
      {canEdit && data?.status !== "Awarded" && (
        <div className="border border-zinc-800 bg-zinc-900/60 p-4 flex flex-wrap items-end gap-3 mb-6">
          <Input data-testid="li-desc-input" placeholder="Line item description" value={liForm.item_description}
            onChange={(e) => setLiForm({ ...liForm, item_description: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-9 flex-1 min-w-[200px]" />
          <Input data-testid="li-unit-input" placeholder="Unit" value={liForm.unit}
            onChange={(e) => setLiForm({ ...liForm, unit: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-9 w-24" />
          <Input data-testid="li-qty-input" type="number" placeholder="Qty" value={liForm.quantity_required}
            onChange={(e) => setLiForm({ ...liForm, quantity_required: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-9 w-24" />
          <Button data-testid="li-add-button" disabled={!liForm.item_description}
            onClick={async () => {
              await run(() => api.post(`/bid-packages/${id}/line-items`, {
                item_description: liForm.item_description, unit: liForm.unit || null,
                quantity_required: liForm.quantity_required !== "" ? Number(liForm.quantity_required) : 0,
              }), "Line item added");
              setLiForm({ item_description: "", unit: "", quantity_required: "" });
            }}
            className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-wide h-9">
            <Plus size={14} strokeWidth={3} /> Line Item
          </Button>
        </div>
      )}
      {isLoading && <div className="border border-zinc-800 p-10 text-center text-zinc-500">Loading comparison…</div>}
      {data && data.vendors.length === 0 && (
        <div className="border border-zinc-800 p-10 text-center text-zinc-500" data-testid="comparison-empty">No bids submitted yet for this package.</div>
      )}
      {data && data.vendors.length > 0 && <BidComparisonTable data={data} isAdmin={isAdmin} onAward={award} />}
    </div>
  );
}
