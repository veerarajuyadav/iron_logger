import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [workouts, setWorkouts] = useState([]);
  const [selected, setSelected] = useState(ymd(new Date()));

  const load = async () => {
    const start = ymd(startOfMonth(cursor));
    const end = ymd(endOfMonth(cursor));
    const { data } = await api.get(`/workouts`, { params: { start, end } });
    setWorkouts(data);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const byDate = useMemo(() => {
    const m = {};
    for (const w of workouts) {
      (m[w.date] = m[w.date] || []).push(w);
    }
    return m;
  }, [workouts]);

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const startWeekday = first.getDay(); // 0 Sun
    const list = [];
    for (let i = 0; i < startWeekday; i++) list.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      list.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [cursor]);

  const todayStr = ymd(new Date());
  const selectedItems = byDate[selected] || [];

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="inline-block bg-brand-cyan text-black font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-2">
            ZAP!
          </div>
          <h1 className="font-display text-5xl">CALENDAR</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="cal-prev"
            className="btn-comic-outline px-3 py-2"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label="prev month"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="font-display text-3xl px-3" data-testid="cal-title">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
          <button
            data-testid="cal-next"
            className="btn-comic-outline px-3 py-2"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label="next month"
          >
            <ChevronRight size={16} />
          </button>
          <Link to={`/log?date=${selected}`} className="btn-comic" data-testid="cal-schedule-btn">
            <Plus size={16} /> Schedule
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-4">
        <div className="panel p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="font-bold uppercase text-xs text-brand-mute text-center tracking-widest">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square" />;
              const ds = ymd(d);
              const items = byDate[ds] || [];
              const isToday = ds === todayStr;
              const isSelected = ds === selected;
              return (
                <button
                  key={i}
                  data-testid={`cal-day-${ds}`}
                  onClick={() => setSelected(ds)}
                  className={`aspect-square border-2 p-1 text-left relative transition-colors ${
                    isToday
                      ? "bg-brand-yellow text-black border-black"
                      : isSelected
                      ? "border-brand-cyan bg-[#0a1f24]"
                      : "border-brand-line hover:border-brand-mute"
                  }`}
                >
                  <div className={`text-xs font-bold ${isToday ? "text-black" : "text-white"}`}>{d.getDate()}</div>
                  <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5">
                    {items.slice(0, 3).map((w) => (
                      <span
                        key={w.id}
                        className={`block h-1.5 w-1.5 ${
                          w.status === "completed" ? "bg-brand-green" : "bg-brand-pink"
                        }`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel p-4" data-testid="cal-day-detail">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">{selected}</h2>
            <Link to={`/log?date=${selected}`} className="btn-comic-cyan text-xs px-3 py-2" data-testid="cal-day-new">
              <Plus size={14} /> New
            </Link>
          </div>
          {selectedItems.length === 0 ? (
            <p className="text-brand-mute text-sm uppercase">No workouts on this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedItems.map((w) => (
                <li key={w.id} className="border-2 border-brand-line p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold uppercase">{w.title}</div>
                      <div className="text-xs text-brand-mute uppercase">
                        {w.status} · {w.exercises?.length || 0} exercises
                      </div>
                    </div>
                    <Link to={`/log/${w.id}`} className="text-brand-cyan text-xs font-bold uppercase" data-testid={`cal-open-${w.id}`}>
                      Open →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
