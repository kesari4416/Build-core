const CYCLE = ["present", "half_day", "absent", "leave"];
const CELL = {
  present: "bg-green-500/15 text-green-400 border-green-500/30",
  half_day: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  absent: "bg-red-500/15 text-red-400 border-red-500/30",
  leave: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};
const LETTER = { present: "P", half_day: "½", absent: "A", leave: "L" };

export const AttendanceMarkGrid = ({ employees, dates, attendanceMap, onMark }) => (
  <div className="border border-zinc-800 overflow-x-auto">
    <table className="w-full text-sm" data-testid="attendance-grid">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
          <th className="px-4 py-3 min-w-[160px]">Employee</th>
          {dates.map((d) => (
            <th key={d} className="px-2 py-3 text-center min-w-[64px]">
              <div>{new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</div>
              <div className="text-zinc-400 normal-case">{d.slice(8)}/{d.slice(5, 7)}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {employees.map((e) => (
          <tr key={e.id} className="border-b border-zinc-800/50" data-testid={`grid-row-${e.id}`}>
            <td className="px-4 py-2">
              <div className="font-semibold text-white">{e.name}</div>
              <div className="text-[11px] text-zinc-500">{e.role_title || "—"}</div>
            </td>
            {dates.map((d) => {
              const status = attendanceMap[`${e.id}|${d}`];
              const next = CYCLE[(CYCLE.indexOf(status) + 1) % CYCLE.length];
              return (
                <td key={d} className="px-2 py-2 text-center">
                  <button data-testid={`grid-cell-${e.id}-${d}`}
                    title={status ? `${status} — click to change` : "Click to mark present"}
                    onClick={() => onMark(e, status ? next : "present", d)}
                    className={`w-9 h-9 border font-heading font-bold text-sm transition-colors ${
                      status ? CELL[status] : "border-zinc-800 text-zinc-700 hover:border-orange-500 hover:text-orange-500"}`}>
                    {status ? LETTER[status] : "·"}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
        {employees.length === 0 && (
          <tr><td colSpan={dates.length + 1} className="px-4 py-8 text-center text-zinc-500">No active employees.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);
