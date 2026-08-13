import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, LogOut, HardHat, IndianRupee, Truck, UserCog, FileText, ClipboardCheck, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { NotificationBell } from "./NotificationBell";

const STAFF = ["Admin", "SiteEngineer", "Accountant", "ProcurementOfficer"];
const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, roles: [...STAFF, "Client"] },
  { to: "/admin/projects", label: "Projects", icon: Building2, roles: [...STAFF, "Client"] },
  { to: "/portal/site-engineer", label: "Field Ops", icon: ClipboardCheck, roles: ["Admin", "SiteEngineer", "Client"] },
  { to: "/admin/clients", label: "Clients", icon: Users, roles: ["Admin", "SiteEngineer", "Accountant"] },
  { to: "/admin/finance", label: "Finance", icon: IndianRupee, roles: ["Admin", "Accountant"] },
  { to: "/admin/procurement/vendors", label: "Vendors", icon: Truck, roles: ["Admin", "SiteEngineer", "ProcurementOfficer"] },
  { to: "/admin/users", label: "Users", icon: UserCog, roles: ["Admin"] },
  { to: "/portal/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Vendor"] },
  { to: "/portal/vendor/bid-packages", label: "Bid Invites", icon: FileText, roles: ["Vendor"] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col fixed inset-y-0" data-testid="sidebar">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
          <div className="bg-amber-500 p-1.5 rounded-md">
            <HardHat size={20} strokeWidth={2.5} className="text-slate-900" />
          </div>
          <div className="font-heading font-bold text-xl tracking-tight leading-none text-white">
            BUILD<span className="text-amber-400">CORE</span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems
            .filter((i) => i.roles.includes(user?.role))
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                data-testid={`nav-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md border-l-2 transition-colors ${
                    isActive
                      ? "border-blue-500 bg-slate-800 text-white"
                      : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`
                }
              >
                <Icon size={17} strokeWidth={2.5} />
                <span className="uppercase tracking-[0.12em] text-xs font-semibold">{label}</span>
              </NavLink>
            ))}
        </nav>
        {["Admin", "SiteEngineer"].includes(user?.role) && (
          <div className="px-3 pb-2">
            <NotificationBell />
          </div>
        )}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-md flex items-center justify-center font-heading font-bold text-amber-400">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-white" data-testid="user-name">{user?.name}</div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{user?.role}</div>
            </div>
            <button
              data-testid="theme-toggle"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="p-2 rounded-md border border-slate-700 text-slate-400 hover:text-amber-400 hover:border-slate-500 transition-colors"
            >
              {theme === "dark" ? <Sun size={15} strokeWidth={2.5} /> : <Moon size={15} strokeWidth={2.5} />}
            </button>
          </div>
          <button
            data-testid="logout-button"
            onClick={async () => { await logout(); navigate("/login"); }}
            className="w-full flex items-center justify-center gap-2 border border-slate-700 rounded-md py-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <LogOut size={14} strokeWidth={2.5} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-60">{children}</main>
    </div>
  );
}
