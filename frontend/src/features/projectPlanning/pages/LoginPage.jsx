import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { HardHat, Loader2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { formatApiErrorDetail } from "../../../api/client";

const BG = "https://images.pexels.com/photos/4458205/pexels-photo-4458205.jpeg?auto=compress&cs=tinysrgb&w=1600";

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
    <div className="min-h-screen flex bg-white text-slate-900">
      <div className="hidden lg:block flex-1 relative grain-bg">
        <img src={BG} alt="Architectural blueprint" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="absolute bottom-0 left-0 p-12">
          <div className="text-amber-400 text-xs uppercase tracking-[0.3em] font-semibold mb-4">Construction Management Portal</div>
          <h1 className="font-heading font-bold text-5xl xl:text-6xl leading-[1.05] tracking-tight max-w-lg text-white">
            Build with <span className="text-amber-400">precision.</span><br />Track every phase.
          </h1>
          <p className="text-slate-300 mt-4 max-w-md leading-relaxed">
            Projects, phases and site progress — one command center for your entire construction operation.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 sm:px-14 border-l border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="bg-amber-500 p-2 rounded-md">
            <HardHat size={22} strokeWidth={2.5} className="text-slate-900" />
          </div>
          <span className="font-heading font-bold text-2xl tracking-tight">BUILD<span className="text-amber-500">CORE</span></span>
        </div>
        <h2 className="font-heading font-bold text-3xl tracking-tight mb-1">Sign in</h2>
        <p className="text-slate-500 text-sm mb-8">Access your project command center</p>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Email</label>
            <input data-testid="login-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-white border border-slate-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" placeholder="you@company.com" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Password</label>
            <input data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full bg-white border border-slate-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" placeholder="••••••••" />
          </div>
          {error && <p className="text-red-600 text-sm" data-testid="login-error">{error}</p>}
          <button data-testid="login-submit-button" type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-[0.15em] rounded-md py-3.5 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
            {loading && <Loader2 size={16} className="animate-spin" />} Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
