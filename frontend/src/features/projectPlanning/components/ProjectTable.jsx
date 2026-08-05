import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPin } from "lucide-react";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

const fmtBudget = (b) =>
  b == null ? "—" : `₹${(b / 10000000).toFixed(2)} Cr`;

export const ProjectTable = ({ projects }) => {
  const navigate = useNavigate();
  if (!projects?.length)
    return (
      <div className="border border-zinc-800 bg-zinc-900/50 p-12 text-center text-zinc-500" data-testid="projects-empty-state">
        No projects found.
      </div>
    );
  return (
    <div className="border border-zinc-800 overflow-x-auto" data-testid="project-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-left text-[11px] uppercase tracking-[0.15em] text-zinc-500">
            <th className="px-4 py-3 font-semibold">Project</th>
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Engineer</th>
            <th className="px-4 py-3 font-semibold">Budget</th>
            <th className="px-4 py-3 font-semibold">Progress</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr
              key={p.id}
              data-testid={`project-row-${p.id}`}
              onClick={() => navigate(`/admin/projects/${p.id}`)}
              className="border-t border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-colors"
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  {p.name}
                  {p.has_active_issues && (
                    <AlertTriangle size={15} strokeWidth={2.5} className="text-red-500" data-testid={`issue-flag-${p.id}`} />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                  <MapPin size={11} strokeWidth={2.5} /> {p.location || "—"}
                </div>
              </td>
              <td className="px-4 py-3.5 text-zinc-300">{p.client_name}</td>
              <td className="px-4 py-3.5 text-zinc-300">{p.site_engineer_name || "—"}</td>
              <td className="px-4 py-3.5 text-zinc-300">{fmtBudget(p.budget)}</td>
              <td className="px-4 py-3.5 w-40">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800">
                    <div className="h-full bg-orange-500" style={{ width: `${p.percent_complete}%` }} />
                  </div>
                  <span className="text-xs text-zinc-400 w-8">{p.percent_complete}%</span>
                </div>
              </td>
              <td className="px-4 py-3.5"><ProjectStatusBadge status={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
