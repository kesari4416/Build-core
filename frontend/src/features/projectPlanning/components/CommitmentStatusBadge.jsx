const STYLES = {
  Draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/40",
  PendingApproval: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40",
  Approved: "bg-green-500/10 text-green-400 border-green-500/40",
  PartiallyReceived: "bg-sky-500/10 text-sky-400 border-sky-500/40",
  Executed: "bg-green-500/10 text-green-400 border-green-500/40",
  Closed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/40",
  Cancelled: "bg-red-500/10 text-red-400 border-red-500/40",
  Terminated: "bg-red-500/10 text-red-400 border-red-500/40",
  Pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40",
  Rejected: "bg-red-500/10 text-red-400 border-red-500/40",
  Void: "bg-zinc-500/10 text-zinc-500 border-zinc-600",
  Submitted: "bg-sky-500/10 text-sky-400 border-sky-500/40",
  UnderReview: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40",
  Paid: "bg-green-500/10 text-green-400 border-green-500/40",
  Received: "bg-sky-500/10 text-sky-400 border-sky-500/40",
  Verified: "bg-green-500/10 text-green-400 border-green-500/40",
  Open: "bg-orange-500/10 text-orange-400 border-orange-500/40",
  Awarded: "bg-green-500/10 text-green-400 border-green-500/40",
};

export const CommitmentStatusBadge = ({ status }) => (
  <span data-testid={`commitment-status-${status}`}
    className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold whitespace-nowrap ${STYLES[status] || STYLES.Draft}`}>
    {status?.replace(/([A-Z])/g, " $1").trim()}
  </span>
);
