import { Link } from "react-router-dom";
import { Building2, Mail, Phone, ArrowRight } from "lucide-react";
import { useClients } from "../hooks/useProjects";
import { Skeleton } from "../../../components/ui/skeleton";

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients();

  return (
    <div className="p-8" data-testid="clients-page">
      <div className="mb-8">
        <div className="text-orange-500 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Directory</div>
        <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase leading-none">Clients</h1>
      </div>
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 bg-zinc-900 rounded-none" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients?.map((c) => (
            <Link key={c.id} to={`/admin/clients/${c.id}/projects`} data-testid={`client-card-${c.id}`}
              className="group border border-zinc-800 bg-zinc-900/60 p-6 hover:border-orange-500 transition-colors fade-up">
              <div className="flex items-center justify-between">
                <div className="bg-zinc-800 border border-zinc-700 p-2.5">
                  <Building2 size={20} strokeWidth={2.5} className="text-orange-500" />
                </div>
                <span className="font-heading font-bold text-3xl text-zinc-700 group-hover:text-orange-500 transition-colors leading-none">
                  {String(c.project_count ?? 0).padStart(2, "0")}
                </span>
              </div>
              <div className="font-heading font-semibold text-2xl mt-4 leading-none">{c.name}</div>
              <div className="text-xs text-zinc-500 mt-1">{c.company}</div>
              <div className="mt-4 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2"><Mail size={12} strokeWidth={2.5} /> {c.email || "—"}</div>
                <div className="flex items-center gap-2"><Phone size={12} strokeWidth={2.5} /> {c.phone || "—"}</div>
              </div>
              <div className="flex items-center gap-1.5 mt-5 text-[11px] uppercase tracking-[0.15em] font-semibold text-zinc-500 group-hover:text-orange-500 transition-colors">
                View Projects <ArrowRight size={13} strokeWidth={2.5} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
