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
    <div className="p-4 sm:p-8" data-testid="clients-page">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Directory</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight leading-none">Clients</h1>
        </div>
        {isAdmin && (
          <Button data-testid="add-client-button" onClick={() => setModal(true)}
            className="rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold uppercase tracking-wide">
            <Plus size={15} strokeWidth={3} /> Add Client
          </Button>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-64 bg-slate-200 dark:bg-slate-800 rounded-md" />
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm" data-testid="clients-table">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800/60 transition-colors" data-testid={`client-row-${c.id}`}>
                  <td className="px-4 py-3">
                    <Link to={`/admin/clients/${c.id}`} className="flex items-center gap-3 group">
                      <div className="bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2">
                        <Building2 size={15} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400 transition-colors">{c.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{c.company || "—"}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    <div>{c.email || "—"}</div>
                    <div>{c.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-heading font-bold text-2xl text-slate-600 dark:text-slate-400">{c.project_count ?? 0}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{fmt(c.total_billed)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${c.is_active ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/clients/${c.id}`} data-testid={`client-view-${c.id}`}
                      className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400 transition-colors">
                      View <ArrowRight size={12} strokeWidth={2.5} />
                    </Link>
                  </td>
                </tr>
              ))}
              {clients?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">No clients yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <ClientFormModal open={modal} onOpenChange={setModal} />
    </div>
  );
}
