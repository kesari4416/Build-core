import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Plus, Shield, Users, Check, X, ChevronRight, LogOut, Pause, Play, Trash2, LogIn, Search, Layers, Activity, Zap } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

const MODULE_LABELS = {
  projects: "Projects",
  phases_tracking: "Phases & Tracking",
  field_ops: "Field Ops (Attendance/Payroll)",
  clients: "Clients",
  finance: "Finance (Ledger/Balance Sheet)",
  estimates: "Estimates",
  procurement: "Procurement",
  change_orders: "Change Orders",
  model3d_viewer: "3D Drawing Viewer",
  concept_studio: "AI Concept Studio",
  client_portal: "Client Portal",
  vendor_portal: "Vendor Portal",
  site_engineer_portal: "Site Engineer Portal",
};

export default function SuperAdminPage() {
  const { user, isSuperAdmin, logout } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | hold

  const { data: modulesData } = useQuery({
    queryKey: ["tenant-modules"],
    queryFn: () => api.get("/tenants/modules").then((r) => r.data),
    enabled: !!user && isSuperAdmin,
  });
  const modules = modulesData?.modules || Object.keys(MODULE_LABELS);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.get("/tenants").then((r) => r.data),
    enabled: !!user && isSuperAdmin,
  });

  const impersonate = useMutation({
    mutationFn: (id) => api.post(`/tenants/${id}/impersonate`).then((r) => r.data),
    onSuccess: async (data) => {
      // Persist impersonation banner data + jump to the tenant's admin app
      try {
        sessionStorage.setItem("sitera_impersonation", JSON.stringify({
          tenant_name: data.tenant_name, admin_name: data.user.name,
          admin_email: data.user.email, superadmin_email: data.impersonated_by,
        }));
      } catch (e) { /* ignore */ }
      toast.success(`Signed in as ${data.user.name} · ${data.tenant_name}`);
      // Force a full reload so AuthContext re-fetches /auth/me
      window.location.href = "/admin";
    },
    onError: (e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Impersonation failed"),
  });

  const patchTenant = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/tenants/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries(["tenants"]); toast.success("Tenant updated"); },
    onError: (e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Update failed"),
  });

  const toggleHold = useMutation({
    mutationFn: ({ id, active }) => api.patch(`/tenants/${id}`, { is_active: active }).then((r) => r.data),
    onSuccess: (_, v) => { qc.invalidateQueries(["tenants"]); toast.success(v.active ? "Tenant resumed" : "Tenant on hold"); },
    onError: (e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Update failed"),
  });

  const deleteTenant = useMutation({
    mutationFn: (id) => api.delete(`/tenants/${id}/permanent`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries(["tenants"]); toast.success("Tenant deleted"); },
    onError: (e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Delete failed"),
  });

  if (user === null) return null;
  if (!user || !isSuperAdmin) return <Navigate to="/login" replace />;

  // Derived stats
  const totalActive = tenants.filter((t) => t.is_active).length;
  const totalOnHold = tenants.length - totalActive;
  const totalUsers = tenants.reduce((s, t) => s + (t.user_count || 0), 0);
  const totalModulesUsed = tenants.reduce((s, t) => s + ((t.allowed_modules || []).length), 0);

  // Client-side filter/search
  const filtered = tenants.filter((t) => {
    if (filter === "active" && !t.is_active) return false;
    if (filter === "hold" && t.is_active) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return t.name.toLowerCase().includes(q) ||
           (t.admin_email || "").toLowerCase().includes(q) ||
           (t.slug || "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="superadmin-page">
      {/* Top bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 flex items-center justify-center shadow-sm">
              <Shield size={18} className="text-amber-400 dark:text-slate-900" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="section-eyebrow">Sitera Platform</div>
              <div className="font-heading font-semibold text-lg leading-none text-slate-900 dark:text-slate-100 truncate">SuperAdmin Console</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{user.email}</div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-amber-600 dark:text-amber-500">Super Admin</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-semibold flex items-center justify-center text-sm shadow-sm">
              {user.name?.[0]?.toUpperCase() || "S"}
            </div>
            <button data-testid="superadmin-logout" onClick={logout}
              title="Sign out"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <LogOut size={16} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {/* Hero + stats strip */}
        <div className="mb-8">
          <div className="section-eyebrow">Platform overview</div>
          <h1 className="font-heading font-semibold text-3xl md:text-4xl tracking-tight text-slate-900 dark:text-slate-100">
            {tenants.length === 0 ? "Welcome to Sitera" : `Managing ${tenants.length} ${tenants.length === 1 ? "company" : "companies"}`}
          </h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Provision new tenants, tune their module access, or sign in as any tenant Admin.
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8" data-testid="platform-stats">
          <StatCard icon={<Building2 size={16} />} label="Total tenants"  value={tenants.length} accent="slate" />
          <StatCard icon={<Activity size={16} />}  label="Active"          value={totalActive}   accent="emerald" />
          <StatCard icon={<Pause size={16} />}     label="On hold"         value={totalOnHold}   accent="amber" />
          <StatCard icon={<Users size={16} />}     label="Total users"     value={totalUsers}    accent="slate" />
        </div>

        {/* Toolbar: search / filter / new */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-xl">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input data-testid="tenant-search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, admin email, or slug…"
              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>
          <div className="inline-flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
            {[["all", "All"], ["active", "Active"], ["hold", "On hold"]].map(([k, l]) => (
              <button key={k} data-testid={`filter-${k}`} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold rounded-md transition-colors ${
                  filter === k
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}>{l}</button>
            ))}
          </div>
          <button data-testid="new-tenant-btn" onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] uppercase tracking-[0.15em] font-semibold transition-colors">
            <Plus size={14} strokeWidth={2.5} /> New Tenant
          </button>
        </div>

        {isLoading ? (
          <div className="surface p-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="surface p-12 text-center" data-testid="tenants-empty">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
              <Building2 size={22} className="text-slate-500" strokeWidth={2.25} />
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {tenants.length === 0 ? "No tenants yet" : "No tenants match your filters"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tenants.length === 0 ? "Provision your first company to get started." : "Try a different search term or clear the filter."}
            </div>
          </div>
        ) : (
          <div className="grid gap-3" data-testid="tenants-list">
            {filtered.map((t) => (
              <TenantCard key={t.id} tenant={t} modules={modules}
                onOpen={() => setEditingTenant(t)}
                onHold={() => toggleHold.mutate({ id: t.id, active: false })}
                onResume={() => toggleHold.mutate({ id: t.id, active: true })}
                onDelete={() => {
                  if (window.confirm(`Delete "${t.name}" and ALL its data? This cannot be undone.`)) {
                    deleteTenant.mutate(t.id);
                  }
                }}
                onImpersonate={() => impersonate.mutate(t.id)}
                impersonating={impersonate.isPending && impersonate.variables === t.id} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTenantModal modules={modules} onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); qc.invalidateQueries(["tenants"]); }} />
      )}

      {editingTenant && (
        <EditTenantModal tenant={editingTenant} modules={modules}
          onClose={() => setEditingTenant(null)}
          onSave={(patch) => patchTenant.mutate({ id: editingTenant.id, ...patch },
            { onSuccess: () => setEditingTenant(null) })} />
      )}
    </div>
  );
}


/* --------------------------------------------------------------------- */
/* Reusable pieces                                                         */
/* --------------------------------------------------------------------- */

const STAT_ACCENTS = {
  slate:   { icon: "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400" },
  emerald: { icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  amber:   { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-500" },
};

function StatCard({ icon, label, value, accent = "slate" }) {
  const a = STAT_ACCENTS[accent] || STAT_ACCENTS.slate;
  return (
    <div className="surface p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.icon}`}>{icon}</div>
      <div>
        <div className="section-eyebrow">{label}</div>
        <div className="font-heading text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-none tabular-nums">{value}</div>
      </div>
    </div>
  );
}


const INITIALS_PALETTE = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
];
const initialsFor = (name = "?") => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const colorFor    = (id = 0) => INITIALS_PALETTE[id % INITIALS_PALETTE.length];


function TenantCard({ tenant: t, modules, onOpen, onHold, onResume, onDelete, onImpersonate, impersonating }) {
  return (
    <div data-testid={`tenant-row-${t.id}`}
      className="surface surface-hover p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Left: avatar + name */}
      <button onClick={onOpen} className="flex items-center gap-3.5 min-w-0 flex-1 text-left group">
        <div className={`w-11 h-11 rounded-xl font-heading font-semibold text-sm flex items-center justify-center ring-1 ring-inset ring-slate-200/60 dark:ring-slate-700/60 ${colorFor(t.id)}`}>
          {initialsFor(t.name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">{t.name}</span>
            <span className={`chip ${t.is_active ? "chip-success" : "chip-warning"}`}>{t.is_active ? "Active" : "On Hold"}</span>
            {t.id === 1 && <span className="chip chip-muted">Default</span>}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            <span className="font-mono">{t.admin_email || "no admin"}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="tabular-nums">{(t.allowed_modules || []).length}/{modules.length} modules</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="tabular-nums">{t.user_count} user{t.user_count === 1 ? "" : "s"}</span>
          </div>
        </div>
      </button>

      {/* Right: primary + secondary actions */}
      <div className="flex items-center gap-2 sm:pl-4 sm:border-l border-slate-200 dark:border-slate-800">
        <button data-testid={`impersonate-${t.id}`} onClick={onImpersonate}
          disabled={!t.is_active || !t.admin_email || impersonating}
          title={!t.is_active ? "Resume the tenant to sign in" : `Sign in as ${t.admin_email}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-400 text-[11px] uppercase tracking-[0.15em] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500/10 disabled:hover:text-amber-700">
          <LogIn size={12} strokeWidth={2.5} />
          <span className="hidden sm:inline">{impersonating ? "Signing in…" : "Login as Admin"}</span>
        </button>
        <div className="flex items-center gap-0.5">
          {t.is_active ? (
            <IconAction testid={`hold-tenant-${t.id}`} title="Put on hold"
              onClick={onHold} className="hover:text-amber-600"><Pause size={14} strokeWidth={2.5} /></IconAction>
          ) : (
            <IconAction testid={`resume-tenant-${t.id}`} title="Resume tenant"
              onClick={onResume} className="hover:text-emerald-600"><Play size={14} strokeWidth={2.5} /></IconAction>
          )}
          {t.id !== 1 && (
            <IconAction testid={`delete-tenant-${t.id}`} title="Delete permanently"
              onClick={onDelete} className="hover:text-rose-600"><Trash2 size={14} strokeWidth={2.5} /></IconAction>
          )}
          <IconAction testid={`open-tenant-${t.id}`} title="Edit tenant"
            onClick={onOpen} className="hover:text-slate-900 dark:hover:text-white"><ChevronRight size={16} /></IconAction>
        </div>
      </div>
    </div>
  );
}


function IconAction({ testid, title, onClick, className = "", children }) {
  return (
    <button data-testid={testid} title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-md text-slate-500 dark:text-slate-400 transition-colors ${className}`}>
      {children}
    </button>
  );
}


function CreateTenantModal({ modules, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState(new Set(modules));
  const [saving, setSaving] = useState(false);

  const toggle = (m) => {
    const next = new Set(selected);
    next.has(m) ? next.delete(m) : next.add(m);
    setSelected(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !adminEmail || !adminName || !password) return;
    setSaving(true);
    try {
      await api.post("/tenants", {
        name, admin_email: adminEmail, admin_name: adminName,
        admin_password: password, allowed_modules: Array.from(selected),
      });
      toast.success(`Tenant "${name}" created`);
      onCreated();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" data-testid="create-tenant-modal">
      <form onSubmit={submit} className="surface p-6 w-full max-w-2xl my-8">
        <div className="section-eyebrow mb-1">New tenant</div>
        <h2 className="font-heading font-semibold text-xl text-slate-900 dark:text-slate-100 mb-5">Provision a company</h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div className="sm:col-span-2">
            <label className="section-eyebrow block mb-1.5">Company name</label>
            <input required data-testid="tenant-name-input" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>
          <div>
            <label className="section-eyebrow block mb-1.5">Admin name</label>
            <input required data-testid="tenant-admin-name-input" value={adminName} onChange={(e) => setAdminName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>
          <div>
            <label className="section-eyebrow block mb-1.5">Admin email</label>
            <input required type="email" data-testid="tenant-admin-email-input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>
          <div className="sm:col-span-2">
            <label className="section-eyebrow block mb-1.5">Admin password</label>
            <input required type="text" minLength={6} data-testid="tenant-admin-password-input" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>
        </div>

        <div className="mb-5">
          <div className="section-eyebrow mb-2">Allowed modules · {selected.size} selected</div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {modules.map((m) => (
              <button key={m} type="button" data-testid={`tenant-module-${m}`}
                onClick={() => toggle(m)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  selected.has(m)
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-slate-300 dark:hover:ring-slate-700"
                }`}>
                <span className="truncate">{MODULE_LABELS[m] || m}</span>
                {selected.has(m) ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} className="opacity-40" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            Cancel
          </button>
          <button type="submit" disabled={saving} data-testid="tenant-create-submit"
            className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] uppercase tracking-[0.15em] font-semibold disabled:opacity-50">
            {saving ? "Creating…" : "Create Tenant"}
          </button>
        </div>
      </form>
    </div>
  );
}


function EditTenantModal({ tenant, modules, onClose, onSave }) {
  const [name, setName] = useState(tenant.name);
  const [isActive, setIsActive] = useState(tenant.is_active);
  const [selected, setSelected] = useState(new Set(tenant.allowed_modules || []));

  const { data: summary } = useQuery({
    queryKey: ["tenant-summary", tenant.id],
    queryFn: () => api.get(`/tenants/${tenant.id}/data-summary`).then((r) => r.data),
  });

  const toggle = (m) => {
    const next = new Set(selected);
    next.has(m) ? next.delete(m) : next.add(m);
    setSelected(next);
  };

  const SUMMARY_LABELS = {
    users: "Users", projects: "Projects", clients: "Clients",
    vendors: "Vendors", employees: "Employees", estimates: "Estimates",
    concept_generations: "AI Concepts", model3d_files: "3D Models",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" data-testid="edit-tenant-modal">
      <div className="surface p-6 w-full max-w-2xl my-8">
        <div className="section-eyebrow mb-1">Tenant · #{tenant.id}</div>
        <h2 className="font-heading font-semibold text-xl text-slate-900 dark:text-slate-100 mb-1">{tenant.name}</h2>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-mono">
          Admin: {tenant.admin_email || "—"} · Slug: {tenant.slug}
        </div>

        {/* Data drill-down */}
        {summary && (
          <div className="mb-6" data-testid="tenant-data-summary">
            <div className="section-eyebrow mb-2">Data in this tenant</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(SUMMARY_LABELS).map(([k, label]) => (
                <div key={k} className="rounded-lg bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="text-lg font-heading font-semibold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">{summary[k] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="section-eyebrow block mb-1.5">Company name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} data-testid="edit-tenant-name"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
        </div>

        <label className="flex items-center gap-2.5 mb-5 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} data-testid="edit-tenant-active"
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500/40" />
          <span className="text-sm text-slate-700 dark:text-slate-300">Tenant is active (users can log in)</span>
        </label>

        <div className="mb-5">
          <div className="section-eyebrow mb-2">Allowed modules · {selected.size} selected</div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {modules.map((m) => (
              <button key={m} type="button" onClick={() => toggle(m)} data-testid={`edit-module-${m}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  selected.has(m)
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-slate-300 dark:hover:ring-slate-700"
                }`}>
                <span className="truncate">{MODULE_LABELS[m] || m}</span>
                {selected.has(m) ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} className="opacity-40" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            Cancel
          </button>
          <button type="button" data-testid="edit-tenant-save"
            onClick={() => onSave({ name, is_active: isActive, allowed_modules: Array.from(selected) })}
            className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] uppercase tracking-[0.15em] font-semibold">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
