const OPTIONS = [
  ["present", "P", "Present", "bg-emerald-500 text-white border-emerald-500", "border-emerald-200 text-emerald-600 hover:bg-emerald-50"],
  ["half_day", "½", "Half Day", "bg-amber-500 text-white border-amber-500", "border-amber-200 text-amber-600 hover:bg-amber-50"],
  ["absent", "A", "Absent", "bg-red-500 text-white border-red-500", "border-red-200 text-red-600 hover:bg-red-50"],
  ["leave", "L", "Leave", "bg-sky-500 text-white border-sky-500", "border-sky-200 text-sky-600 hover:bg-sky-50"],
];

const STATUS_BADGE = {
  present: "border-emerald-200 text-emerald-600 bg-emerald-50",
  half_day: "border-amber-200 text-amber-600 bg-amber-50",
  absent: "border-red-200 text-red-600 bg-red-50",
  leave: "border-sky-200 text-sky-600 bg-sky-50",
};

export const DailyAttendanceCard = ({ employee, status, onMark, readOnly }) => (
  <div className="border border-slate-200 bg-white shadow-sm p-3 flex flex-wrap items-center gap-3" data-testid={`daily-attendance-${employee.id}`}>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold text-slate-900 truncate">{employee.name}</div>
      <div className="text-[11px] text-slate-500">{employee.role_title || "—"}</div>
    </div>
    {readOnly ? (
      <span data-testid={`attendance-status-${employee.id}`}
        className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${STATUS_BADGE[status] || "border-slate-300 text-slate-500"}`}>
        {OPTIONS.find((o) => o[0] === status)?.[2] || "Not marked"}
      </span>
    ) : (
      <div className="flex gap-1.5">
        {OPTIONS.map(([value, letter, label, active, idle]) => (
          <button key={value} title={label} data-testid={`mark-${value}-${employee.id}`}
            onClick={() => onMark(employee, value)}
            className={`w-9 h-9 border font-heading font-bold text-sm transition-colors ${status === value ? active : idle}`}>
            {letter}
          </button>
        ))}
      </div>
    )}
  </div>
);
