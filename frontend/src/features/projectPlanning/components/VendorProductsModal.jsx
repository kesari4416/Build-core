import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Package } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import api, { formatApiErrorDetail } from "../../../api/client";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const emptyForm = { name: "", unit: "unit", unit_price: "", description: "" };

export const VendorProductsModal = ({ vendor, open, onOpenChange }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: products } = useQuery({
    queryKey: ["vendorProducts", vendor?.id, "all"],
    queryFn: () => api.get(`/vendors/${vendor.id}/products?include_inactive=true`).then((r) => r.data),
    enabled: open && !!vendor,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["vendorProducts"] });

  const add = async () => {
    if (!form.name.trim() || form.unit_price === "" || Number(form.unit_price) < 0) {
      toast.error("Product name and a valid unit price are required");
      return;
    }
    try {
      await api.post(`/vendors/${vendor.id}/products`, {
        name: form.name.trim(), unit: form.unit || "unit",
        unit_price: Number(form.unit_price), description: form.description || null,
      });
      toast.success("Product added");
      setForm(emptyForm);
      refresh();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const toggle = async (p) => {
    try {
      await api.patch(`/vendor-products/${p.id}`, { is_active: !p.is_active });
      toast.success(p.is_active ? "Product deactivated" : "Product activated");
      refresh();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const updatePrice = async (p, price) => {
    if (price === "" || Number(price) < 0 || Number(price) === p.unit_price) return;
    try {
      await api.patch(`/vendor-products/${p.id}`, { unit_price: Number(price) });
      toast.success("Price updated");
      refresh();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  if (!vendor) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md max-w-lg" data-testid="vendor-products-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide">Products — {vendor.name}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">Manage this vendor's product catalog and prices.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1" data-testid="vendor-products-list">
          {(products || []).map((p) => (
            <div key={p.id} className={`flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-md p-2.5 ${!p.is_active ? "opacity-50" : ""}`} data-testid={`product-row-${p.id}`}>
              <Package size={14} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{fmt(p.unit_price)} / {p.unit}</div>
              </div>
              <Input type="number" defaultValue={p.unit_price} onBlur={(e) => updatePrice(p, e.target.value)}
                data-testid={`product-price-input-${p.id}`}
                className="w-28 h-8 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md text-sm" />
              <Button type="button" size="sm" variant="outline" onClick={() => toggle(p)} data-testid={`product-toggle-${p.id}`}
                className="rounded-md border-slate-300 dark:border-slate-700 text-xs shrink-0">
                {p.is_active ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
          {(products || []).length === 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-md p-5 text-center" data-testid="products-empty">
              No products yet — add the first one below.
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Product name *" value={form.name} onChange={(e) => set("name", e.target.value)}
              data-testid="product-name-input" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
            <Input placeholder="Unit (bag, ton, nos…)" value={form.unit} onChange={(e) => set("unit", e.target.value)}
              data-testid="product-unit-input" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Input type="number" placeholder="Unit price (₹) *" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)}
              data-testid="product-price-input" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
            <Button type="button" onClick={add} data-testid="product-add-button"
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white shrink-0"><Plus size={14} /> Add Product</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
