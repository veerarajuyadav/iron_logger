import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Trash2 } from "lucide-react";

const MUSCLE_GROUPS = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "other"];

export default function ExercisesPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("chest");
  const [workoutName, setWorkoutName] = useState("");
  const [workouts, setWorkouts] = useState([]);

  const load = async () => {
    const [exRes, woRes] = await Promise.all([api.get("/exercises"), api.get("/workouts")]);
    setItems(exRes.data);
    const titles = [...new Set(woRes.data.map((w) => w.title).filter(Boolean))].sort();
    setWorkouts(titles);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/exercises", {
      name: name.trim(),
      muscle_group: group,
      workout_name: workoutName || null,
    });
    setName("");
    setWorkoutName("");
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
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1">Workout</label>
          <select data-testid="ex-workout-select" className="input-comic" value={workoutName} onChange={(e) => setWorkoutName(e.target.value)}>
            <option value="">None</option>
            {workouts.map((t) => (
              <option key={t} value={t}>
                {t}
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
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="tag-comic bg-brand-cyan text-black">{ex.muscle_group}</span>
                  {ex.workout_name && (
                    <span className="tag-comic bg-brand-yellow text-black">{ex.workout_name}</span>
                  )}
                </div>
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
