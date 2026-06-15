import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Flame } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await register(name.trim(), email.trim().toLowerCase(), password);
    setBusy(false);
    if (r.ok) nav("/");
    else setErr(r.error);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center p-6 order-2 md:order-1">
        <form onSubmit={onSubmit} className="w-full max-w-md panel p-8" data-testid="register-form">
          <div className="flex items-center gap-2 mb-6">
            <Flame className="text-brand-pink" />
            <h1 className="font-display text-4xl">Join The Crew</h1>
          </div>
          <p className="text-brand-mute text-sm mb-6 uppercase tracking-wide">
            Start your transformation today.
          </p>

          <label className="block text-xs font-bold uppercase tracking-wider mb-1">Name</label>
          <input
            data-testid="register-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input-comic mb-4"
            placeholder="Lifter Name"
          />

          <label className="block text-xs font-bold uppercase tracking-wider mb-1">Email</label>
          <input
            data-testid="register-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-comic mb-4"
            placeholder="you@gym.com"
          />

          <label className="block text-xs font-bold uppercase tracking-wider mb-1">Password</label>
          <input
            data-testid="register-password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input-comic"
            placeholder="6+ characters"
          />

          {err && (
            <div data-testid="register-error" className="text-brand-pink text-sm font-bold uppercase tracking-wide mt-3">
              {err}
            </div>
          )}

          <button
            data-testid="register-submit-btn"
            disabled={busy}
            className="btn-comic w-full mt-6 disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create Account"}
          </button>

          <div className="mt-6 text-sm text-brand-mute">
            Already lifting?{" "}
            <Link to="/login" className="text-brand-cyan font-bold uppercase" data-testid="goto-login-link">
              Sign in
            </Link>
          </div>
        </form>
      </div>

      <div
        className="hidden md:block relative bg-cover bg-center order-1 md:order-2"
        style={{
          backgroundImage:
            "linear-gradient(45deg, rgba(9,9,11,.5), rgba(0,229,255,.35)), url('https://images.unsplash.com/photo-1526506118085-60ce8714f8c5')",
        }}
      >
        <div className="absolute inset-0 flex items-end p-10">
          <div>
            <div className="inline-block bg-brand-yellow text-black font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-3">
              BOOM!
            </div>
            <div className="font-display text-6xl text-white leading-none drop-shadow-[4px_4px_0px_#000]">
              EVERY REP COUNTS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
