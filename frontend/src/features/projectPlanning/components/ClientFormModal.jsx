import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import api, { formatApiErrorDetail } from "../../../api/client";

const empty = { name: "", company: "", email: "", phone: "", address: "" };

export const ClientFormModal = ({ open, onOpenChange, client }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open)
      setForm(client ? {
        name: client.name || "", company: client.company || "", email: client.email || "",
        phone: client.phone || "", address: client.address || "",
      } : empty);
  }, [open, client]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (ev) => {
    ev.preventDefault();
    if (!form.name.trim()) { toast.error("Client name is required"); return; }
    setSaving(true);
    try {
      if (client) await api.patch(`/clients/${client.id}`, form);
      else await api.post("/clients", form);
      toast.success(client ? "Client updated" : "Client created");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 rounded-none max-w-md" data-testid="client-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide">
            {client ? "Edit Client" : "New Client"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {client ? "Update client details." : "Add a new client to the directory."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Name *</Label>
            <Input data-testid="client-name-input" value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Company</Label>
            <Input data-testid="client-company-input" value={form.company} onChange={(e) => set("company", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Email</Label>
              <Input data-testid="client-email-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Phone</Label>
              <Input data-testid="client-phone-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Address</Label>
            <Input data-testid="client-address-input" value={form.address} onChange={(e) => set("address", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none border-zinc-700" data-testid="client-form-cancel">Cancel</Button>
            <Button type="submit" disabled={saving} data-testid="client-form-submit" className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold uppercase tracking-wide">
              {client ? "Save Changes" : "Create Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
