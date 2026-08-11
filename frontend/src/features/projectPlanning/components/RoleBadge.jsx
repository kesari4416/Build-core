const STYLES = {
  Admin: "bg-amber-50 text-blue-600 border-amber-300",
  SiteEngineer: "bg-sky-50 text-sky-600 border-sky-200",
  Accountant: "bg-emerald-50 text-emerald-600 border-emerald-200",
  ProcurementOfficer: "bg-amber-50 text-amber-600 border-amber-200",
  Client: "bg-teal-500/10 text-teal-400 border-teal-500/40",
  Vendor: "bg-amber-500/10 text-amber-400 border-amber-500/40",
};

export const RoleBadge = ({ role }) => (
  <span data-testid={`role-badge-${role}`}
    className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold whitespace-nowrap ${STYLES[role] || STYLES.Client}`}>
    {role?.replace(/([A-Z])/g, " $1").trim()}
  </span>
);
