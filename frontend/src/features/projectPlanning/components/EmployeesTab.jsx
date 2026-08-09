import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, UserX, HardHat, IndianRupee } from "lucide-react";
import api, { formatApiErrorDetail } from "../../../api/client";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { EmployeeFormModal } from "./EmployeeFormModal";
import { DailyAttendanceCard } from "./DailyAttendanceCard";
import { AttendanceMarkGrid } from "./AttendanceMarkGrid";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const iso = (d) => d.toISOString().slice(0, 10);
const todayIso = () => iso(new Date());
const lastNDays = (n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(iso(d));
  }
  return out;
};
const monthStart = () => { const d = new Date(); d.setDate(1); return iso(d); };

export const EmployeesTab = ({ projectId }) => {
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, employee: null });
  const [range, setRange] = useState({ from: monthStart(), to: todayIso() });
  const dates = lastNDays(7);
  const today = todayIso();

  const { data: employees } = useQuery({
    queryKey: ["employees", projectId],
    queryFn: () => api.get(`/projects/${projectId}/employees`).then((r) => r.data),
  });
  const { data: attendance } = useQuery({
    queryKey: ["attendance", projectId, dates[0], today],
    queryFn: () => api.get(`/projects/${projectId}/attendance`, { params: { date_from: dates[0], date_to: today } }).then((r) => r.data),
  });
  const { data: labour } = useQuery({
    queryKey: ["labourCost", projectId, range.from, range.to],
    queryFn: () => api.get(`/projects/${projectId}/labour-cost`, { params: { date_from: range.from, date_to: range.to } }).then((r) => r.data),
    enabled: !!range.from && !!range.to,
  });

  const active = (employees || []).filter((e) => e.status === "active");
  const attMap = {};
  (attendance || []).forEach((a) => { attMap[`${a.employee_id}|${a.attendance_date}`] = a.status; });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["attendance", projectId] });
    qc.invalidateQueries({ queryKey: ["labourCost", projectId] });
    qc.invalidateQueries({ queryKey: ["employees", projectId] });
  };
  const mark = async (employee, status, date = today) => {
    try {
      await api.post(`/projects/${projectId}/attendance`, { employee_id: employee.id, attendance_date: date, status });
      toast.success(`${employee.name}: ${status.replace("_", " ")} on ${date}`);
      refresh();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };
  const deactivate = async (e) => {
    if (!window.confirm(`Deactivate ${e.name}? Attendance history is preserved.`)) return;
    try { await api.post(`/employees/${e.id}/deactivate`); toast.success("Employee deactivated"); refresh(); }
    catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message); }
  };

  return (
    <div className="space-y-8" data-testid="employees-tab-content">
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold flex items-center gap-2">
            <HardHat size={13} strokeWidth={2.5} /> Today's Attendance · {today}
          </div>
          <Button data-testid="add-employee-button" size="sm" onClick={() => setModal({ open: true, employee: null })}
            className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-[0.12em]">
            <Plus size={14} strokeWidth={3} /> Add Employee
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-3" data-testid="daily-attendance-list">
          {active.map((e) => (
            <DailyAttendanceCard key={e.id} employee={e} status={attMap[`${e.id}|${today}`]} onMark={(emp, s) => mark(emp, s, today)} />
          ))}
          {active.length === 0 && (
            <div className="border border-zinc-800 p-8 text-center text-zinc-500 md:col-span-2" data-testid="employees-empty">
              No employees on this project yet. Add your first field worker.
            </div>
          )}
        </div>
      </div>

      {active.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">Attendance — Last 7 Days (click a cell to mark/cycle)</div>
          <AttendanceMarkGrid employees={active} dates={dates} attendanceMap={attMap} onMark={mark} />
        </div>
      )}

      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">Employee Register · {(employees || []).length}</div>
        <div className="border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm" data-testid="employees-table">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Wage</th><th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(employees || []).map((e) => (
                <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors" data-testid={`employee-row-${e.id}`}>
                  <td className="px-4 py-2.5 font-semibold text-white">{e.name}</td>
                  <td className="px-4 py-2.5 text-zinc-300">{e.role_title || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{e.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-200">{e.daily_wage != null ? `${fmt(e.daily_wage)}/${e.wage_type === "daily" ? "day" : e.wage_type}` : "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{e.joining_date || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${e.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/40" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/40"}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button data-testid={`edit-employee-${e.id}`} title="Edit" onClick={() => setModal({ open: true, employee: e })}
                        className="p-1.5 text-zinc-500 hover:text-orange-500 transition-colors"><Pencil size={15} strokeWidth={2.5} /></button>
                      {e.status === "active" && (
                        <button data-testid={`deactivate-employee-${e.id}`} title="Deactivate" onClick={() => deactivate(e)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"><UserX size={15} strokeWidth={2.5} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(employees || []).length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No employees yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold flex items-center gap-2">
            <IndianRupee size={13} strokeWidth={2.5} /> Labour Cost Report
          </div>
          <div className="flex items-center gap-2">
            <Input data-testid="labour-from-input" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-8 w-36 text-xs" />
            <span className="text-zinc-600 text-xs">→</span>
            <Input data-testid="labour-to-input" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="bg-zinc-950 border-zinc-700 rounded-none h-8 w-36 text-xs" />
          </div>
        </div>
        <div className="border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm" data-testid="labour-cost-table">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
                <th className="px-4 py-3">Employee</th><th className="px-4 py-3 text-center">Days Present</th>
                <th className="px-4 py-3 text-right">Daily Wage</th><th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(labour?.rows || []).map((r) => (
                <tr key={r.employee_id} className="border-b border-zinc-800/50" data-testid={`labour-row-${r.employee_id}`}>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-white">{r.name}</span>
                    <span className="text-xs text-zinc-500 ml-2">{r.role_title || ""}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-heading font-bold text-lg text-zinc-200">{r.days_present}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400">{r.daily_wage != null ? fmt(r.daily_wage) : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white">{r.amount != null ? fmt(r.amount) : <span className="text-zinc-600 text-xs">manual ({r.wage_type})</span>}</td>
                </tr>
              ))}
              <tr className="bg-zinc-900/60">
                <td colSpan={3} className="px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Total Labour Cost · {labour?.date_from} → {labour?.date_to}</td>
                <td className="px-4 py-3 text-right font-heading font-bold text-xl text-orange-500" data-testid="labour-total">{fmt(labour?.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeFormModal open={modal.open} onOpenChange={(o) => setModal({ open: o, employee: o ? modal.employee : null })}
        projectId={projectId} employee={modal.employee} />
    </div>
  );
};
