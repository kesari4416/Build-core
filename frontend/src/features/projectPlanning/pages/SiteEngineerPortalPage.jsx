import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { HardHat, Plus, ArrowRight, ClipboardCheck } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { DailyAttendanceCard } from "../components/DailyAttendanceCard";
import { EmployeeFormModal } from "../components/EmployeeFormModal";

const iso = (d) => d.toISOString().slice(0, 10);
const todayIso = () => iso(new Date());
const minDate = () => { const d = new Date(); d.setDate(d.getDate() - 3); return iso(d); };

export default function SiteEngineerPortalPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [day, setDay] = useState(todayIso());
  const [modal, setModal] = useState(false);

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
          <div className="text-orange-500 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Field Operations</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none">Daily Attendance</h1>
        </div>
        <Button data-testid="se-add-employee-button" onClick={() => setModal(true)}
          className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-wide">
          <Plus size={15} strokeWidth={3} /> Add Employee
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1">Project</div>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger data-testid="se-project-select" className="w-64 bg-zinc-900 border-zinc-700 rounded-none">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {(projects || []).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1">Date</div>
          <Input data-testid="se-date-input" type="date" value={day}
            min={isAdmin ? undefined : minDate()} max={todayIso()}
            onChange={(e) => setDay(e.target.value)} className="bg-zinc-900 border-zinc-700 rounded-none h-10 w-44" />
        </div>
        {pid && (
          <Link to={`/admin/projects/${pid}`} data-testid="se-project-link"
            className="ml-auto flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold text-zinc-500 hover:text-orange-500 transition-colors pb-2">
            Full Project View <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        )}
      </div>

      {project && (
        <div className="border border-zinc-800 bg-zinc-900/60 p-4 mb-6 flex flex-wrap items-center gap-4" data-testid="se-summary-bar">
          <span className="flex items-center gap-2 text-sm text-zinc-300">
            <HardHat size={15} strokeWidth={2.5} className="text-orange-500" /> {project.name}
          </span>
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <ClipboardCheck size={15} strokeWidth={2.5} className="text-green-500" />
            <span data-testid="se-marked-count">{markedCount}/{active.length}</span> marked for {day}
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3" data-testid="se-attendance-list">
        {active.map((e) => (
          <DailyAttendanceCard key={e.id} employee={e} status={statusMap[e.id]} onMark={mark} />
        ))}
        {pid && active.length === 0 && (
          <div className="border border-zinc-800 p-10 text-center text-zinc-500 md:col-span-2" data-testid="se-empty">
            No employees on this project yet. Tap "Add Employee" to register your first field worker.
          </div>
        )}
        {!pid && (
          <div className="border border-zinc-800 p-10 text-center text-zinc-500 md:col-span-2">
            No assigned projects found.
          </div>
        )}
      </div>

      <div className="mt-10" data-testid="org-employee-register">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">
          Employee Register (Organisation) · {(allEmployees || []).length}
        </div>
        <div className="border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm" data-testid="org-employees-table">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Trade</th>
                <th className="px-4 py-3 text-right">Wage</th><th className="px-4 py-3">Assigned Projects (via phases)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {(allEmployees || []).map((e) => (
                <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors" data-testid={`org-employee-row-${e.id}`}>
                  <td className="px-4 py-2.5 font-semibold text-white">{e.name}</td>
                  <td className="px-4 py-2.5 text-zinc-300">{e.role_title || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-200">{e.daily_wage != null ? `₹${Number(e.daily_wage).toLocaleString("en-IN")}/${e.wage_type === "daily" ? "day" : e.wage_type}` : "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">
                    {(e.assigned_projects || []).length ? e.assigned_projects.join(", ") : <span className="text-zinc-600">Unassigned — assign via Project → Phases</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${e.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/40" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/40"}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
              {(allEmployees || []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No employees yet — add your first worker above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeFormModal open={modal} onOpenChange={setModal} projectId={null} />
    </div>
  );
}
