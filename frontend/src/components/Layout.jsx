import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, LogOut, HardHat } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/projects", label: "Projects", icon: Building2 },
  { to: "/admin/clients", label: "Clients", icon: Users, adminOnly: true },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col fixed inset-y-0" data-testid="sidebar">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-zinc-800">
          <div className="bg-orange-500 p-1.5">
            <HardHat size={20} strokeWidth={2.5} className="text-zinc-950" />
          </div>
          <div className="font-heading font-bold text-xl tracking-wide leading-none">
            BUILD<span className="text-orange-500">CORE</span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems
            .filter((i) => !i.adminOnly || user?.role !== "Client")
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                data-testid={`nav-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium border-l-2 transition-colors ${
                    isActive
                      ? "border-orange-500 bg-zinc-900 text-white"
                      : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`
                }
              >
                <Icon size={17} strokeWidth={2.5} />
                <span className="uppercase tracking-[0.12em] text-xs font-semibold">{label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-zinc-800 border border-zinc-700 flex items-center justify-center font-heading font-bold text-orange-500">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" data-testid="user-name">{user?.name}</div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">{user?.role}</div>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={async () => { await logout(); navigate("/login"); }}
            className="w-full flex items-center justify-center gap-2 border border-zinc-700 py-2 text-xs uppercase tracking-[0.15em] font-semibold text-zinc-400 hover:text-white hover:border-orange-500 transition-colors"
          >
            <LogOut size={14} strokeWidth={2.5} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-60">{children}</main>
    </div>
  );
}
