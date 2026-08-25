const VARIANTS = {
  default: { icon: "text-blue-600 dark:text-blue-400", active: "border-blue-600 bg-white dark:bg-slate-900", dot: null },
  success: { icon: "text-emerald-600 dark:text-emerald-400", active: "border-emerald-500 bg-white dark:bg-slate-900", dot: "bg-emerald-50 dark:bg-emerald-500/100" },
  warning: { icon: "text-red-500", active: "border-red-500 bg-white dark:bg-slate-900", dot: "bg-red-50 dark:bg-red-500/100" },
  info: { icon: "text-sky-600 dark:text-sky-400", active: "border-sky-400 bg-white dark:bg-slate-900", dot: null },
};

export const DashboardStatCard = ({ label, value, icon: Icon, isActive, onClick, variant = "default", testId }) => {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      aria-pressed={!!isActive}
      className={`text-left border rounded-lg p-5 shadow-sm transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isActive ? `${v.active} ring-1 ring-inset ring-current` : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">
          {v.dot && <span className={`inline-block w-1.5 h-1.5 ${v.dot}`} />}
          {label}
        </span>
        <Icon size={17} strokeWidth={2.5} className={v.icon} />
      </div>
      <div className={`font-heading font-bold text-2xl md:text-3xl xl:text-4xl mt-3 leading-tight num-wrap ${isActive ? v.icon : "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </div>
      {isActive && (
        <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mt-2">Filter active — click to clear</div>
      )}
    </button>
  );
};
