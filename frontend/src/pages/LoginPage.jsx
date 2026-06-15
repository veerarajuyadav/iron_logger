import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await login(email.trim().toLowerCase(), password);
    setBusy(false);
    if (r.ok) nav("/");
    else setErr(r.error);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Hero */}
      <div
        className="hidden md:block relative bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(9,9,11,.65), rgba(255,0,85,.35)), url('https://images.pexels.com/photos/11433060/pexels-photo-11433060.jpeg')",
        }}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-10">
          <div>
            <div className="font-display text-7xl text-brand-yellow leading-none drop-shadow-[4px_4px_0px_#000]">
              GAINS
            </div>
            <div className="font-display text-7xl text-white leading-none drop-shadow-[4px_4px_0px_#000]">
              TRACKER
            </div>
            <div className="mt-4 inline-block bg-brand-cyan text-black font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic">
              POW! Track Every Rep.
            </div>
          </div>
          <div className="text-white/80 font-bold uppercase text-sm tracking-wider">
            Lift. Log. Level Up.
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md panel p-8" data-testid="login-form">
          <div className="flex items-center gap-2 mb-6">
            <Dumbbell className="text-brand-yellow" />
            <h1 className="font-display text-4xl">Welcome Back</h1>
          </div>
          <p className="text-brand-mute text-sm mb-6 uppercase tracking-wide">
            Sign in to crush your next session.
          </p>

          <label className="block text-xs font-bold uppercase tracking-wider mb-1">Email</label>
          <input
            data-testid="login-email-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-comic mb-4"
            placeholder="you@gym.com"
          />

          <label className="block text-xs font-bold uppercase tracking-wider mb-1">Password</label>
          <input
            data-testid="login-password-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-comic mb-2"
            placeholder="••••••••"
          />

          {err && (
            <div data-testid="login-error" className="text-brand-pink text-sm font-bold uppercase tracking-wide mt-2">
              {err}
            </div>
          )}

          <button
            data-testid="login-submit-btn"
            disabled={busy}
            className="btn-comic w-full mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-6 text-sm text-brand-mute">
            New here?{" "}
            <Link to="/register" className="text-brand-cyan font-bold uppercase tracking-wide" data-testid="goto-register-link">
              Create account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
