import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2 } from "lucide-react";

export default function BodyWeightPage() {
  const { user } = useAuth();
  const units = user?.units || "kg";
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");

  const load = async () => {
    const { data } = await api.get("/body-weight");
    setItems(data);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!weight) return;
    await api.post("/body-weight", { date, weight: Number(weight) });
    setWeight("");
    load();
  };
  const del = async (id) => {
    await api.delete(`/body-weight/${id}`);
    load();
  };

  const chartData = [...items]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, weight: d.weight }));

  return (
    <div className="space-y-6" data-testid="body-weight-page">
      <div>
        <div className="inline-block bg-brand-cyan text-black font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-2">
          SWOOSH!
        </div>
        <h1 className="font-display text-5xl">BODY WEIGHT</h1>
      </div>

      <form onSubmit={add} className="panel p-4 flex flex-wrap items-end gap-3" data-testid="bw-form">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1">Date</label>
          <input data-testid="bw-date" type="date" className="input-comic" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1">Weight ({units})</label>
          <input
            data-testid="bw-weight"
            type="text"
            inputMode="decimal"
            className="input-comic"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 75.4"
            required
          />
        </div>
        <button className="btn-comic" data-testid="bw-add-btn">
          <Plus size={16} /> Log
        </button>
      </form>

      <div className="panel p-4 h-72" data-testid="bw-chart">
        {chartData.length < 2 ? (
          <div className="h-full flex items-center justify-center text-brand-mute uppercase text-sm tracking-widest">
            Log at least 2 entries to see a trend.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="#27272A" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#A1A1AA" tick={{ fontSize: 10 }} />
              <YAxis stroke="#A1A1AA" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#FFE600" strokeWidth={3} dot={{ fill: "#00E5FF", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="panel p-4">
        <h2 className="font-display text-2xl mb-2">ENTRIES</h2>
        {items.length === 0 ? (
          <p className="text-brand-mute text-sm uppercase">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-brand-line">
            {items.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2" data-testid={`bw-row-${b.id}`}>
                <div>
                  <div className="font-bold">{b.weight} <span className="text-brand-mute text-sm">{units}</span></div>
                  <div className="text-xs text-brand-mute uppercase tracking-widest">{b.date}</div>
                </div>
                <button onClick={() => del(b.id)} className="text-brand-pink" data-testid={`bw-del-${b.id}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
