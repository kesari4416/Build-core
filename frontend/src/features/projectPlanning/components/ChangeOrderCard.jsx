import { CommitmentStatusBadge } from "./CommitmentStatusBadge";
import { Button } from "../../../components/ui/button";

const fmt = (n) => `₹${Math.abs(n).toLocaleString("en-IN")}`;

export const ChangeOrderCard = ({ co, isAdmin, onDecide }) => (
  <div className="border border-slate-200 bg-white shadow-sm p-4 flex flex-wrap items-center gap-4" data-testid={`co-card-${co.id}`}>
    <div className="font-heading font-bold text-lg text-blue-600">{co.co_number}</div>
    <div className="flex-1 min-w-[200px]">
      <div className="text-sm text-slate-700">{co.reason}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">Requested {co.requested_at?.slice(0, 10)}</div>
    </div>
    <div className={`font-heading font-bold text-xl ${co.amount < 0 ? "text-red-600" : "text-slate-900"}`}>
      {co.amount < 0 ? "−" : "+"}{fmt(co.amount)}
    </div>
    <CommitmentStatusBadge status={co.status} />
    {isAdmin && co.status === "Pending" && (
      <div className="flex gap-2">
        <Button size="sm" data-testid={`co-approve-${co.id}`} onClick={() => onDecide(co, "Approved")}
          className="rounded-md bg-green-600 hover:bg-green-700 text-slate-900 text-xs uppercase tracking-wide h-8">Approve</Button>
        <Button size="sm" variant="outline" data-testid={`co-reject-${co.id}`} onClick={() => onDecide(co, "Rejected")}
          className="rounded-md border-red-500/50 text-red-600 hover:bg-red-50 text-xs uppercase tracking-wide h-8">Reject</Button>
      </div>
    )}
  </div>
);
