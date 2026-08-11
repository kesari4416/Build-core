import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPin } from "lucide-react";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

const fmtBudget = (b) =>
  b == null ? "—" : `₹${(b / 10000000).toFixed(2)} Cr`;

export const ProjectTable = ({ projects }) => {
  const navigate = useNavigate();
  if (!projects?.length)
    return (
      <div className="border border-slate-200 bg-white shadow-sm p-12 text-center text-slate-500" data-testid="projects-empty-state">
        No projects found.
      </div>
    );
  return (
    <div className="border border-slate-200 overflow-x-auto" data-testid="project-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white text-left text-[11px] uppercase tracking-[0.15em] text-slate-500">
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
              className="border-t border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  {p.name}
                  {p.has_active_issues && (
                    <AlertTriangle size={15} strokeWidth={2.5} className="text-red-500" data-testid={`issue-flag-${p.id}`} />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <MapPin size={11} strokeWidth={2.5} /> {p.location || "—"}
                </div>
              </td>
              <td className="px-4 py-3.5 text-slate-600">{p.client_name}</td>
              <td className="px-4 py-3.5 text-slate-600">{p.site_engineer_name || "—"}</td>
              <td className="px-4 py-3.5 text-slate-600">{fmtBudget(p.budget)}</td>
              <td className="px-4 py-3.5 w-40">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200">
                    <div className="h-full bg-blue-600" style={{ width: `${p.percent_complete}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-8">{p.percent_complete}%</span>
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
