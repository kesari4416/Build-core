import { Link } from "react-router-dom";
import { Building2, AlertTriangle, CheckCircle2, IndianRupee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useStats, useProjects } from "../hooks/useProjects";
import { ProjectTable } from "../components/ProjectTable";
import { Skeleton } from "../../../components/ui/skeleton";
import { useAuth } from "../../../context/AuthContext";

const STATUS_ORDER = ["Planning", "Ongoing", "OnHold", "Completed", "Cancelled"];
const BAR_COLORS = { Planning: "#38bdf8", Ongoing: "#f97316", OnHold: "#eab308", Completed: "#22c55e", Cancelled: "#ef4444" };

const StatCard = ({ icon: Icon, label, value, accent, testId }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-5 fade-up" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">{label}</span>
      <Icon size={17} strokeWidth={2.5} className={accent} />
    </div>
    <div className="font-heading font-bold text-4xl mt-3 leading-none">{value}</div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useStats();
  const { data: projectsData } = useProjects({ limit: 5 });

  const chartData = STATUS_ORDER.map((s) => ({ status: s, count: stats?.by_status?.[s] || 0 }));

  return (
    <div className="p-8" data-testid="dashboard-page">
      <div className="mb-8">
        <div className="text-orange-500 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Command Center</div>
        <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 bg-zinc-900 rounded-none" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Total Projects" value={stats?.total_projects ?? 0} accent="text-orange-500" testId="stat-total-projects" />
          <StatCard icon={CheckCircle2} label="Ongoing" value={stats?.by_status?.Ongoing ?? 0} accent="text-green-500" testId="stat-ongoing" />
          <StatCard icon={AlertTriangle} label="With Issues" value={stats?.projects_with_issues ?? 0} accent="text-red-500" testId="stat-issues" />
          <StatCard icon={IndianRupee} label="Total Budget" value={stats ? `₹${(stats.total_budget / 10000000).toFixed(1)}Cr` : "—"} accent="text-sky-400" testId="stat-budget" />
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="border border-zinc-800 bg-zinc-900/60 p-5 lg:col-span-1" data-testid="status-chart">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-4">Projects by Status</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="status" width={80} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#27272a" }} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 0 }} />
              <Bar dataKey="count" barSize={16}>
                {chartData.map((d) => <Cell key={d.status} fill={BAR_COLORS[d.status]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Recent Projects</div>
            <Link to="/admin/projects" data-testid="view-all-projects-link" className="text-xs uppercase tracking-[0.12em] font-semibold text-orange-500 hover:text-orange-400 transition-colors">View All →</Link>
          </div>
          <ProjectTable projects={projectsData?.items} />
        </div>
      </div>
    </div>
  );
}
