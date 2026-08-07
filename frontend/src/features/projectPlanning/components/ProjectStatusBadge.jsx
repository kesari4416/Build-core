const STYLES = {
  Planning: "bg-sky-500/10 text-sky-400 border-sky-500/40",
  Ongoing: "bg-orange-500/10 text-orange-400 border-orange-500/40",
  OnHold: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40",
  Completed: "bg-green-500/10 text-green-400 border-green-500/40",
  Cancelled: "bg-red-500/10 text-red-400 border-red-500/40",
};

export const FLAG_STYLES = {
  OnTrack: "bg-green-500/10 text-green-400 border-green-500/40",
  Delayed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40",
  Blocked: "bg-red-500/10 text-red-400 border-red-500/40",
};

export const PHASE_COLORS = {
  NotStarted: { dot: "bg-zinc-600 border-zinc-500", text: "text-zinc-400" },
  InProgress: { dot: "bg-orange-500 border-orange-400", text: "text-orange-400" },
  Completed: { dot: "bg-green-500 border-green-400", text: "text-green-400" },
  Delayed: { dot: "bg-yellow-500 border-yellow-400", text: "text-yellow-400" },
  Blocked: { dot: "bg-red-500 border-red-400", text: "text-red-400" },
};

export const ProjectStatusBadge = ({ status }) => (
  <span
    data-testid={`status-badge-${status}`}
    className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${STYLES[status] || STYLES.Planning}`}
  >
    {status}
  </span>
);

export const FlagBadge = ({ flag }) => (
  <span
    data-testid={`flag-badge-${flag}`}
    className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${FLAG_STYLES[flag] || FLAG_STYLES.OnTrack}`}
  >
    {flag}
  </span>
);
