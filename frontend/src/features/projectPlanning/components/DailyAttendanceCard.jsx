const OPTIONS = [
  ["present", "P", "Present", "bg-green-500 text-zinc-950 border-green-500", "border-green-500/40 text-green-400 hover:bg-green-500/10"],
  ["half_day", "½", "Half Day", "bg-yellow-500 text-zinc-950 border-yellow-500", "border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"],
  ["absent", "A", "Absent", "bg-red-500 text-zinc-950 border-red-500", "border-red-500/40 text-red-400 hover:bg-red-500/10"],
  ["leave", "L", "Leave", "bg-sky-500 text-zinc-950 border-sky-500", "border-sky-500/40 text-sky-400 hover:bg-sky-500/10"],
];

const STATUS_BADGE = {
  present: "border-green-500/40 text-green-400 bg-green-500/10",
  half_day: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
  absent: "border-red-500/40 text-red-400 bg-red-500/10",
  leave: "border-sky-500/40 text-sky-400 bg-sky-500/10",
};

export const DailyAttendanceCard = ({ employee, status, onMark, readOnly }) => (
  <div className="border border-zinc-800 bg-zinc-900/60 p-3 flex flex-wrap items-center gap-3" data-testid={`daily-attendance-${employee.id}`}>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold text-white truncate">{employee.name}</div>
      <div className="text-[11px] text-zinc-500">{employee.role_title || "—"}</div>
    </div>
    {readOnly ? (
      <span data-testid={`attendance-status-${employee.id}`}
        className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold ${STATUS_BADGE[status] || "border-zinc-700 text-zinc-500"}`}>
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
