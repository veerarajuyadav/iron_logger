import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Trash2 } from "lucide-react";

const MUSCLE_GROUPS = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "other"];

export default function ExercisesPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("chest");

  const load = async () => {
    const { data } = await api.get("/exercises");
    setItems(data);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/exercises", { name: name.trim(), muscle_group: group });
    setName("");
    load();
  };
  const del = async (id) => {
    await api.delete(`/exercises/${id}`);
    load();
  };

  return (
    <div className="space-y-6" data-testid="exercises-page">
      <div>
        <div className="inline-block bg-brand-yellow text-black font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-2">
          ZOOM!
        </div>
        <h1 className="font-display text-5xl">EXERCISES</h1>
        <p className="text-brand-mute text-sm uppercase tracking-widest mt-1">Build your custom library.</p>
      </div>

      <form onSubmit={add} className="panel p-4 flex flex-wrap items-end gap-3" data-testid="exercise-form">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold uppercase tracking-widest mb-1">Name</label>
          <input data-testid="ex-name-input" className="input-comic" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bench Press" required />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1">Group</label>
          <select data-testid="ex-group-select" className="input-comic" value={group} onChange={(e) => setGroup(e.target.value)}>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-comic" data-testid="ex-add-btn">
          <Plus size={16} /> Add
        </button>
      </form>

      {items.length === 0 ? (
        <div className="panel p-8 text-center text-brand-mute uppercase text-sm tracking-widest">
          No exercises yet. Add your first above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((ex) => (
            <div key={ex.id} className="panel p-4 flex items-center justify-between" data-testid={`exercise-card-${ex.id}`}>
              <div>
                <div className="font-display text-2xl">{ex.name}</div>
                <span className="tag-comic bg-brand-cyan text-black mt-1">{ex.muscle_group}</span>
              </div>
              <button onClick={() => del(ex.id)} className="text-brand-pink" data-testid={`ex-del-${ex.id}`}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
