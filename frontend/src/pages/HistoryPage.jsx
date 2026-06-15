import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const status = filter === "all" ? undefined : filter;
    const { data } = await api.get("/workouts", { params: status ? { status } : {} });
    setItems(data);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="space-y-6" data-testid="history-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="inline-block bg-brand-green text-black font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-2">
            BAM!
          </div>
          <h1 className="font-display text-5xl">HISTORY</h1>
        </div>
        <div className="flex gap-2">
          {["all", "completed", "scheduled"].map((s) => (
            <button
              key={s}
              data-testid={`filter-${s}`}
              onClick={() => setFilter(s)}
              className={`border-2 border-brand-line px-3 py-2 text-xs uppercase font-bold tracking-widest ${
                filter === s ? "bg-brand-yellow text-black border-black shadow-comic" : "text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-brand-mute uppercase text-sm tracking-widest">No workouts yet.</p>
          <Link to="/log" className="btn-comic mt-4 inline-flex" data-testid="history-empty-cta">
            Log Your First Workout
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((w) => (
            <Link
              to={`/log/${w.id}`}
              key={w.id}
              data-testid={`history-item-${w.id}`}
              className="panel panel-hover p-4 block"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-display text-2xl">{w.title}</div>
                <span
                  className={`tag-comic ${
                    w.status === "completed" ? "bg-brand-green text-black" : "bg-brand-pink text-white"
                  }`}
                >
                  {w.status}
                </span>
              </div>
              <div className="text-xs text-brand-mute uppercase tracking-widest mb-2">
                {w.date} · {w.exercises?.length || 0} exercises
              </div>
              <div className="flex flex-wrap gap-1">
                {(w.exercises || []).slice(0, 4).map((e, i) => (
                  <span key={i} className="tag-comic">
                    {e.exercise_name}
                  </span>
                ))}
                {(w.exercises?.length || 0) > 4 && (
                  <span className="tag-comic">+{w.exercises.length - 4}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
