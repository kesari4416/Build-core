const STYLES = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  PendingApproval: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PartiallyReceived: "bg-sky-50 text-sky-700 border-sky-200",
  Executed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  Terminated: "bg-red-50 text-red-700 border-red-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Void: "bg-slate-100 text-slate-500 border-slate-300",
  Submitted: "bg-sky-50 text-sky-700 border-sky-200",
  UnderReview: "bg-amber-50 text-amber-700 border-amber-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Received: "bg-sky-50 text-sky-700 border-sky-200",
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  Awarded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Sent: "bg-sky-50 text-sky-700 border-sky-200",
  Partial: "bg-amber-50 text-amber-700 border-amber-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
};

export const CommitmentStatusBadge = ({ status }) => (
  <span data-testid={`commitment-status-${status}`}
    className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.1em] font-semibold whitespace-nowrap ${STYLES[status] || STYLES.Draft}`}>
    {status?.replace(/([A-Z])/g, " $1").trim()}
  </span>
);
