import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, KeyRound, UserX, UserCheck, Trash2, HardHat } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { RoleBadge } from "../components/RoleBadge";
import { UserFormModal } from "../components/UserFormModal";
import { ProjectAssignmentPicker } from "../components/ProjectAssignmentPicker";

const ROLES = ["Admin", "SiteEngineer", "Accountant", "ProcurementOfficer", "Client", "Vendor"];
const STATUSES = ["Invited", "Active", "Disabled"];
const STATUS_STYLE = {
  Active: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
  Invited: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
  Disabled: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
};
const fmt = (n) => (n ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

export default function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [formModal, setFormModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [assignUser, setAssignUser] = useState(null);

  const { data: users } = useQuery({
    queryKey: ["allUsers", role, status],
    queryFn: () => api.get("/users/all", {
      params: { ...(role !== "all" && { role }), ...(status !== "all" && { status }) },
    }).then((r) => r.data),
  });

  const run = async (fn, ok) => {
    try { await fn(); toast.success(ok); qc.invalidateQueries({ queryKey: ["allUsers"] }); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message); }
  };

  const resetPassword = (u) => {
    const pw = window.prompt(`New password for ${u.name} (min 6 chars):`);
    if (!pw) return;
    if (pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    run(() => api.post(`/users/${u.id}/reset-password`, { new_password: pw }), "Password reset");
  };

  return (
    <div className="p-4 sm:p-8" data-testid="users-page">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Administration</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight leading-none">Users</h1>
        </div>
        <Button data-testid="add-user-button" onClick={() => { setEditUser(null); setFormModal(true); }}
          className="rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold uppercase tracking-wide">
          <Plus size={15} strokeWidth={3} /> Add User
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger data-testid="users-role-filter" className="w-48 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/([A-Z])/g, " $1").trim()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="users-status-filter" className="w-40 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm" data-testid="users-table">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Base Salary</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors" data-testid={`user-row-${u.id}`}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{u.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3">
                  <span className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${STATUS_STYLE[u.status] || STATUS_STYLE.Active}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{fmt(u.base_salary)}</td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{u.last_login_at ? u.last_login_at.slice(0, 10) : "Never"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {(u.role === "SiteEngineer" || u.role === "ProcurementOfficer") && (
                      <button data-testid={`assign-user-${u.id}`} title="Assign to project" onClick={() => setAssignUser(u)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400 transition-colors"><HardHat size={15} strokeWidth={2.5} /></button>
                    )}
                    <button data-testid={`edit-user-${u.id}`} title="Edit" onClick={() => { setEditUser(u); setFormModal(true); }}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400 transition-colors"><Pencil size={15} strokeWidth={2.5} /></button>
                    <button data-testid={`reset-password-${u.id}`} title="Reset password" onClick={() => resetPassword(u)}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:text-amber-400 transition-colors"><KeyRound size={15} strokeWidth={2.5} /></button>
                    {u.status !== "Disabled" ? (
                      <button data-testid={`disable-user-${u.id}`} title="Disable" onClick={() => run(() => api.post(`/users/${u.id}/disable`), `${u.name} disabled`)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400 transition-colors"><UserX size={15} strokeWidth={2.5} /></button>
                    ) : (
                      <button data-testid={`enable-user-${u.id}`} title="Enable" onClick={() => run(() => api.patch(`/users/${u.id}`, { status: "Active" }), `${u.name} enabled`)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400 transition-colors"><UserCheck size={15} strokeWidth={2.5} /></button>
                    )}
                    <button data-testid={`delete-user-${u.id}`} title="Delete"
                      onClick={() => window.confirm(`Delete ${u.name}? This cannot be undone.`) && run(() => api.delete(`/users/${u.id}`), "User deleted")}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} strokeWidth={2.5} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {(users || []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" data-testid="users-empty">No users match the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <UserFormModal open={formModal} onOpenChange={setFormModal} user={editUser} />
      <ProjectAssignmentPicker open={!!assignUser} onOpenChange={(v) => !v && setAssignUser(null)} targetUser={assignUser || {}} />
    </div>
  );
}
