import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Dumbbell,
  History,
  Activity,
  Scale,
  ListChecks,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, testid: "nav-calendar" },
  { to: "/log", label: "Log Workout", icon: Dumbbell, testid: "nav-log" },
  { to: "/history", label: "History", icon: History, testid: "nav-history" },
  { to: "/analytics", label: "Analytics", icon: Activity, testid: "nav-analytics" },
  { to: "/body-weight", label: "Body Weight", icon: Scale, testid: "nav-bw" },
  { to: "/exercises", label: "Exercises", icon: ListChecks, testid: "nav-exercises" },
  { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-panel border-r-2 border-brand-line p-4 sticky top-0 h-screen">
        <div className="mb-8">
          <div className="font-display text-4xl text-brand-yellow leading-none">GAINS</div>
          <div className="font-display text-2xl text-white leading-none">TRACKER</div>
          <div className="mt-1 inline-block tag-comic bg-brand-pink text-white">v1.0</div>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                data-testid={it.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 border-2 font-bold uppercase text-sm tracking-wide transition-all ${
                    isActive
                      ? "bg-brand-yellow text-black border-black shadow-comic"
                      : "border-transparent text-white hover:border-brand-line hover:bg-[#27272A]"
                  }`
                }
              >
                <Icon size={18} strokeWidth={2.5} />
                {it.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-4 pt-4 border-t-2 border-brand-line">
          <div className="text-xs uppercase text-brand-mute mb-1">Signed in</div>
          <div className="text-sm font-bold truncate" data-testid="sidebar-user-name">{user?.name}</div>
          <div className="text-xs text-brand-mute truncate">{user?.email}</div>
          <button
            data-testid="logout-btn"
            onClick={async () => {
              await logout();
              nav("/login");
            }}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 border-2 border-brand-pink text-brand-pink font-bold uppercase text-sm py-2 hover:bg-brand-pink hover:text-white transition-colors"
          >
            <LogOut size={16} strokeWidth={2.5} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-brand-panel border-b-2 border-brand-line p-3 flex items-center justify-between">
        <div className="font-display text-2xl text-brand-yellow">GAINS TRACKER</div>
        <button
          data-testid="mobile-logout-btn"
          onClick={async () => {
            await logout();
            nav("/login");
          }}
          className="border-2 border-brand-pink text-brand-pink p-2"
          aria-label="logout"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Main */}
      <main className="flex-1 md:ml-0 ml-0 mt-14 md:mt-0 min-w-0">
        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-brand-panel border-t-2 border-brand-line overflow-x-auto flex">
          {items.slice(0, 6).map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] uppercase font-bold ${
                    isActive ? "text-brand-yellow" : "text-white"
                  }`
                }
              >
                <Icon size={18} />
                {it.label.split(" ")[0]}
              </NavLink>
            );
          })}
        </div>

        <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
