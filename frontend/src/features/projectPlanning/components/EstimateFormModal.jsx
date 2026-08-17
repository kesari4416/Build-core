import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, FileText, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import api, { assetUrl, formatApiErrorDetail } from "../../../api/client";
import { InlineAddSelect } from "./InlineAddSelect";
import { labelCls, inputCls } from "./AddIncomeModal";

const empty = { project_name: "", phase: "", category_id: "", total_amount: "", status_id: "" };

export const EstimateFormModal = ({ open, onOpenChange, categories, statuses }) => {
  const [form, setForm] = useState(empty);
  const [drawing, setDrawing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) { setForm(empty); setDrawing(null); }
  }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const amount = Number(form.total_amount);
  const valid = form.project_name.trim() && form.category_id && form.status_id && form.total_amount !== "" && amount > 0;

  const onFile = async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/upload", fd);
      setDrawing({ url: data.url, filename: data.filename });
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await api.post("/estimates", {
        project_name: form.project_name.trim(),
        phase: form.phase.trim() || null,
        category_id: Number(form.category_id),
        drawing_url: drawing?.url || null,
        drawing_filename: drawing?.filename || null,
        total_amount: amount,
        status_id: Number(form.status_id),
      });
      toast.success("Estimate created");
      qc.invalidateQueries({ queryKey: ["estimates"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md max-w-lg max-h-[90vh] overflow-y-auto" data-testid="estimate-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide">Create Estimate</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Attach a drawing and record the estimated cost for a project scope.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className={labelCls}>Project Name *</Label>
            <Input data-testid="estimate-project-input" value={form.project_name}
              onChange={(e) => set("project_name", e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label className={labelCls}>Phase (optional)</Label>
            <Input data-testid="estimate-phase-input" value={form.phase}
              onChange={(e) => set("phase", e.target.value)} placeholder="e.g. Foundation" className={inputCls} />
          </div>
          <div>
            <Label className={labelCls}>Category *</Label>
            <InlineAddSelect value={form.category_id} onChange={(v) => set("category_id", v)}
              options={categories} endpoint="/estimate-categories" placeholder="Select category"
              addLabel="+ Add New Category" testPrefix="estimate-category"
              onCreated={(c) => qc.setQueryData(["estimateCategories"], (old) => [...(old || []), c])} />
          </div>
          <div>
            <Label className={labelCls}>Drawing (JPG / PNG / PDF)</Label>
            <div className="mt-1.5 flex items-center gap-3">
              {drawing ? (
                <div className="relative group" data-testid="estimate-drawing-preview">
                  {/\.pdf$/i.test(drawing.url) ? (
                    <div className="w-24 h-20 border border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-950">
                      <FileText size={20} className="text-red-500" />
                      <span className="text-[8px] text-slate-500 dark:text-slate-400 px-1 truncate w-full text-center">{drawing.filename}</span>
                    </div>
                  ) : (
                    <img src={assetUrl(drawing.url)} alt={drawing.filename} className="w-24 h-20 object-cover border border-slate-300 dark:border-slate-700" />
                  )}
                  <button type="button" data-testid="estimate-drawing-remove" onClick={() => setDrawing(null)}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <button type="button" data-testid="estimate-drawing-button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-24 h-20 border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors">
                  <ImagePlus size={18} strokeWidth={2} />
                  <span className="text-[9px] uppercase tracking-wide">{uploading ? "Uploading…" : "Upload"}</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" hidden onChange={onFile} data-testid="estimate-drawing-input" />
            </div>
          </div>
          <div>
            <Label className={labelCls}>Total Amount (₹) *</Label>
            <Input data-testid="estimate-amount-input" type="number" min="0" step="any" value={form.total_amount}
              onChange={(e) => set("total_amount", e.target.value)} className={inputCls} />
            {form.total_amount !== "" && !(amount > 0) && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1" data-testid="estimate-amount-error">Enter a valid amount greater than 0</p>
            )}
          </div>
          <div>
            <Label className={labelCls}>Current Status *</Label>
            <InlineAddSelect value={form.status_id} onChange={(v) => set("status_id", v)}
              options={statuses} endpoint="/estimate-statuses" placeholder="Select status"
              addLabel="+ Add New Status" testPrefix="estimate-status"
              onCreated={(s) => qc.setQueryData(["estimateStatuses"], (old) => [...(old || []), s])} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="estimate-form-cancel"
              className="rounded-md border-slate-300 dark:border-slate-700">Cancel</Button>
            <Button type="submit" disabled={!valid || saving || uploading} data-testid="estimate-form-submit"
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-wide">Save Estimate</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
