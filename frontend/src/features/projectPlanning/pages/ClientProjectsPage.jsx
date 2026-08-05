import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useClient, useClientProjects } from "../hooks/useProjects";
import { ProjectTable } from "../components/ProjectTable";
import { ProjectFormModal } from "../components/ProjectFormModal";
import { Skeleton } from "../../../components/ui/skeleton";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";

export default function ClientProjectsPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { data: client } = useClient(id);
  const { data: projects, isLoading, isError } = useClientProjects(id);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="p-8" data-testid="client-projects-page">
      <Link to="/admin/clients" data-testid="back-to-clients" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] font-semibold text-zinc-500 hover:text-orange-500 transition-colors mb-4">
        <ArrowLeft size={14} strokeWidth={2.5} /> All Clients
      </Link>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-orange-500 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Client Portfolio</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none" data-testid="client-name-heading">
            {client?.name || "…"}
          </h1>
          <div className="text-sm text-zinc-500 mt-2">{client?.company}</div>
        </div>
        {isAdmin && (
          <Button data-testid="client-new-project-button" onClick={() => setModalOpen(true)}
            className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-[0.12em]">
            <Plus size={16} strokeWidth={3} /> New Project
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 bg-zinc-900 rounded-none" />)}</div>
      ) : isError ? (
        <div className="border border-red-500/40 bg-red-500/10 p-8 text-center text-red-400">Failed to load client projects.</div>
      ) : (
        <ProjectTable projects={projects} />
      )}
      <ProjectFormModal open={modalOpen} onOpenChange={setModalOpen} defaultClientId={Number(id)} />
    </div>
  );
}
