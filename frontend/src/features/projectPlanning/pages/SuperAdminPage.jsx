import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Plus, Shield, Users, Check, X, ChevronRight, LogOut } from "lucide-react";
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
  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

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

  const patchTenant = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/tenants/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries(["tenants"]); toast.success("Tenant updated"); },
    onError: (e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Update failed"),
  });

  if (user === null) return null;
  if (!user || !isSuperAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="superadmin-page">
      {/* Top bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center">
              <Shield size={18} className="text-white dark:text-slate-900" strokeWidth={2.25} />
            </div>
            <div>
              <div className="section-eyebrow">Sitera Platform</div>
              <div className="font-heading font-semibold text-lg leading-none text-slate-900 dark:text-slate-100">SuperAdmin Console</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-amber-600 dark:text-amber-500">Super Admin</div>
            </div>
            <button data-testid="superadmin-logout" onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="section-eyebrow">Tenants</div>
            <h1 className="font-heading font-semibold text-2xl md:text-3xl tracking-tight text-slate-900 dark:text-slate-100">Companies on Sitera</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tenants.length} tenant(s) provisioned</div>
          </div>
          <button data-testid="new-tenant-btn" onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] uppercase tracking-[0.15em] font-semibold">
            <Plus size={14} strokeWidth={2.5} /> New Tenant
          </button>
        </div>

        {isLoading ? (
          <div className="surface p-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        ) : tenants.length === 0 ? (
          <div className="surface p-12 text-center" data-testid="tenants-empty">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
              <Building2 size={22} className="text-slate-500" strokeWidth={2.25} />
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">No tenants yet</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Provision your first company to get started.</div>
          </div>
        ) : (
          <div className="space-y-3" data-testid="tenants-list">
            {tenants.map((t) => (
              <div key={t.id} data-testid={`tenant-row-${t.id}`}
                className="surface surface-hover p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 cursor-pointer"
                onClick={() => setEditingTenant(t)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                    <Building2 size={18} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-heading font-semibold text-slate-900 dark:text-slate-100 truncate">{t.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                      {t.admin_email || "no admin"} · {t.slug}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="section-eyebrow">Modules</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{(t.allowed_modules || []).length}/{modules.length}</div>
                  </div>
                  <div className="text-right">
                    <div className="section-eyebrow">Users</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{t.user_count}</div>
                  </div>
                  <span className={`chip ${t.is_active ? "chip-success" : "chip-muted"}`}>{t.is_active ? "Active" : "Paused"}</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </div>
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

  const toggle = (m) => {
    const next = new Set(selected);
    next.has(m) ? next.delete(m) : next.add(m);
    setSelected(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" data-testid="edit-tenant-modal">
      <div className="surface p-6 w-full max-w-2xl my-8">
        <div className="section-eyebrow mb-1">Tenant · #{tenant.id}</div>
        <h2 className="font-heading font-semibold text-xl text-slate-900 dark:text-slate-100 mb-1">{tenant.name}</h2>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-mono">
          Admin: {tenant.admin_email || "—"} · Slug: {tenant.slug} · Users: {tenant.user_count}
        </div>

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
