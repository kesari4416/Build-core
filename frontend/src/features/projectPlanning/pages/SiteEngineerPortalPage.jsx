import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { HardHat, Plus, ArrowRight, ClipboardCheck, Tags } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { DailyAttendanceCard } from "../components/DailyAttendanceCard";
import { EmployeeFormModal } from "../components/EmployeeFormModal";
import { CategoryManagerModal } from "../components/CategoryManagerModal";

const iso = (d) => d.toISOString().slice(0, 10);
const todayIso = () => iso(new Date());
const minDate = () => { const d = new Date(); d.setDate(d.getDate() - 3); return iso(d); };

export default function SiteEngineerPortalPage() {
  const { user, isAdmin } = useAuth();
  const isClient = user?.role === "Client";
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [day, setDay] = useState(todayIso());
  const [modal, setModal] = useState(false);
  const [catModal, setCatModal] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ["fieldProjects"],
    queryFn: () => api.get("/projects", { params: { limit: 200 } }).then((r) => r.data.items),
  });

  useEffect(() => {
    if (!projectId && projects?.length) setProjectId(String(projects[0].id));
  }, [projects, projectId]);

  const pid = projectId ? Number(projectId) : null;
  const { data: employees } = useQuery({
    queryKey: ["employees", pid],
    queryFn: () => api.get(`/projects/${pid}/employees`).then((r) => r.data),
    enabled: !!pid,
  });
  const { data: attendance } = useQuery({
    queryKey: ["attendance", pid, day, day],
    queryFn: () => api.get(`/projects/${pid}/attendance`, { params: { date_from: day, date_to: day } }).then((r) => r.data),
    enabled: !!pid && !!day,
  });
  const { data: allEmployees } = useQuery({
    queryKey: ["allEmployees"],
    queryFn: () => api.get("/employees").then((r) => r.data),
    enabled: !isClient,
  });

  const active = (employees || []).filter((e) => e.status === "active");
  const statusMap = {};
  (attendance || []).forEach((a) => { statusMap[a.employee_id] = a.status; });
  const markedCount = active.filter((e) => statusMap[e.id]).length;

  const mark = async (employee, status) => {
    try {
      await api.post(`/projects/${pid}/attendance`, { employee_id: employee.id, attendance_date: day, status });
      toast.success(`${employee.name}: ${status.replace("_", " ")}`);
      qc.invalidateQueries({ queryKey: ["attendance", pid] });
      qc.invalidateQueries({ queryKey: ["labourCost", pid] });
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const project = projects?.find((p) => String(p.id) === projectId);

  return (
    <div className="p-8" data-testid="se-portal-page">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Field Operations</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight leading-none">Daily Attendance</h1>
          {isClient && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2" data-testid="client-viewonly-note">View-only — attendance for your projects</div>}
        </div>
        {!isClient && (
          <div className="flex gap-2">
            {["Admin", "Accountant"].includes(user?.role) && (
              <Button data-testid="manage-categories-button" variant="outline" onClick={() => setCatModal(true)}
                className="rounded-md border-slate-300 dark:border-slate-700 font-semibold uppercase tracking-wide text-xs">
                <Tags size={15} strokeWidth={2.5} /> Categories
              </Button>
            )}
            <Button data-testid="se-add-employee-button" onClick={() => setModal(true)}
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wide">
              <Plus size={15} strokeWidth={3} /> Add Employee
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">Project</div>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger data-testid="se-project-select" className="w-64 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
              {(projects || []).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">Date</div>
          <Input data-testid="se-date-input" type="date" value={day}
            min={isAdmin || isClient ? undefined : minDate()} max={todayIso()}
            onChange={(e) => setDay(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md h-10 w-44" />
        </div>
        {pid && (
          <Link to={`/admin/projects/${pid}`} data-testid="se-project-link"
            className="ml-auto flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400 transition-colors pb-2">
            Full Project View <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        )}
      </div>

      {project && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4" data-testid="se-summary-bar">
          <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <HardHat size={15} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" /> {project.name}
          </span>
          <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <ClipboardCheck size={15} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
            <span data-testid="se-marked-count">{markedCount}/{active.length}</span> marked for {day}
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3" data-testid="se-attendance-list">
        {active.map((e) => (
          <DailyAttendanceCard key={e.id} employee={e} status={statusMap[e.id]} onMark={mark} readOnly={isClient} />
        ))}
        {pid && active.length === 0 && (
          <div className="border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400 md:col-span-2" data-testid="se-empty">
            {isClient ? "No employees on this project yet." : 'No employees on this project yet. Tap "Add Employee" to register your first field worker.'}
          </div>
        )}
        {!pid && (
          <div className="border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400 md:col-span-2">
            No assigned projects found.
          </div>
        )}
      </div>

      {!isClient && (
      <div className="mt-10" data-testid="org-employee-register">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold mb-3">
          Employee Register (Organisation) · {(allEmployees || []).length}
        </div>
        <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm" data-testid="org-employees-table">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Trade</th>
                <th className="px-4 py-3 text-right">Wage</th><th className="px-4 py-3">Assigned Projects (via phases)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {(allEmployees || []).map((e) => (
                <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800/60 transition-colors" data-testid={`org-employee-row-${e.id}`}>
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{e.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{e.role_title || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{e.daily_wage != null ? `₹${Number(e.daily_wage).toLocaleString("en-IN")}/${e.wage_type === "daily" ? "day" : e.wage_type}` : "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                    {(e.assigned_projects || []).length ? e.assigned_projects.join(", ") : <span className="text-slate-400 dark:text-slate-500">Unassigned — assign via Project → Phases</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${e.status === "active" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700"}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
              {(allEmployees || []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No employees yet — add your first worker above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <EmployeeFormModal open={modal} onOpenChange={setModal} projectId={null} />
      <CategoryManagerModal open={catModal} onOpenChange={setCatModal} />
    </div>
  );
}
