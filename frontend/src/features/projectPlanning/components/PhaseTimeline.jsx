import { Check, Pencil } from "lucide-react";
import { PHASE_COLORS } from "./ProjectStatusBadge";
import { PhaseCrew } from "./PhaseCrew";

export const PhaseTimeline = ({ phases, canWrite, onEdit }) => {
  if (!phases?.length)
    return (
      <div className="border border-slate-200 bg-white shadow-sm p-12 text-center text-slate-500" data-testid="phases-empty-state">
        No phases defined yet.
      </div>
    );
  return (
    <div className="overflow-x-auto pb-2" data-testid="phase-timeline">
      <div className="flex items-stretch min-w-max gap-0">
        {phases.map((ph, i) => {
          const c = PHASE_COLORS[ph.status] || PHASE_COLORS.NotStarted;
          return (
            <div key={ph.id} className="flex items-start">
              <div className="w-56">
                <div className="flex items-center">
                  <div className={`w-10 h-10 border-2 flex items-center justify-center shrink-0 ${c.dot}`} data-testid={`phase-step-${ph.id}`}>
                    {ph.status === "Completed" ? (
                      <Check size={18} strokeWidth={3} className="text-white" />
                    ) : (
                      <span className="font-heading font-bold text-white text-sm">{ph.sequence_order}</span>
                    )}
                  </div>
                  {i < phases.length - 1 && <div className="flex-1 h-px bg-slate-300" />}
                </div>
                <div className="mt-3 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-lg leading-none text-slate-900">{ph.name}</span>
                    {canWrite && (
                      <button onClick={() => onEdit(ph)} data-testid={`edit-phase-${ph.id}`} className="text-slate-500 hover:text-blue-600 transition-colors">
                        <Pencil size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                  <div className={`text-[11px] uppercase tracking-[0.15em] font-semibold mt-1 ${c.text}`}>{ph.status}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {ph.planned_start || "—"} → {ph.planned_end || "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-200">
                      <div className={`h-full ${ph.status === "Delayed" ? "bg-red-500" : ph.status === "Completed" ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${ph.percent_complete}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{ph.percent_complete}%</span>
                  </div>
                  {canWrite && <PhaseCrew phaseId={ph.id} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
