import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, AlertTriangle, CheckCircle2, IndianRupee, Flag } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine, PieChart, Pie } from "recharts";
import api from "../../../api/client";
import { useStats, useProjects } from "../hooks/useProjects";
import { ProjectTable } from "../components/ProjectTable";
import { Skeleton } from "../../../components/ui/skeleton";
import { useAuth } from "../../../context/AuthContext";

const STATUS_ORDER = ["Planning", "Ongoing", "OnHold", "Completed", "Cancelled"];
const BAR_COLORS = { Planning: "#38bdf8", Ongoing: "#f97316", OnHold: "#eab308", Completed: "#22c55e", Cancelled: "#ef4444" };
const STAGE_COLORS = ["#f97316", "#38bdf8", "#eab308", "#22c55e", "#a855f7", "#ef4444"];
const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 0, fontSize: 12 };

const StatCard = ({ icon: Icon, label, value, accent, testId }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-5 fade-up" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">{label}</span>
      <Icon size={17} strokeWidth={2.5} className={accent} />
    </div>
    <div className="font-heading font-bold text-4xl mt-3 leading-none">{value}</div>
  </div>
);

const Card = ({ title, testId, children, className = "" }) => (
  <div className={`border border-zinc-800 bg-zinc-900/60 p-5 ${className}`} data-testid={testId}>
    <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-4">{title}</div>
    {children}
  </div>
);

const GanttChart = ({ timeline }) => {
  const rows = (timeline || []).filter((t) => t.planned_start && t.planned_end);
  if (rows.length === 0) return <div className="text-zinc-500 text-sm py-8 text-center">No scheduled projects.</div>;
  const min = Math.min(...rows.map((r) => new Date(r.planned_start).getTime()));
  const max = Math.max(...rows.map((r) => new Date(r.planned_end).getTime()));
  const span = max - min || 1;
  const pos = (d) => ((new Date(d).getTime() - min) / span) * 100;
  const todayPct = Math.max(0, Math.min(100, ((Date.now() - min) / span) * 100));
  return (
    <div className="relative">
      <div className="absolute top-0 bottom-0 border-l border-dashed border-orange-500/70 z-10" style={{ left: `calc(160px + (100% - 160px) * ${todayPct / 100})` }}>
        <span className="absolute -top-1 left-1 text-[9px] uppercase tracking-wide text-orange-500 font-bold">Today</span>
      </div>
      <div className="space-y-2 pt-3">
        {rows.map((r) => {
          const left = pos(r.planned_start);
          const width = Math.max(2, pos(r.planned_end) - left);
          return (
            <div key={r.id} className="flex items-center gap-2" data-testid={`gantt-row-${r.id}`}>
              <div className="w-[150px] shrink-0 text-xs text-zinc-300 truncate">{r.name}</div>
              <div className="flex-1 h-5 bg-zinc-800/60 relative">
                <div className="absolute top-0 h-full opacity-40" style={{ left: `${left}%`, width: `${width}%`, background: BAR_COLORS[r.status] || "#f97316" }} />
                <div className="absolute top-0 h-full" style={{ left: `${left}%`, width: `${(width * r.percent_complete) / 100}%`, background: BAR_COLORS[r.status] || "#f97316" }} />
                <span className="absolute top-0.5 text-[9px] font-bold text-zinc-950" style={{ left: `calc(${left}% + 4px)` }}>{r.percent_complete}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-2 pl-[158px]">
        <span>{new Date(min).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
        <span>{new Date(max).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useStats();
  const { data: projectsData } = useProjects({ limit: 5 });
  const { data: charts } = useQuery({
    queryKey: ["dashboardCharts"],
    queryFn: () => api.get("/projects/dashboard-charts").then((r) => r.data),
  });

  const chartData = STATUS_ORDER.map((s) => ({ status: s, count: stats?.by_status?.[s] || 0 }));
  const pp = charts?.portfolio_progress;
  const ms = charts?.milestones;
  const gauge = [{ value: pp?.avg_pct || 0, fill: "#f97316" }, { value: 100 - (pp?.avg_pct || 0), fill: "#27272a" }];
  const msDonut = [
    { name: "Completed", value: ms?.completed || 0, fill: "#22c55e" },
    { name: "Pending", value: ms?.pending || 0, fill: "#eab308" },
    { name: "Overdue", value: ms?.overdue || 0, fill: "#ef4444" },
  ];

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
        {/* 1. Overall portfolio progress */}
        <Card title="Overall Portfolio Progress" testId="portfolio-progress-chart">
          <div className="relative">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={gauge} dataKey="value" innerRadius={62} outerRadius={82}
                  startAngle={225} endAngle={-45} stroke="none" isAnimationActive={false} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="font-heading font-bold text-4xl text-orange-500" data-testid="portfolio-avg-pct">{pp?.avg_pct ?? 0}%</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Avg Completion</div>
            </div>
          </div>
          <div className="flex justify-around text-center border-t border-zinc-800 pt-3">
            <div><div className="font-heading font-bold text-xl">{pp?.total ?? 0}</div><div className="text-[10px] uppercase tracking-wide text-zinc-500">Projects</div></div>
            <div><div className="font-heading font-bold text-xl text-green-400">{pp?.completed ?? 0}</div><div className="text-[10px] uppercase tracking-wide text-zinc-500">Completed</div></div>
          </div>
        </Card>

        {/* 3. Project status breakdown */}
        <Card title="Projects by Status" testId="status-chart">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="status" width={80} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#27272a" }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" barSize={16}>
                {chartData.map((d) => <Cell key={d.status} fill={BAR_COLORS[d.status]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 6. Projects by stage */}
        <Card title="Projects by Stage" testId="stages-chart">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts?.stages || []} margin={{ left: -20 }}>
              <XAxis dataKey="stage" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#27272a" }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" barSize={34}>
                {(charts?.stages || []).map((d, i) => <Cell key={d.stage} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        {/* 2. Gantt / timeline */}
        <Card title="Project Timeline (Gantt)" testId="gantt-chart" className="lg:col-span-2">
          <GanttChart timeline={charts?.timeline} />
        </Card>

        {/* 5. Milestone completion tracker */}
        <Card title="Milestone Tracker" testId="milestone-chart">
          <div className="flex items-center gap-3">
            <div className="relative w-[110px] h-[110px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={msDonut} dataKey="value" innerRadius={38} outerRadius={54} stroke="none" isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="font-heading font-bold text-lg" data-testid="milestone-total">{ms?.total ?? 0}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-green-500" /> <span className="text-zinc-300">{ms?.completed ?? 0} Completed</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-yellow-500" /> <span className="text-zinc-300">{ms?.pending ?? 0} Pending</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-red-500" /> <span className="text-zinc-300">{ms?.overdue ?? 0} Overdue</span></div>
            </div>
          </div>
          <div className="border-t border-zinc-800 mt-3 pt-3 space-y-2">
            {(ms?.upcoming || []).slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs" data-testid={`milestone-upcoming-${m.id}`}>
                <Flag size={11} strokeWidth={2.5} className={m.overdue ? "text-red-400" : "text-yellow-400"} />
                <span className="text-zinc-300 truncate flex-1">{m.title}</span>
                <span className={`shrink-0 ${m.overdue ? "text-red-400" : "text-zinc-500"}`}>{m.due_date?.slice(5)}</span>
              </div>
            ))}
            {(ms?.upcoming || []).length === 0 && <div className="text-zinc-600 text-xs">No upcoming milestones.</div>}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        {/* 4. Schedule variance */}
        <Card title="Schedule Variance (Actual − Expected %)" testId="variance-chart">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts?.schedule_variance || []} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false}
                interval={0} tickFormatter={(v) => (v.length > 10 ? v.slice(0, 10) + "…" : v)} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip cursor={{ fill: "#27272a" }} contentStyle={TOOLTIP_STYLE}
                formatter={(v, n) => [`${v}%`, n === "variance" ? "Variance" : n]} />
              <ReferenceLine y={0} stroke="#52525b" />
              <Bar dataKey="variance" barSize={26}>
                {(charts?.schedule_variance || []).map((d) => <Cell key={d.id} fill={d.variance >= 0 ? "#22c55e" : "#ef4444"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

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
