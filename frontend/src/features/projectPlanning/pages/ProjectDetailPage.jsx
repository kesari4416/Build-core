import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, AlertTriangle, MapPin, IndianRupee, CalendarDays, UserRound, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Skeleton } from "../../../components/ui/skeleton";
import { Button } from "../../../components/ui/button";
import { useProject, useUpdatesFeed } from "../hooks/useProjects";
import { ProjectStatusBadge } from "../components/ProjectStatusBadge";
import { PhaseTimeline } from "../components/PhaseTimeline";
import { PhaseFormModal } from "../components/PhaseFormModal";
import { ProgressUpdateFeed } from "../components/ProgressUpdateFeed";
import { ProgressUpdateFormModal } from "../components/ProgressUpdateFormModal";
import { ProjectFormModal } from "../components/ProjectFormModal";
import { useAuth } from "../../../context/AuthContext";

const fmtBudget = (b) => (b == null ? "—" : `₹${(b / 10000000).toFixed(2)} Cr`);

const InfoCell = ({ icon: Icon, label, value, testId }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-5" data-testid={testId}>
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
      <Icon size={13} strokeWidth={2.5} /> {label}
    </div>
    <div className="font-heading font-semibold text-xl mt-2 leading-none text-white">{value || "—"}</div>
  </div>
);

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user, canWrite: roleCanWrite, isAdmin } = useAuth();
  const { data: project, isLoading, isError } = useProject(id);
  const { data: feed, isLoading: feedLoading } = useUpdatesFeed(id);
  const [phaseModal, setPhaseModal] = useState({ open: false, phase: null });
  const [updateModal, setUpdateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const canWrite = roleCanWrite && (isAdmin || project?.site_engineer_id === user?.id);

  if (isLoading)
    return <div className="p-8 space-y-4"><Skeleton className="h-16 bg-zinc-900 rounded-none w-1/2" /><Skeleton className="h-64 bg-zinc-900 rounded-none" /></div>;
  if (isError || !project)
    return <div className="p-8"><div className="border border-red-500/40 bg-red-500/10 p-8 text-center text-red-400" data-testid="project-error">Project not found or failed to load.</div></div>;

  return (
    <div className="p-8" data-testid="project-detail-page">
      <Link to="/admin/projects" data-testid="back-to-projects" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] font-semibold text-zinc-500 hover:text-orange-500 transition-colors mb-4">
        <ArrowLeft size={14} strokeWidth={2.5} /> All Projects
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none" data-testid="project-title">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            {project.has_active_issues && (
              <span className="flex items-center gap-1.5 border border-red-500/40 bg-red-500/10 text-red-400 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold" data-testid="active-issues-flag">
                <AlertTriangle size={12} strokeWidth={2.5} /> Active Issues
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 mt-2">
            <MapPin size={13} strokeWidth={2.5} /> {project.location || "Location not set"} · Client: {project.client_name}
          </div>
        </div>
        {canWrite && (
          <Button data-testid="edit-project-button" onClick={() => setEditModal(true)} variant="outline" className="rounded-none border-zinc-700 hover:border-orange-500">
            <Pencil size={14} strokeWidth={2.5} /> Edit Project
          </Button>
        )}
      </div>

      <div className="border border-zinc-800 bg-zinc-900/60 p-5 mb-6" data-testid="overall-progress">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Overall Completion</span>
          <span className="font-heading font-bold text-2xl text-orange-500 leading-none">{project.percent_complete}%</span>
        </div>
        <div className="h-2.5 bg-zinc-800">
          <div className="h-full bg-orange-500 transition-[width] duration-500" style={{ width: `${project.percent_complete}%` }} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-transparent border-b border-zinc-800 rounded-none w-full justify-start h-auto p-0 gap-1">
          {["overview", "phases", "tracking"].map((t) => (
            <TabsTrigger key={t} value={t} data-testid={`tab-${t}`}
              className="rounded-none px-5 py-2.5 text-xs uppercase tracking-[0.15em] font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none text-zinc-500 border-b-2 border-transparent">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6" data-testid="overview-tab-content">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCell icon={IndianRupee} label="Budget" value={fmtBudget(project.budget)} testId="overview-budget" />
            <InfoCell icon={Users} label="Client" value={project.client_name} testId="overview-client" />
            <InfoCell icon={UserRound} label="Site Engineer" value={project.site_engineer_name} testId="overview-engineer" />
            <InfoCell icon={CalendarDays} label="Planned Start" value={project.start_date_planned} testId="overview-start-planned" />
            <InfoCell icon={CalendarDays} label="Planned End" value={project.end_date_planned} testId="overview-end-planned" />
            <InfoCell icon={CalendarDays} label="Actual Start" value={project.start_date_actual} testId="overview-start-actual" />
          </div>
        </TabsContent>

        <TabsContent value="phases" className="mt-6" data-testid="phases-tab-content">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Phase Timeline · {project.phases?.length || 0} phases</div>
            {canWrite && (
              <Button data-testid="add-phase-button" onClick={() => setPhaseModal({ open: true, phase: null })} size="sm"
                className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-[0.12em]">
                <Plus size={14} strokeWidth={3} /> Add Phase
              </Button>
            )}
          </div>
          <PhaseTimeline phases={project.phases} canWrite={canWrite} onEdit={(ph) => setPhaseModal({ open: true, phase: ph })} />
        </TabsContent>

        <TabsContent value="tracking" className="mt-6" data-testid="tracking-tab-content">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Progress Feed · {feed?.total ?? 0} updates</div>
            {canWrite && (
              <Button data-testid="post-update-button" onClick={() => setUpdateModal(true)} size="sm"
                className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-[0.12em]">
                <Plus size={14} strokeWidth={3} /> Post Update
              </Button>
            )}
          </div>
          {feedLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 bg-zinc-900 rounded-none" />)}</div>
          ) : (
            <ProgressUpdateFeed updates={feed?.items} />
          )}
        </TabsContent>
      </Tabs>

      <PhaseFormModal open={phaseModal.open} onOpenChange={(o) => setPhaseModal({ open: o, phase: o ? phaseModal.phase : null })}
        projectId={Number(id)} phase={phaseModal.phase}
        nextOrder={(project.phases?.reduce((m, p) => Math.max(m, p.sequence_order), 0) || 0) + 1} />
      <ProgressUpdateFormModal open={updateModal} onOpenChange={setUpdateModal} projectId={Number(id)} phases={project.phases} />
      <ProjectFormModal open={editModal} onOpenChange={setEditModal} project={project} />
    </div>
  );
}
