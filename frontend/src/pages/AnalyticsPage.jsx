import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const units = user?.units || "kg";
  const [streak, setStreak] = useState(null);
  const [muscle, setMuscle] = useState([]);
  const [bw, setBw] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedEx, setSelectedEx] = useState("");
  const [progression, setProgression] = useState(null);

  useEffect(() => {
    (async () => {
      const [s, m, b, ex] = await Promise.all([
        api.get("/stats/streak").then((r) => r.data),
        api.get("/stats/muscle-groups").then((r) => r.data),
        api.get("/body-weight").then((r) => r.data),
        api.get("/exercises").then((r) => r.data),
      ]);
      setStreak(s);
      setMuscle(m);
      setBw(b);
      setExercises(ex);
      if (ex.length) setSelectedEx(ex[0].name);
    })();
  }, []);

  useEffect(() => {
    if (!selectedEx) return;
    api.get("/stats/strength-progression", { params: { exercise_name: selectedEx } }).then((r) => setProgression(r.data));
  }, [selectedEx]);

  const bwSeries = useMemo(
    () => [...bw].sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ date: d.date, weight: d.weight })),
    [bw]
  );

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <div className="inline-block bg-brand-pink text-white font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-2">
          KAPOW!
        </div>
        <h1 className="font-display text-5xl">ANALYTICS</h1>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-4" data-testid="analytics-streak">
          <h2 className="font-display text-2xl mb-3">WEEKLY CONSISTENCY</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="border-2 border-brand-line p-3">
              <div className="text-xs uppercase text-brand-mute tracking-widest">Current</div>
              <div className="font-display text-3xl text-brand-yellow">{streak?.current_streak ?? 0}d</div>
            </div>
            <div className="border-2 border-brand-line p-3">
              <div className="text-xs uppercase text-brand-mute tracking-widest">Longest</div>
              <div className="font-display text-3xl text-brand-cyan">{streak?.longest_streak ?? 0}d</div>
            </div>
            <div className="border-2 border-brand-line p-3">
              <div className="text-xs uppercase text-brand-mute tracking-widest">12w Total</div>
              <div className="font-display text-3xl text-white">
                {streak?.weekly_counts?.reduce((a, b) => a + b.count, 0) ?? 0}
              </div>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={streak?.weekly_counts || []}>
                <CartesianGrid stroke="#27272A" strokeDasharray="3 3" />
                <XAxis dataKey="week_start" stroke="#A1A1AA" tick={{ fontSize: 9 }} />
                <YAxis stroke="#A1A1AA" tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#FFE600" stroke="#000" strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4" data-testid="analytics-muscle">
          <h2 className="font-display text-2xl mb-3">MUSCLE GROUP FREQUENCY</h2>
          {muscle.length === 0 ? (
            <p className="text-brand-mute text-sm uppercase">Complete workouts to populate.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={muscle} layout="vertical">
                  <CartesianGrid stroke="#27272A" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="#A1A1AA" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="muscle_group" stroke="#A1A1AA" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#00E5FF" stroke="#000" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-4" data-testid="analytics-bw-trend">
          <h2 className="font-display text-2xl mb-3">BODY WEIGHT TREND</h2>
          {bwSeries.length < 2 ? (
            <p className="text-brand-mute text-sm uppercase">Log at least 2 entries to see trend.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bwSeries}>
                  <CartesianGrid stroke="#27272A" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#A1A1AA" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#A1A1AA" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="#FF0055" strokeWidth={3} dot={{ fill: "#FFE600", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel p-4" data-testid="analytics-strength">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="font-display text-2xl">STRENGTH PROGRESSION</h2>
            <select
              data-testid="strength-exercise-select"
              className="input-comic max-w-[200px]"
              value={selectedEx}
              onChange={(e) => setSelectedEx(e.target.value)}
            >
              {exercises.length === 0 && <option value="">No exercises</option>}
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.name}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
          {!progression || progression.series.length === 0 ? (
            <p className="text-brand-mute text-sm uppercase">Log sets for this exercise to see progression.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progression.series}>
                  <CartesianGrid stroke="#27272A" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#A1A1AA" tick={{ fontSize: 10 }} />
                  <YAxis
                    stroke="#A1A1AA"
                    tick={{ fontSize: 10 }}
                    label={{ value: `1RM (${units})`, angle: -90, position: "insideLeft", fill: "#A1A1AA", fontSize: 10 }}
                  />
                  <Tooltip />
                  <Line type="monotone" dataKey="one_rm" stroke="#00FF66" strokeWidth={3} dot={{ fill: "#FFE600", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
