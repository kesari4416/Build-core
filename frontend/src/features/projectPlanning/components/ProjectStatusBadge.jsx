const STYLES = {
  Planning: "bg-sky-50 text-sky-700 border-sky-200",
  Ongoing: "bg-amber-50 text-amber-700 border-amber-200",
  OnHold: "bg-orange-50 text-orange-700 border-orange-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};

export const FLAG_STYLES = {
  OnTrack: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Delayed: "bg-amber-50 text-amber-700 border-amber-200",
  Blocked: "bg-red-50 text-red-700 border-red-200",
};

export const PHASE_COLORS = {
  NotStarted: { dot: "bg-slate-300 border-slate-400", text: "text-slate-500" },
  InProgress: { dot: "bg-blue-600 border-blue-500", text: "text-blue-600" },
  Completed: { dot: "bg-emerald-500 border-emerald-400", text: "text-emerald-600" },
  Delayed: { dot: "bg-amber-500 border-amber-400", text: "text-amber-600" },
  Blocked: { dot: "bg-red-500 border-red-400", text: "text-red-600" },
};

export const ProjectStatusBadge = ({ status }) => (
  <span
    data-testid={`status-badge-${status}`}
    className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.1em] font-semibold ${STYLES[status] || STYLES.Planning}`}
  >
    {status}
  </span>
);

export const FlagBadge = ({ flag }) => (
  <span
    data-testid={`flag-badge-${flag}`}
    className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.1em] font-semibold ${FLAG_STYLES[flag] || FLAG_STYLES.OnTrack}`}
  >
    {flag}
  </span>
);
