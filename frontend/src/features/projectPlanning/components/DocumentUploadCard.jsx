import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { formatApiErrorDetail } from "../../../api/client";
import { useUploadDocument } from "../hooks/useProjects";

export const DOC_CATEGORIES = ["Drawing", "Contract", "Invoice", "Approval", "Other"];

export const DocumentUploadCard = ({ projectId }) => {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [visible, setVisible] = useState(true);
  const fileRef = useRef(null);
  const upload = useUploadDocument();

  useEffect(() => {
    if (file) setName(file.name);
  }, [file]);

  const reset = () => {
    setFile(null); setName(""); setCategory("Other"); setVisible(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("document_name", name.trim());
    fd.append("category", category);
    fd.append("is_client_visible", visible);
    try {
      await upload.mutateAsync({ projectId, formData: fd });
      toast.success("Document uploaded");
      reset();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/60 p-4" data-testid="document-upload-card">
      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">Upload Document</div>
      <input ref={fileRef} type="file" hidden data-testid="document-file-input"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.dwg,.zip"
        onChange={(e) => setFile(e.target.files?.[0] || null)} />
      {!file ? (
        <button data-testid="document-pick-button" onClick={() => fileRef.current?.click()}
          className="w-full border border-dashed border-zinc-600 py-6 flex flex-col items-center gap-2 text-zinc-500 hover:text-orange-500 hover:border-orange-500 transition-colors">
          <Upload size={20} strokeWidth={2.5} />
          <span className="text-xs uppercase tracking-[0.15em] font-semibold">Choose file</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="truncate">{file.name}</span>
            <button onClick={reset} data-testid="document-clear-file" className="text-zinc-500 hover:text-red-400">
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Document Name</Label>
            <Input data-testid="document-name-input" value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="document-category-select" className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch data-testid="document-visible-switch" checked={visible} onCheckedChange={setVisible} />
            <span className="text-xs text-zinc-300">Visible to client</span>
          </div>
          <Button data-testid="document-upload-submit" onClick={submit} disabled={upload.isPending}
            className="w-full rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-[0.12em]">
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      )}
    </div>
  );
};
