const VARIANTS = {
  default: { icon: "text-orange-500", active: "border-orange-500 bg-zinc-900", dot: null },
  success: { icon: "text-green-500", active: "border-green-500 bg-zinc-900", dot: "bg-green-500" },
  warning: { icon: "text-red-500", active: "border-red-500 bg-zinc-900", dot: "bg-red-500" },
  info: { icon: "text-sky-400", active: "border-sky-400 bg-zinc-900", dot: null },
};

export const DashboardStatCard = ({ label, value, icon: Icon, isActive, onClick, variant = "default", testId }) => {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      aria-pressed={!!isActive}
      className={`text-left border p-5 transition-colors hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
        isActive ? `${v.active} ring-1 ring-inset ring-current` : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
          {v.dot && <span className={`inline-block w-1.5 h-1.5 ${v.dot}`} />}
          {label}
        </span>
        <Icon size={17} strokeWidth={2.5} className={v.icon} />
      </div>
      <div className={`font-heading font-bold text-4xl mt-3 leading-none ${isActive ? v.icon : "text-white"}`}>
        {value}
      </div>
      {isActive && (
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mt-2">Filter active — click to clear</div>
      )}
    </button>
  );
};
