import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import api, { formatApiErrorDetail } from "../../../api/client";

const TYPES = ["Supplier", "Subcontractor", "Consultant"];
const empty = { name: "", vendor_type: "Supplier", trade: "", contact_name: "", email: "", phone: "", insurance_expiry: "" };

export const VendorFormModal = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(empty); }, [open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (ev) => {
    ev.preventDefault();
    if (!form.name.trim()) { toast.error("Vendor name is required"); return; }
    setSaving(true);
    try {
      await api.post("/vendors", {
        name: form.name.trim(), vendor_type: form.vendor_type, trade: form.trade || null,
        contact_name: form.contact_name || null, email: form.email || null, phone: form.phone || null,
        insurance_expiry: form.insurance_expiry || null,
      });
      toast.success("Vendor created");
      qc.invalidateQueries({ queryKey: ["vendors"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-300 rounded-md max-w-md" data-testid="vendor-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide">Add Vendor</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">Register a supplier, subcontractor or consultant.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Name *</Label>
              <Input data-testid="vendor-name-input" value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5 bg-white border-slate-300 rounded-md" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Type</Label>
              <Select value={form.vendor_type} onValueChange={(v) => set("vendor_type", v)}>
                <SelectTrigger data-testid="vendor-type-select" className="mt-1.5 bg-white border-slate-300 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Trade</Label>
              <Input data-testid="vendor-trade-input" placeholder="Steel, Glazing…" value={form.trade} onChange={(e) => set("trade", e.target.value)} className="mt-1.5 bg-white border-slate-300 rounded-md" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Contact Name</Label>
              <Input data-testid="vendor-contact-input" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className="mt-1.5 bg-white border-slate-300 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Email</Label>
              <Input data-testid="vendor-email-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1.5 bg-white border-slate-300 rounded-md" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Phone</Label>
              <Input data-testid="vendor-phone-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1.5 bg-white border-slate-300 rounded-md" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Insurance Expiry</Label>
            <Input data-testid="vendor-insurance-input" type="date" value={form.insurance_expiry} onChange={(e) => set("insurance_expiry", e.target.value)} className="mt-1.5 bg-white border-slate-300 rounded-md" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-md border-slate-300" data-testid="vendor-form-cancel">Cancel</Button>
            <Button type="submit" disabled={saving} data-testid="vendor-form-submit" className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-wide">Create Vendor</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
