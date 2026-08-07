const STYLES = {
  Admin: "bg-orange-500/10 text-orange-400 border-orange-500/40",
  SiteEngineer: "bg-sky-500/10 text-sky-400 border-sky-500/40",
  Accountant: "bg-green-500/10 text-green-400 border-green-500/40",
  ProcurementOfficer: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40",
  Client: "bg-teal-500/10 text-teal-400 border-teal-500/40",
  Vendor: "bg-amber-500/10 text-amber-400 border-amber-500/40",
};

export const RoleBadge = ({ role }) => (
  <span data-testid={`role-badge-${role}`}
    className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-semibold whitespace-nowrap ${STYLES[role] || STYLES.Client}`}>
    {role?.replace(/([A-Z])/g, " $1").trim()}
  </span>
);
