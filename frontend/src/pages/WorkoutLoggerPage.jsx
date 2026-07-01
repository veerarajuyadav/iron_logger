import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Plus, Trash2, Save, CheckCircle2, Search } from "lucide-react";
import { searchLocal, mapToGroup } from "../lib/exerciseSearch";

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
  const [showPicker, setShowPicker] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExGroup, setNewExGroup] = useState("chest");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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
    } else if (!title) {
      setTitle(`Workout · ${new Date(date).toLocaleDateString(undefined, { weekday: "short" })}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const results = searchLocal({ query, group: newExGroup });
      setSearchResults(results);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, newExGroup]);

  // close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleExFocus = () => {
    if (searchResults.length === 0 && !searchQuery.trim()) {
      const results = searchLocal({ query: "", group: newExGroup });
      setSearchResults(results);
    }
    setShowDropdown(true);
  };

  const selectExercise = (exercise) => {
    setNewExName(exercise.name);
    setSearchQuery(exercise.name);
    setNewExGroup(mapToGroup(exercise.primary_muscle));
    setShowDropdown(false);
  };

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
    setSearchQuery("");
  };

  const removeExercise = (idx) => setExercises((arr) => arr.filter((_, i) => i !== idx));
  const addSet = (idx) =>
    setExercises((arr) => arr.map((e, i) => (i === idx ? { ...e, sets: [...e.sets, newSet()] } : e)));
  const sanitize = (val, key) => {
    if (val === "") return key === "rpe" ? null : 0;
    let num = Number(val);
    if (isNaN(num)) return null;
    if (key === "reps") return Math.floor(Math.max(0, num));
    if (key === "weight") return Math.max(0, Math.round(num * 10) / 10);
    if (key === "rpe") return Math.min(10, Math.max(1, Math.round(num * 2) / 2));
    return num;
  };
  const updateSet = (eIdx, sIdx, key, val) =>
    setExercises((arr) =>
      arr.map((e, i) =>
        i === eIdx
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === sIdx ? { ...s, [key]: sanitize(val, key) } : s
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
                          type="text"
                          inputMode="decimal"
                          className="input-comic w-full min-w-[80px]"
                          value={s.weight || ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "" || /^\d*\.?\d{0,1}$/.test(raw)) {
                              updateSet(eIdx, sIdx, "weight", raw);
                            }
                          }}
                        />
                      </td>
                      <td>
                        <input
                          data-testid={`set-reps-${eIdx}-${sIdx}`}
                          type="text"
                          inputMode="numeric"
                          className="input-comic w-full min-w-[80px]"
                          value={s.reps || ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "" || /^\d+$/.test(raw)) {
                              updateSet(eIdx, sIdx, "reps", raw);
                            }
                          }}
                        />
                      </td>
                      <td>
                        <input
                          data-testid={`set-rpe-${eIdx}-${sIdx}`}
                          type="text"
                          inputMode="decimal"
                          className="input-comic w-full min-w-[80px]"
                          value={s.rpe ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "" || /^\d{0,2}(\.?|\.5?)?$/.test(raw)) {
                              updateSet(eIdx, sIdx, "rpe", raw);
                            }
                          }}
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
            <div className="font-display text-2xl">Pick or Create Exercise</div>
            {library.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {library.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExerciseFromLibrary(ex)}
                    className="border-2 border-brand-line p-3 text-left hover:border-brand-yellow"
                    data-testid={`pick-exercise-${ex.id}`}
                  >
                    <div className="font-bold uppercase text-sm">{ex.name}</div>
                    <span className="tag-comic bg-brand-cyan text-black mt-1">{ex.muscle_group}</span>
                  </button>
                ))}
              </div>
            )}
              <div className="border-t-2 border-brand-line pt-3">
              <div className="text-xs uppercase font-bold tracking-widest mb-1">Or create new</div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[160px] relative">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-mute pointer-events-none" />
                    <input
                      ref={inputRef}
                      data-testid="new-exercise-name"
                      className="input-comic pl-9 w-full min-h-[48px]"
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setNewExName(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={handleExFocus}
                    />
                  </div>
                  {showDropdown && searchResults.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto panel p-1 shadow-comic border-2 border-brand-line"
                    >
                      {searchResults.map((ex, i) => (
                        <button
                          key={`${ex.name}-${i}`}
                          type="button"
                          className="w-full text-left px-3 py-3 sm:py-2 text-sm rounded hover:bg-brand-ink/5 transition-colors"
                          onClick={() => selectExercise(ex)}
                          data-testid={`search-result-${i}`}
                        >
                          <span className="font-semibold text-sm">{ex.name}</span>
                          <span className="ml-2 tag-comic bg-brand-cyan text-black text-[10px]">{mapToGroup(ex.primary_muscle)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
            <button onClick={() => setShowPicker(false)} className="text-brand-mute text-xs uppercase">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
