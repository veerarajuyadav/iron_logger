import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Scale, Trophy, CalendarClock, Activity, Plus, Flame } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [streak, setStreak] = useState(null);

  const load = async () => {
    const [d, s] = await Promise.all([
      api.get("/stats/dashboard").then((r) => r.data),
      api.get("/stats/streak").then((r) => r.data),
    ]);
    setData(d);
    setStreak(s);
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) return <div className="font-display text-3xl text-brand-yellow">LOADING...</div>;

  const units = user?.units || "kg";

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-block bg-brand-pink text-white font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-2">
            WHAM!
          </div>
          <h1 className="font-display text-5xl md:text-6xl leading-none">
            HEY, {user?.name?.split(" ")[0]?.toUpperCase() || "LIFTER"}!
          </h1>
          <p className="text-brand-mute mt-1 uppercase tracking-wide text-sm">
            Today is {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link to="/log" className="btn-comic" data-testid="dashboard-log-cta">
          <Plus size={18} /> Log Workout
        </Link>
      </header>

      {/* Hero stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5" data-testid="stat-body-weight">
          <div className="flex items-center gap-2 text-brand-cyan">
            <Scale size={18} /> <span className="text-xs uppercase font-bold tracking-widest">Body Weight</span>
          </div>
          <div className="font-display text-5xl mt-2 leading-none">
            {data.latest_weight ? data.latest_weight.weight : "—"}
            <span className="text-2xl text-brand-mute ml-1">{units}</span>
          </div>
          <div className="text-xs text-brand-mute mt-1">
            {data.latest_weight ? `As of ${data.latest_weight.date}` : "No entries yet"}
          </div>
        </div>
        <div className="panel p-5" data-testid="stat-total-workouts">
          <div className="flex items-center gap-2 text-brand-yellow">
            <Activity size={18} /> <span className="text-xs uppercase font-bold tracking-widest">Total Workouts</span>
          </div>
          <div className="font-display text-5xl mt-2 leading-none">{data.total_completed}</div>
          <div className="text-xs text-brand-mute mt-1">Completed all-time</div>
        </div>
        <div className="panel p-5" data-testid="stat-streak">
          <div className="flex items-center gap-2 text-brand-pink">
            <Flame size={18} /> <span className="text-xs uppercase font-bold tracking-widest">Current Streak</span>
          </div>
          <div className="font-display text-5xl mt-2 leading-none">
            {streak?.current_streak ?? 0}<span className="text-2xl text-brand-mute ml-1">d</span>
          </div>
          <div className="text-xs text-brand-mute mt-1">Best: {streak?.longest_streak ?? 0} days</div>
        </div>
        <div className="panel p-5" data-testid="stat-upcoming">
          <div className="flex items-center gap-2 text-white">
            <CalendarClock size={18} /> <span className="text-xs uppercase font-bold tracking-widest">Upcoming</span>
          </div>
          <div className="font-display text-5xl mt-2 leading-none">{data.upcoming_workouts.length}</div>
          <div className="text-xs text-brand-mute mt-1">Scheduled sessions</div>
        </div>
      </section>

      {/* Today's workout + PRs */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2" data-testid="todays-workout">
          <h2 className="font-display text-3xl mb-3">TODAY&apos;S WORKOUT</h2>
          {data.today_workouts.length === 0 ? (
            <div className="border-2 border-dashed border-brand-line p-6 text-center">
              <p className="text-brand-mute uppercase text-sm tracking-wider">Nothing scheduled. Ready to lift?</p>
              <Link to="/log" className="btn-comic-cyan mt-3 inline-flex" data-testid="empty-today-log">
                Start a Workout
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.today_workouts.map((w) => (
                <li key={w.id} className="border-2 border-brand-line p-4 hover:border-brand-yellow transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-2xl">{w.title}</div>
                      <div className="text-xs text-brand-mute uppercase tracking-wider">
                        {w.exercises?.length || 0} exercises · {w.status}
                      </div>
                    </div>
                    <Link
                      to={`/log/${w.id}`}
                      data-testid={`today-open-${w.id}`}
                      className="btn-comic-outline text-sm"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-5" data-testid="personal-records">
          <h2 className="font-display text-3xl mb-3 flex items-center gap-2">
            <Trophy className="text-brand-yellow" /> PRs
          </h2>
          {data.personal_records.length === 0 ? (
            <p className="text-brand-mute text-sm uppercase">No PRs yet — go set one!</p>
          ) : (
            <ul className="space-y-2">
              {data.personal_records.map((pr) => (
                <li key={pr.exercise_name} className="flex items-center justify-between border-b border-brand-line pb-2">
                  <div>
                    <div className="font-bold uppercase text-sm">{pr.exercise_name}</div>
                    <div className="text-xs text-brand-mute">
                      {pr.weight}{units} × {pr.reps}
                    </div>
                  </div>
                  <div className="font-display text-2xl text-brand-yellow">
                    {pr.one_rm}<span className="text-xs ml-1 text-brand-mute">1RM</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recent + Upcoming */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5" data-testid="recent-workouts">
          <h2 className="font-display text-3xl mb-3">RECENT</h2>
          {data.recent_workouts.length === 0 ? (
            <p className="text-brand-mute text-sm uppercase">No completed workouts yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recent_workouts.map((w) => (
                <li key={w.id} className="flex items-center justify-between border-b border-brand-line pb-2">
                  <div>
                    <div className="font-bold">{w.title}</div>
                    <div className="text-xs text-brand-mute uppercase">{w.date} · {w.exercises?.length || 0} exercises</div>
                  </div>
                  <Link to={`/log/${w.id}`} className="text-brand-cyan text-xs font-bold uppercase" data-testid={`recent-open-${w.id}`}>View →</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-5" data-testid="upcoming-workouts">
          <h2 className="font-display text-3xl mb-3">UPCOMING</h2>
          {data.upcoming_workouts.length === 0 ? (
            <p className="text-brand-mute text-sm uppercase">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcoming_workouts.map((w) => (
                <li key={w.id} className="flex items-center justify-between border-b border-brand-line pb-2">
                  <div>
                    <div className="font-bold">{w.title}</div>
                    <div className="text-xs text-brand-mute uppercase">{w.date}</div>
                  </div>
                  <Link to={`/log/${w.id}`} className="text-brand-cyan text-xs font-bold uppercase" data-testid={`upcoming-open-${w.id}`}>View →</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
