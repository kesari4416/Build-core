import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import debounce from "lodash/debounce";
import { useProjects, useClients, useEngineers } from "../hooks/useProjects";
import { ProjectTable } from "../components/ProjectTable";
import { ProjectFormModal } from "../components/ProjectFormModal";
import { Skeleton } from "../../../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";

const STATUSES = ["Planning", "Ongoing", "OnHold", "Completed", "Cancelled"];
const PAGE_SIZE = 10;

export default function ProjectListPage() {
  const { isAdmin, canWrite, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [modalOpen, setModalOpen] = useState(false);

  const filters = {
    limit: PAGE_SIZE,
    offset: Number(params.get("offset") || 0),
  };
  if (params.get("client_id")) filters.client_id = params.get("client_id");
  if (params.get("status")) filters.status = params.get("status");
  if (params.get("site_engineer_id")) filters.site_engineer_id = params.get("site_engineer_id");
  if (params.get("search")) filters.search = params.get("search");

  const { data, isLoading, isError } = useProjects(filters);
  const { data: clients } = useClients(canWrite);
  const { data: engineers } = useEngineers(canWrite);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete("offset");
    setParams(next);
  };

  const debouncedSearch = useMemo(() => debounce((v) => setParam("search", v), 350), [params]); // eslint-disable-line

  const total = data?.total || 0;
  const offset = filters.offset;

  return (
    <div className="p-8" data-testid="project-list-page">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-orange-500 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Project Planning</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none">Projects</h1>
        </div>
        {isAdmin && (
          <Button data-testid="new-project-button" onClick={() => setModalOpen(true)}
            className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-[0.12em]">
            <Plus size={16} strokeWidth={3} /> New Project
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input data-testid="project-search-input" value={search}
            onChange={(e) => { setSearch(e.target.value); debouncedSearch(e.target.value); }}
            placeholder="Search projects…"
            className="w-full bg-zinc-900 border border-zinc-700 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        {user?.role !== "Client" && (
          <Select value={params.get("client_id") || "all"} onValueChange={(v) => setParam("client_id", v === "all" ? "" : v)}>
            <SelectTrigger data-testid="filter-client-select" className="w-44 bg-zinc-900 border-zinc-700 rounded-none">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Clients</SelectItem>
              {clients?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={params.get("status") || "all"} onValueChange={(v) => setParam("status", v === "all" ? "" : v)}>
          <SelectTrigger data-testid="filter-status-select" className="w-40 bg-zinc-900 border-zinc-700 rounded-none">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {user?.role !== "Client" && (
          <Select value={params.get("site_engineer_id") || "all"} onValueChange={(v) => setParam("site_engineer_id", v === "all" ? "" : v)}>
            <SelectTrigger data-testid="filter-engineer-select" className="w-44 bg-zinc-900 border-zinc-700 rounded-none">
              <SelectValue placeholder="All Engineers" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Engineers</SelectItem>
              {engineers?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2" data-testid="projects-loading">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 bg-zinc-900 rounded-none" />)}
        </div>
      ) : isError ? (
        <div className="border border-red-500/40 bg-red-500/10 p-8 text-center text-red-400" data-testid="projects-error">
          Failed to load projects. Please try again.
        </div>
      ) : (
        <>
          <ProjectTable projects={data?.items} />
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4" data-testid="pagination">
              <span className="text-xs text-zinc-500">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} data-testid="pagination-prev"
                  onClick={() => { const n = new URLSearchParams(params); n.set("offset", Math.max(0, offset - PAGE_SIZE)); setParams(n); }}
                  className="rounded-none border-zinc-700">Prev</Button>
                <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} data-testid="pagination-next"
                  onClick={() => { const n = new URLSearchParams(params); n.set("offset", offset + PAGE_SIZE); setParams(n); }}
                  className="rounded-none border-zinc-700">Next</Button>
              </div>
            </div>
          )}
        </>
      )}
      <ProjectFormModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
