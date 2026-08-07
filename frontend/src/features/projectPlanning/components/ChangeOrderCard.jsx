import { CommitmentStatusBadge } from "./CommitmentStatusBadge";
import { Button } from "../../../components/ui/button";

const fmt = (n) => `₹${Math.abs(n).toLocaleString("en-IN")}`;

export const ChangeOrderCard = ({ co, isAdmin, onDecide }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-4 flex flex-wrap items-center gap-4" data-testid={`co-card-${co.id}`}>
    <div className="font-heading font-bold text-lg text-orange-500">{co.co_number}</div>
    <div className="flex-1 min-w-[200px]">
      <div className="text-sm text-zinc-200">{co.reason}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5">Requested {co.requested_at?.slice(0, 10)}</div>
    </div>
    <div className={`font-heading font-bold text-xl ${co.amount < 0 ? "text-red-400" : "text-white"}`}>
      {co.amount < 0 ? "−" : "+"}{fmt(co.amount)}
    </div>
    <CommitmentStatusBadge status={co.status} />
    {isAdmin && co.status === "Pending" && (
      <div className="flex gap-2">
        <Button size="sm" data-testid={`co-approve-${co.id}`} onClick={() => onDecide(co, "Approved")}
          className="rounded-none bg-green-600 hover:bg-green-700 text-white text-xs uppercase tracking-wide h-8">Approve</Button>
        <Button size="sm" variant="outline" data-testid={`co-reject-${co.id}`} onClick={() => onDecide(co, "Rejected")}
          className="rounded-none border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs uppercase tracking-wide h-8">Reject</Button>
      </div>
    )}
  </div>
);
