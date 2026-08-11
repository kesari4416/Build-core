import { useState } from "react";
import { Search, FolderOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Skeleton } from "../../../components/ui/skeleton";
import { useDocuments } from "../hooks/useProjects";
import { DocumentUploadCard, DOC_CATEGORIES } from "./DocumentUploadCard";
import { DocumentListItem } from "./DocumentListItem";

export const DocumentsPanel = ({ projectId, canWrite, isAdmin }) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const { data: docs, isLoading } = useDocuments(projectId);

  const filtered = (docs || []).filter((d) => {
    if (category !== "all" && (d.category || "Other") !== category) return false;
    if (search && !d.document_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4" data-testid="documents-panel">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
        <FolderOpen size={14} strokeWidth={2.5} className="text-blue-600" />
        Documents · {docs?.length ?? 0}
      </div>
      {canWrite && <DocumentUploadCard projectId={projectId} />}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} strokeWidth={2.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input data-testid="document-search-input" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full bg-white border border-slate-300 pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="document-filter-category" className="w-32 h-auto py-1.5 text-xs bg-white border-slate-300 rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-300">
            <SelectItem value="all">All</SelectItem>
            {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 bg-white rounded-md" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border border-slate-200 bg-white shadow-sm p-6 text-center text-xs text-slate-500" data-testid="documents-empty-state">
          No documents found.
        </div>
      ) : (
        <div className="space-y-2" data-testid="document-list">
          {filtered.map((d) => (
            <DocumentListItem key={d.id} doc={d} isAdmin={isAdmin} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
};
