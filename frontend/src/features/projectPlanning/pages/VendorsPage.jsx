import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Truck, ShieldAlert, ShieldCheck, Star, Scale, ArrowRight } from "lucide-react";
import api from "../../../api/client";
import { CommitmentStatusBadge } from "../components/CommitmentStatusBadge";

export default function VendorsPage() {
  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => api.get("/vendors").then((r) => r.data),
  });
  const { data: packages } = useQuery({
    queryKey: ["allBidPackages"],
    queryFn: () => api.get("/bid-packages").then((r) => r.data),
  });

  return (
    <div className="p-8" data-testid="vendors-page">
      <div className="mb-8">
        <div className="text-orange-500 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Procurement</div>
        <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none">Vendors & Quotes</h1>
      </div>

      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">Vendor Directory</div>
      <div className="border border-zinc-800 overflow-x-auto mb-10">
        <table className="w-full text-sm" data-testid="vendors-table">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Trade</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Insurance</th>
              <th className="px-4 py-3 text-center">Rating</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {(vendors || []).map((v) => (
              <tr key={v.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors" data-testid={`vendor-row-${v.id}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 border border-zinc-700 p-2">
                      <Truck size={15} strokeWidth={2.5} className="text-orange-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{v.name}</div>
                      <div className="text-xs text-zinc-500">{v.vendor_type}{v.prequalified ? " · Prequalified" : ""}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-300">{v.trade || "—"}</td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  <div>{v.contact_name || "—"}</div>
                  <div>{v.email || "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1.5 text-xs ${v.insurance_expiring ? "text-red-400" : "text-green-400"}`}>
                    {v.insurance_expiring ? <ShieldAlert size={13} strokeWidth={2.5} /> : <ShieldCheck size={13} strokeWidth={2.5} />}
                    {v.insurance_expiry || "None"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-zinc-300">
                    <Star size={12} strokeWidth={2.5} className="text-yellow-400" /> {v.rating ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center"><CommitmentStatusBadge status={v.status} /></td>
              </tr>
            ))}
            {(vendors || []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">No vendors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">Bid Packages — Quote Comparison</div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="bid-packages-grid">
        {(packages || []).map((bp) => (
          <Link key={bp.id} to={`/admin/procurement/bid-packages/${bp.id}/comparison`} data-testid={`bid-package-card-${bp.id}`}
            className="group border border-zinc-800 bg-zinc-900/60 p-5 hover:border-orange-500 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <Scale size={18} strokeWidth={2.5} className="text-orange-500" />
              <CommitmentStatusBadge status={bp.status} />
            </div>
            <div className="font-heading font-semibold text-xl leading-tight">{bp.title}</div>
            <div className="text-xs text-zinc-500 mt-1">{bp.project_name} · {bp.cost_code || "—"}</div>
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
              <span>{bp.bid_count} bid{bp.bid_count === 1 ? "" : "s"}</span>
              <span>{bp.line_item_count} line item{bp.line_item_count === 1 ? "" : "s"}</span>
              <span className="ml-auto text-zinc-500">Due {bp.bid_due_date || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-[11px] uppercase tracking-[0.15em] font-semibold text-zinc-500 group-hover:text-orange-500 transition-colors">
              Compare Quotes <ArrowRight size={13} strokeWidth={2.5} />
            </div>
          </Link>
        ))}
        {(packages || []).length === 0 && (
          <div className="border border-zinc-800 p-10 text-center text-zinc-500 md:col-span-3">No bid packages yet. Create them from a project's Procurement dashboard.</div>
        )}
      </div>
    </div>
  );
}
