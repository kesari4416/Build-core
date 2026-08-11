const VARIANTS = {
  default: { icon: "text-blue-600", active: "border-blue-600 bg-white", dot: null },
  success: { icon: "text-emerald-600", active: "border-emerald-500 bg-white", dot: "bg-emerald-500" },
  warning: { icon: "text-red-500", active: "border-red-500 bg-white", dot: "bg-red-500" },
  info: { icon: "text-sky-600", active: "border-sky-400 bg-white", dot: null },
};

export const DashboardStatCard = ({ label, value, icon: Icon, isActive, onClick, variant = "default", testId }) => {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      aria-pressed={!!isActive}
      className={`text-left border rounded-lg p-5 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isActive ? `${v.active} ring-1 ring-inset ring-current` : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
          {v.dot && <span className={`inline-block w-1.5 h-1.5 ${v.dot}`} />}
          {label}
        </span>
        <Icon size={17} strokeWidth={2.5} className={v.icon} />
      </div>
      <div className={`font-heading font-bold text-4xl mt-3 leading-none ${isActive ? v.icon : "text-slate-900"}`}>
        {value}
      </div>
      {isActive && (
        <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mt-2">Filter active — click to clear</div>
      )}
    </button>
  );
};
