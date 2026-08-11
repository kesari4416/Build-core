import { useState } from "react";
import { toast } from "sonner";
import { FileText, FileImage, FileSpreadsheet, File, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { assetUrl, formatApiErrorDetail } from "../../../api/client";
import { usePatchDocument, useDeleteDocument } from "../hooks/useProjects";
import { DOC_CATEGORIES } from "./DocumentUploadCard";

const iconFor = (type) => {
  if (type === "pdf") return FileText;
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(type)) return FileImage;
  if (["xls", "xlsx", "csv"].includes(type)) return FileSpreadsheet;
  return File;
};

const fmtSize = (b) => (b == null ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export const DocumentListItem = ({ doc, isAdmin, projectId }) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(doc.document_name);
  const [category, setCategory] = useState(doc.category || "Other");
  const patch = usePatchDocument();
  const del = useDeleteDocument();
  const Icon = iconFor(doc.file_type);

  const saveRename = async () => {
    if (!name.trim()) return;
    try {
      await patch.mutateAsync({ documentId: doc.id, projectId, data: { document_name: name.trim(), category } });
      toast.success("Document updated");
      setRenameOpen(false);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${doc.document_name}"?`)) return;
    try {
      await del.mutateAsync({ documentId: doc.id, projectId });
      toast.success("Document deleted");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <div className="border border-slate-200 bg-white shadow-sm p-3 flex items-start gap-3" data-testid={`document-item-${doc.id}`}>
      <div className="bg-slate-200 border border-slate-300 p-2 shrink-0">
        <Icon size={16} strokeWidth={2.5} className="text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <a href={assetUrl(doc.file_url)} target="_blank" rel="noreferrer" data-testid={`document-link-${doc.id}`}
          className="block text-sm font-semibold text-slate-900 truncate hover:text-blue-600 transition-colors">
          {doc.document_name}
        </a>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {doc.uploader_name} · {doc.uploaded_at?.slice(0, 10)} · {fmtSize(doc.file_size)}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="border border-slate-300 text-slate-500 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] font-semibold">
            {doc.category || "Other"}
          </span>
          {doc.is_client_visible === false && (
            <span className="border border-slate-300 text-slate-500 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] font-semibold">
              Internal
            </span>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="flex gap-1 shrink-0">
          <button data-testid={`document-rename-${doc.id}`} onClick={() => { setName(doc.document_name); setCategory(doc.category || "Other"); setRenameOpen(true); }}
            className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors"><Pencil size={13} strokeWidth={2.5} /></button>
          <button data-testid={`document-delete-${doc.id}`} onClick={remove}
            className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={13} strokeWidth={2.5} /></button>
        </div>
      )}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="bg-white border-slate-300 rounded-md max-w-sm" data-testid="document-rename-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase tracking-wide">Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Document Name</Label>
              <Input data-testid="document-rename-input" value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1.5 bg-white border-slate-300 rounded-md" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-slate-500">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="document-rename-category" className="mt-1.5 bg-white border-slate-300 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRenameOpen(false)} className="rounded-md border-slate-300">Cancel</Button>
              <Button data-testid="document-rename-save" onClick={saveRename} disabled={patch.isPending}
                className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-wide">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
