import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import api, { formatApiErrorDetail } from "../../../api/client";

const WAGE_TYPES = [["daily", "Daily"], ["monthly", "Monthly"], ["piece_rate", "Piece Rate"]];
const empty = { name: "", role_title: "", phone: "", wage_type: "daily", daily_wage: "", joining_date: "" };

export const EmployeeFormModal = ({ open, onOpenChange, projectId, employee }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open)
      setForm(employee ? {
        name: employee.name || "", role_title: employee.role_title || "", phone: employee.phone || "",
        wage_type: employee.wage_type || "daily", daily_wage: employee.daily_wage ?? "",
        joining_date: employee.joining_date || "",
      } : empty);
  }, [open, employee]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (ev) => {
    ev.preventDefault();
    if (!form.name.trim()) { toast.error("Employee name is required"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(), role_title: form.role_title || null, phone: form.phone || null,
      wage_type: form.wage_type, daily_wage: form.daily_wage !== "" ? Number(form.daily_wage) : null,
      joining_date: form.joining_date || null,
    };
    try {
      if (employee) await api.patch(`/employees/${employee.id}`, payload);
      else await api.post(`/projects/${projectId}/employees`, payload);
      toast.success(employee ? "Employee updated" : "Employee added");
      qc.invalidateQueries({ queryKey: ["employees", projectId] });
      qc.invalidateQueries({ queryKey: ["labourCost", projectId] });
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 rounded-none max-w-md" data-testid="employee-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide">
            {employee ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Field workers for this project — separate from portal users.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Name *</Label>
              <Input data-testid="employee-name-input" value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Role</Label>
              <Input data-testid="employee-role-input" placeholder="Mason, Electrician…" value={form.role_title} onChange={(e) => set("role_title", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Phone</Label>
              <Input data-testid="employee-phone-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Joining Date</Label>
              <Input data-testid="employee-joining-input" type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Wage Type</Label>
              <Select value={form.wage_type} onValueChange={(v) => set("wage_type", v)}>
                <SelectTrigger data-testid="employee-wagetype-select" className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {WAGE_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Daily Wage (₹)</Label>
              <Input data-testid="employee-wage-input" type="number" value={form.daily_wage} onChange={(e) => set("daily_wage", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none border-zinc-700" data-testid="employee-form-cancel">Cancel</Button>
            <Button type="submit" disabled={saving} data-testid="employee-form-submit" className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold uppercase tracking-wide">
              {employee ? "Save Changes" : "Add Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
