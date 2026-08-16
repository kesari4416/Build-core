import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import api, { formatApiErrorDetail } from "../../../api/client";

const CATEGORIES = ["Client Modification", "Rework", "Design Change", "Site Condition"];
const empty = { title: "", description: "", category: "Client Modification", phase_id: "", estimated_cost: "", estimated_time_impact_days: "0", note: "" };

export const ChangeOrderFormModal = ({ open, onOpenChange, projectId, phases, co }) => {
  const [form, setForm] = useState(empty);
  const [submitNow, setSubmitNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const isRevise = Boolean(co);

  useEffect(() => {
    if (open) {
      setSubmitNow(true);
      setForm(co ? { ...empty, estimated_cost: String(co.estimated_cost ?? ""), estimated_time_impact_days: String(co.estimated_time_impact_days ?? 0) } : empty);
    }
  }, [open, co]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const cost = Number(form.estimated_cost);
  const valid = isRevise ? form.estimated_cost !== "" && cost >= 0 : form.title.trim() && form.estimated_cost !== "" && cost >= 0;

  const submit = async (ev) => {
    ev.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      if (isRevise) {
        await api.post(`/change-orders/${co.id}/revise`, {
          estimated_cost: cost,
          estimated_time_impact_days: Number(form.estimated_time_impact_days) || 0,
          note: form.note.trim() || null,
        });
        toast.success(`Revised estimate submitted for ${co.co_number}`);
      } else {
        await api.post(`/projects/${projectId}/change-orders`, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          phase_id: form.phase_id ? Number(form.phase_id) : null,
          estimated_cost: cost,
          estimated_time_impact_days: Number(form.estimated_time_impact_days) || 0,
          submit: submitNow,
        });
        toast.success(submitNow ? "Change order sent to client for review" : "Change order saved as draft");
      }
      ["changeOrders", "projFinance", "projectBalanceSheet"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md max-w-lg" data-testid="co-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide">
            {isRevise ? `Revise ${co.co_number}` : "New Change Order"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {isRevise ? "Submit an updated cost/time estimate for client review." : "Propose extra or modified work outside the original contract scope."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!isRevise && (
            <>
              <div>
                <Label className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Title *</Label>
                <Input data-testid="co-title-input" value={form.title} onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Client requested marble flooring upgrade"
                  className="mt-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Category</Label>
                  <Select value={form.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger data-testid="co-category-select" className="mt-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Linked Phase</Label>
                  <Select value={form.phase_id || "none"} onValueChange={(v) => set("phase_id", v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="co-phase-select" className="mt-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                      <SelectItem value="none">— None —</SelectItem>
                      {(phases || []).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Scope Description</Label>
                <Textarea data-testid="co-description-input" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe the extra / modified work and why it is outside the original scope"
                  className="mt-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Estimated Cost (₹) *</Label>
              <Input data-testid="co-cost-input" type="number" min="0" step="any" value={form.estimated_cost}
                onChange={(e) => set("estimated_cost", e.target.value)}
                className="mt-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Time Impact (days)</Label>
              <Input data-testid="co-days-input" type="number" min="0" value={form.estimated_time_impact_days}
                onChange={(e) => set("estimated_time_impact_days", e.target.value)}
                className="mt-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
          </div>
          {isRevise ? (
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Revision Note</Label>
              <Textarea data-testid="co-revision-note-input" rows={2} value={form.note} onChange={(e) => set("note", e.target.value)}
                placeholder="What changed in this estimate?"
                className="mt-1.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
          ) : (
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input data-testid="co-submit-now-checkbox" type="checkbox" checked={submitNow} onChange={(e) => setSubmitNow(e.target.checked)}
                className="h-4 w-4 accent-blue-600" />
              Send to client for review immediately (uncheck to save as draft)
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-md border-slate-300 dark:border-slate-700">Cancel</Button>
            <Button type="submit" disabled={!valid || saving} data-testid="co-form-submit"
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-wide">
              {isRevise ? "Submit Revised Estimate" : submitNow ? "Create & Send" : "Save Draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
