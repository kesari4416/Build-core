import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, CheckCircle2, IndianRupee } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { CommitmentStatusBadge } from "./CommitmentStatusBadge";
import { useAuth } from "../../../context/AuthContext";
import api, { formatApiErrorDetail } from "../../../api/client";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const VendorQuotationsSection = ({ projectId }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [qty, setQty] = useState({});
  const [notes, setNotes] = useState("");

  const canCreate = ["Admin", "ProcurementOfficer", "SiteEngineer"].includes(user?.role);
  const canApprove = user?.role === "Admin";
  const canPay = ["Admin", "Accountant"].includes(user?.role);

  const { data: quotations } = useQuery({
    queryKey: ["vendorQuotations", projectId],
    queryFn: () => api.get(`/projects/${projectId}/vendor-quotations`).then((r) => r.data),
  });
  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => api.get("/vendors").then((r) => r.data),
  });
  const { data: products } = useQuery({
    queryKey: ["vendorProducts", vendorId],
    queryFn: () => api.get(`/vendors/${vendorId}/products`).then((r) => r.data),
    enabled: !!vendorId,
  });

  const total = useMemo(() => (products || []).reduce(
    (s, p) => s + (Number(qty[p.id]) > 0 ? Number(qty[p.id]) * p.unit_price : 0), 0), [products, qty]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["vendorQuotations", projectId] });
    qc.invalidateQueries({ queryKey: ["projectFinance"] });
    qc.invalidateQueries({ queryKey: ["projectBalanceSheet"] });
  };

  const submit = async () => {
    const items = (products || []).filter((p) => Number(qty[p.id]) > 0)
      .map((p) => ({ product_id: p.id, quantity: Number(qty[p.id]) }));
    if (!vendorId) { toast.error("Select a vendor"); return; }
    if (items.length === 0) { toast.error("Select at least one product with quantity"); return; }
    try {
      await api.post(`/projects/${projectId}/vendor-quotations`, { vendor_id: Number(vendorId), items, notes: notes || null });
      toast.success("Quotation created");
      setModal(false); setVendorId(""); setQty({}); setNotes("");
      refresh();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const act = async (id, action, label) => {
    try {
      await api.post(`/vendor-quotations/${id}/${action}`);
      toast.success(label);
      refresh();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <div className="mt-10" data-testid="vendor-quotations-section">
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
          No vendor quotations yet. Pick a vendor's products and make one.
        </div>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => (
            <div key={q.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-md p-4" data-testid={`quotation-card-${q.id}`}>
              <div className="flex flex-wrap items-center gap-3">
                <FileText size={15} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />
                <span className="font-heading font-bold text-lg">{q.quote_number}</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">{q.vendor_name}</span>
                <CommitmentStatusBadge status={q.status} />
                <span className="ml-auto font-bold" data-testid={`quotation-total-${q.id}`}>{fmt(q.total_amount)}</span>
                {q.status === "Draft" && canApprove && (
                  <Button size="sm" data-testid={`quotation-approve-${q.id}`} onClick={() => act(q.id, "approve", "Quotation approved")}
                    className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs"><CheckCircle2 size={13} /> Approve</Button>
                )}
                {q.status === "Approved" && canPay && (
                  <Button size="sm" data-testid={`quotation-pay-${q.id}`} onClick={() => act(q.id, "pay", "Payment recorded in Finance")}
                    className="rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs"><IndianRupee size={13} /> Record Payment</Button>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {q.items.map((i) => `${i.product_name} × ${i.quantity} ${i.unit} @ ${fmt(i.unit_price)}`).join("  ·  ")}
                {q.paid_at && <span className="text-emerald-600 dark:text-emerald-400 ml-2">Paid → recorded as project expense</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md max-w-lg" data-testid="quotation-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl uppercase tracking-wide">Make Quotation</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">Select a vendor, pick products and quantities.</DialogDescription>
          </DialogHeader>
          <Select value={vendorId} onValueChange={(v) => { setVendorId(v); setQty({}); }}>
            <SelectTrigger data-testid="quotation-vendor-select" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md">
              <SelectValue placeholder="Select vendor…" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
              {(vendors || []).map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name} — {v.trade || v.vendor_type}</SelectItem>)}
            </SelectContent>
          </Select>
          {vendorId && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1" data-testid="quotation-products-list">
              {(products || []).map((p) => (
                <div key={p.id} className="flex items-center gap-3 border border-slate-200 dark:border-slate-800 rounded-md p-2.5" data-testid={`quotation-product-${p.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{fmt(p.unit_price)} / {p.unit}</div>
                  </div>
                  <Input type="number" min="0" placeholder="Qty" value={qty[p.id] ?? ""}
                    onChange={(e) => setQty((s) => ({ ...s, [p.id]: e.target.value }))}
                    data-testid={`quotation-qty-${p.id}`}
                    className="w-24 h-8 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md text-sm" />
                  <span className="w-28 text-right text-sm font-semibold">
                    {Number(qty[p.id]) > 0 ? fmt(Number(qty[p.id]) * p.unit_price) : "—"}
                  </span>
                </div>
              ))}
              {(products || []).length === 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-md p-5 text-center" data-testid="quotation-no-products">
                  This vendor has no products yet — add products from the Vendors module first.
                </div>
              )}
            </div>
          )}
          <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}
            data-testid="quotation-notes-input" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="text-sm">Total: <span className="font-heading font-bold text-xl text-blue-600 dark:text-blue-400" data-testid="quotation-modal-total">{fmt(total)}</span></div>
            <Button onClick={submit} data-testid="quotation-submit-button"
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wide text-xs">Create Quotation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
