import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { HardHat, Loader2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { formatApiErrorDetail } from "../../../api/client";

const BG = "https://images.unsplash.com/photo-1664662566501-73a7e41d8c19?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

const demos = [
  { label: "Admin", email: "kesari4416@gmail.com", password: "admin123" },
  { label: "Engineer", email: "raj@buildcore.com", password: "engineer123" },
  { label: "Client", email: "priya@skyline.com", password: "client123" },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  const submit = async (ev, e = email, p = password) => {
    ev?.preventDefault();
    if (!e || !p) { setError("Email and password are required"); return; }
    setLoading(true);
    setError("");
    try {
      await login(e, p);
      navigate("/admin");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      <div className="hidden lg:block flex-1 relative grain-bg">
        <img src={BG} alt="Construction site" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-zinc-950/80" />
        <div className="absolute bottom-0 left-0 p-12">
          <div className="text-orange-500 text-xs uppercase tracking-[0.3em] font-semibold mb-4">Construction Management Portal</div>
          <h1 className="font-heading font-bold text-5xl xl:text-6xl leading-none uppercase max-w-lg">
            Build with <span className="text-orange-500">precision.</span><br />Track every phase.
          </h1>
          <p className="text-zinc-400 mt-4 max-w-md leading-relaxed">
            Projects, phases and site progress — one command center for your entire construction operation.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 sm:px-14 border-l border-zinc-800">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="bg-orange-500 p-2">
            <HardHat size={22} strokeWidth={2.5} className="text-zinc-950" />
          </div>
          <span className="font-heading font-bold text-2xl tracking-wide">BUILD<span className="text-orange-500">CORE</span></span>
        </div>
        <h2 className="font-heading font-semibold text-3xl uppercase tracking-wide mb-1">Sign In</h2>
        <p className="text-zinc-500 text-sm mb-8">Access your project command center</p>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Email</label>
            <input data-testid="login-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="you@company.com" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Password</label>
            <input data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="••••••••" />
          </div>
          {error && <p className="text-red-400 text-sm" data-testid="login-error">{error}</p>}
          <button data-testid="login-submit-button" type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold uppercase tracking-[0.15em] py-3.5 text-sm flex items-center justify-center gap-2 transition-colors hover:-translate-y-0.5 transition-transform">
            {loading && <Loader2 size={16} className="animate-spin" />} Sign In
          </button>
        </form>
        <div className="mt-10 border-t border-zinc-800 pt-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">Demo Accounts</div>
          <div className="grid grid-cols-3 gap-2">
            {demos.map((d) => (
              <button key={d.label} data-testid={`demo-login-${d.label.toLowerCase()}`}
                onClick={(ev) => { setEmail(d.email); setPassword(d.password); submit(ev, d.email, d.password); }}
                className="border border-zinc-700 py-2 text-xs uppercase tracking-[0.12em] font-semibold text-zinc-400 hover:text-orange-500 hover:border-orange-500 transition-colors">
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
