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
    <div className="border border-zinc-800 bg-zinc-900/40 p-3 flex items-start gap-3" data-testid={`document-item-${doc.id}`}>
      <div className="bg-zinc-800 border border-zinc-700 p-2 shrink-0">
        <Icon size={16} strokeWidth={2.5} className="text-orange-500" />
      </div>
      <div className="min-w-0 flex-1">
        <a href={assetUrl(doc.file_url)} target="_blank" rel="noreferrer" data-testid={`document-link-${doc.id}`}
          className="block text-sm font-semibold text-white truncate hover:text-orange-500 transition-colors">
          {doc.document_name}
        </a>
        <div className="text-[11px] text-zinc-500 mt-0.5">
          {doc.uploader_name} · {doc.uploaded_at?.slice(0, 10)} · {fmtSize(doc.file_size)}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="border border-zinc-700 text-zinc-400 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] font-semibold">
            {doc.category || "Other"}
          </span>
          {doc.is_client_visible === false && (
            <span className="border border-zinc-700 text-zinc-500 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] font-semibold">
              Internal
            </span>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="flex gap-1 shrink-0">
          <button data-testid={`document-rename-${doc.id}`} onClick={() => { setName(doc.document_name); setCategory(doc.category || "Other"); setRenameOpen(true); }}
            className="p-1.5 text-zinc-500 hover:text-orange-500 transition-colors"><Pencil size={13} strokeWidth={2.5} /></button>
          <button data-testid={`document-delete-${doc.id}`} onClick={remove}
            className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={13} strokeWidth={2.5} /></button>
        </div>
      )}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 rounded-none max-w-sm" data-testid="document-rename-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase tracking-wide">Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Document Name</Label>
              <Input data-testid="document-rename-input" value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="document-rename-category" className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRenameOpen(false)} className="rounded-none border-zinc-700">Cancel</Button>
              <Button data-testid="document-rename-save" onClick={saveRename} disabled={patch.isPending}
                className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold uppercase tracking-wide">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
