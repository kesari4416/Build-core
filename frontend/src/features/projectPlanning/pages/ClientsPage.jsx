import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus, ArrowRight } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useClients } from "../hooks/useProjects";
import { Skeleton } from "../../../components/ui/skeleton";
import { Button } from "../../../components/ui/button";
import { ClientFormModal } from "../components/ClientFormModal";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function ClientsPage() {
  const { isAdmin } = useAuth();
  const { data: clients, isLoading } = useClients();
  const [modal, setModal] = useState(false);

  return (
    <div className="p-8" data-testid="clients-page">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-orange-500 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Directory</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none">Clients</h1>
        </div>
        {isAdmin && (
          <Button data-testid="add-client-button" onClick={() => setModal(true)}
            className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-wide">
            <Plus size={15} strokeWidth={3} /> Add Client
          </Button>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-64 bg-zinc-900 rounded-none" />
      ) : (
        <div className="border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm" data-testid="clients-table">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-center">Active Projects</th>
                <th className="px-4 py-3 text-right">Total Billed</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients?.map((c) => (
                <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors" data-testid={`client-row-${c.id}`}>
                  <td className="px-4 py-3">
                    <Link to={`/admin/clients/${c.id}`} className="flex items-center gap-3 group">
                      <div className="bg-zinc-800 border border-zinc-700 p-2">
                        <Building2 size={15} strokeWidth={2.5} className="text-orange-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-white group-hover:text-orange-500 transition-colors">{c.name}</div>
                        <div className="text-xs text-zinc-500">{c.company || "—"}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    <div>{c.email || "—"}</div>
                    <div>{c.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-heading font-bold text-2xl text-zinc-300">{c.project_count ?? 0}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{fmt(c.total_billed)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${c.is_active ? "bg-green-500/10 text-green-400 border-green-500/40" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/40"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/clients/${c.id}`} data-testid={`client-view-${c.id}`}
                      className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.15em] font-semibold text-zinc-500 hover:text-orange-500 transition-colors">
                      View <ArrowRight size={12} strokeWidth={2.5} />
                    </Link>
                  </td>
                </tr>
              ))}
              {clients?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">No clients yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <ClientFormModal open={modal} onOpenChange={setModal} />
    </div>
  );
}
