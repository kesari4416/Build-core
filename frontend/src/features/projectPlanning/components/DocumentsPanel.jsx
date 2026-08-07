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
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
        <FolderOpen size={14} strokeWidth={2.5} className="text-orange-500" />
        Documents · {docs?.length ?? 0}
      </div>
      {canWrite && <DocumentUploadCard projectId={projectId} />}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} strokeWidth={2.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input data-testid="document-search-input" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full bg-zinc-900 border border-zinc-700 pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="document-filter-category" className="w-32 h-auto py-1.5 text-xs bg-zinc-900 border-zinc-700 rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All</SelectItem>
            {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 bg-zinc-900 rounded-none" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-900/40 p-6 text-center text-xs text-zinc-500" data-testid="documents-empty-state">
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
