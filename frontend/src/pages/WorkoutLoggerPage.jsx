import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Plus, Trash2, Save, CheckCircle2, Copy } from "lucide-react";

const MUSCLE_GROUPS = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "other"];

function newSet() {
  return { reps: 0, weight: 0, rpe: null };
}

export default function WorkoutLoggerPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const units = user?.units || "kg";

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(params.get("date") || new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState([]); // array of WorkoutExercise
  const [library, setLibrary] = useState([]);
  const [pastWorkouts, setPastWorkouts] = useState([]);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newExName, setNewExName] = useState("");
  const [newExGroup, setNewExGroup] = useState("chest");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/exercises").then((r) => setLibrary(r.data));
    if (id) {
      api.get(`/workouts/${id}`).then((r) => {
        const w = r.data;
        setTitle(w.title);
        setDate(w.date);
        setStatus(w.status);
        setNotes(w.notes || "");
        setExercises(w.exercises || []);
      });
    } else {
      if (!title) {
        setTitle(`Workout · ${new Date(date).toLocaleDateString(undefined, { weekday: "short" })}`);
      }
      api.get("/workouts", { params: { limit: 20 } }).then((r) => setPastWorkouts(r.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addExerciseFromLibrary = (ex) => {
    setExercises((arr) => [
      ...arr,
      { exercise_id: ex.id, exercise_name: ex.name, muscle_group: ex.muscle_group, sets: [newSet()], notes: "" },
    ]);
    setShowPicker(false);
  };

  const createAndAddExercise = async () => {
    if (!newExName.trim()) return;
    const { data } = await api.post("/exercises", { name: newExName.trim(), muscle_group: newExGroup });
    setLibrary((l) => [...l, data]);
    addExerciseFromLibrary(data);
    setNewExName("");
  };

  const removeExercise = (idx) => setExercises((arr) => arr.filter((_, i) => i !== idx));
  const addSet = (idx) =>
    setExercises((arr) => arr.map((e, i) => (i === idx ? { ...e, sets: [...e.sets, newSet()] } : e)));
  const updateSet = (eIdx, sIdx, key, val) =>
    setExercises((arr) =>
      arr.map((e, i) =>
        i === eIdx
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === sIdx ? { ...s, [key]: val === "" ? (key === "rpe" ? null : 0) : Number(val) } : s
              ),
            }
          : e
      )
    );
  const removeSet = (eIdx, sIdx) =>
    setExercises((arr) => arr.map((e, i) => (i === eIdx ? { ...e, sets: e.sets.filter((_, j) => j !== sIdx) } : e)));

  const save = async (overrideStatus) => {
    setSaving(true);
    const payload = {
      title: title || "Workout",
      date,
      status: overrideStatus || status,
      notes,
      exercises,
    };
    try {
      if (id) {
        await api.patch(`/workouts/${id}`, payload);
      } else {
        const { data } = await api.post(`/workouts`, payload);
        nav(`/log/${data.id}`, { replace: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!id) return;
    if (!window.confirm("Delete this workout?")) return;
    await api.delete(`/workouts/${id}`);
    nav("/history");
  };

  return (
    <div className="space-y-6" data-testid="workout-logger-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="inline-block bg-brand-yellow text-black font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-2">
            POW!
          </div>
          <h1 className="font-display text-5xl">{id ? "EDIT WORKOUT" : "NEW WORKOUT"}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => save()} disabled={saving} className="btn-comic-outline" data-testid="save-workout-btn">
            <Save size={16} /> {saving ? "Saving..." : "Save"}
          </button>
          {status !== "completed" && (
            <button
              onClick={() => save("completed")}
              disabled={saving}
              className="btn-comic"
              data-testid="complete-workout-btn"
            >
              <CheckCircle2 size={16} /> Complete
            </button>
          )}
          {id && (
            <button onClick={del} className="btn-comic-outline border-brand-pink text-brand-pink" data-testid="delete-workout-btn">
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="panel p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1">Title</label>
            <input data-testid="workout-title-input" className="input-comic" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1">Date</label>
            <input data-testid="workout-date-input" type="date" className="input-comic" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1">Status</label>
            <select data-testid="workout-status-select" className="input-comic" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1">Notes</label>
          <textarea data-testid="workout-notes-input" rows={2} className="input-comic" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {exercises.map((ex, eIdx) => (
          <div key={eIdx} className="panel p-4" data-testid={`exercise-block-${eIdx}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-display text-2xl">{ex.exercise_name}</div>
                <span className="tag-comic bg-brand-cyan text-black">{ex.muscle_group}</span>
              </div>
              <button onClick={() => removeExercise(eIdx)} className="text-brand-pink" data-testid={`remove-exercise-${eIdx}`}>
                <Trash2 size={18} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-brand-mute uppercase text-xs tracking-widest">
                    <th className="text-left py-1">Set</th>
                    <th className="text-left py-1">Weight ({units})</th>
                    <th className="text-left py-1">Reps</th>
                    <th className="text-left py-1">RPE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ex.sets.map((s, sIdx) => (
                    <tr key={sIdx} className="border-t border-brand-line">
                      <td className="py-2 font-display text-xl text-brand-yellow w-10">#{sIdx + 1}</td>
                      <td>
                        <input
                          data-testid={`set-weight-${eIdx}-${sIdx}`}
                          type="number"
                          step="0.5"
                          className="input-comic max-w-[120px]"
                          value={s.weight}
                          onChange={(e) => updateSet(eIdx, sIdx, "weight", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          data-testid={`set-reps-${eIdx}-${sIdx}`}
                          type="number"
                          className="input-comic max-w-[100px]"
                          value={s.reps}
                          onChange={(e) => updateSet(eIdx, sIdx, "reps", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          data-testid={`set-rpe-${eIdx}-${sIdx}`}
                          type="number"
                          step="0.5"
                          min="1"
                          max="10"
                          className="input-comic max-w-[100px]"
                          value={s.rpe ?? ""}
                          onChange={(e) => updateSet(eIdx, sIdx, "rpe", e.target.value)}
                          placeholder="—"
                        />
                      </td>
                      <td className="text-right">
                        <button onClick={() => removeSet(eIdx, sIdx)} className="text-brand-pink" data-testid={`remove-set-${eIdx}-${sIdx}`}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => addSet(eIdx)} className="btn-comic-outline mt-3 text-xs" data-testid={`add-set-${eIdx}`}>
              <Plus size={14} /> Add Set
            </button>
          </div>
        ))}

        {!showPicker ? (
          <button onClick={() => setShowPicker(true)} className="btn-comic w-full" data-testid="open-add-exercise">
            <Plus size={16} /> Add Exercise
          </button>
        ) : (
          <div className="panel p-4 space-y-3" data-testid="exercise-picker">
            <div className="font-display text-2xl">Pick Exercise</div>
            <input
              data-testid="exercise-search"
              className="input-comic w-full"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {library
                  .filter((ex) => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => { addExerciseFromLibrary(ex); setSearchQuery(""); }}
                      className="w-full border-2 border-brand-line p-3 text-left hover:border-brand-yellow"
                      data-testid={`pick-exercise-${ex.id}`}
                    >
                      <div className="font-bold uppercase text-sm">{ex.name}</div>
                      <span className="tag-comic bg-brand-cyan text-black mt-1 capitalize">{ex.muscle_group}</span>
                    </button>
                  ))}
                {library.filter((ex) => ex.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="border-t-2 border-brand-line pt-3 mt-3">
                    <div className="text-xs uppercase font-bold tracking-widest mb-1">Not found — create new</div>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        data-testid="new-exercise-name"
                        className="input-comic flex-1 min-w-[160px]"
                        placeholder="Exercise name"
                        value={newExName}
                        onChange={(e) => setNewExName(e.target.value)}
                      />
                      <select
                        data-testid="new-exercise-group"
                        className="input-comic max-w-[140px]"
                        value={newExGroup}
                        onChange={(e) => setNewExGroup(e.target.value)}
                      >
                        {MUSCLE_GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      <button onClick={createAndAddExercise} className="btn-comic-cyan" data-testid="create-exercise-btn">
                        Create & Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { setShowPicker(false); setSearchQuery(""); }} className="text-brand-mute text-xs uppercase">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
