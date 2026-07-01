import { useEffect, useState, useRef } from "react";
import api from "../lib/api";
import { searchExercises, filterByGroup, mapApiMuscleToGroup } from "../lib/ninjasApi";
import { Plus, Trash2, Search } from "lucide-react";

const MUSCLE_GROUPS = ["all", "chest", "back", "legs", "shoulders", "arms", "core", "cardio", "other"];

export default function ExercisesPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const load = async () => {
    const { data } = await api.get("/exercises");
    setItems(data);
  };

  useEffect(() => {
    load();
    if (!process.env.REACT_APP_NINJAS_API_KEY) {
      setNoKey(true);
    }
  }, []);

  // debounced search
  useEffect(() => {
    if (noKey) return;

    const query = searchQuery.trim();
    if (!query && group === "all") {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchExercises({ name: query || undefined });
        const filtered = filterByGroup(results || [], group);
        setSearchResults(filtered);
        setShowDropdown(true);
      } catch (e) {
        if (e.response?.status === 401 || e.response?.status === 403) {
          setNoKey(true);
        }
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, group, noKey]);

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

  const handleFocus = async () => {
    if (noKey) return;

    if (searchResults.length === 0 && !searchQuery.trim()) {
      setSearching(true);
      try {
        const results = await searchExercises({});
        const filtered = filterByGroup(results || [], group);
        setSearchResults(filtered);
      } catch (e) {
        if (e.response?.status === 401 || e.response?.status === 403) {
          setNoKey(true);
        }
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }
    setShowDropdown(true);
  };

  const selectExercise = (exercise) => {
    setName(exercise.name);
    setSearchQuery(exercise.name);
    setGroup(mapApiMuscleToGroup(exercise.muscle));
    setShowDropdown(false);
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim() || group === "all") return;
    await api.post("/exercises", { name: name.trim(), muscle_group: group });
    setName("");
    setSearchQuery("");
    load();
  };

  const del = async (id) => {
    await api.delete(`/exercises/${id}`);
    load();
  };

  const handleGroupChange = (val) => {
    setGroup(val);
    if (val !== "all") return;
    setName("");
    setSearchQuery("");
  };

  const canAdd = name.trim() && group !== "all";

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
        <div className="flex-1 min-w-[200px] relative">
          <label className="block text-xs font-bold uppercase tracking-widest mb-1">Name</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-mute pointer-events-none" />
            <input
              ref={inputRef}
              data-testid="ex-name-input"
              className="input-comic pl-9"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setName(e.target.value);
              }}
              onFocus={handleFocus}
              placeholder={noKey ? "Type exercise name..." : "Search exercises..."}
              required
            />
          </div>
          {showDropdown && !noKey && (searchResults.length > 0 || searching) && (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto panel p-1 shadow-comic border-2 border-brand-line"
            >
              {searching ? (
                <div className="p-3 text-sm text-brand-mute uppercase tracking-wider">Searching...</div>
              ) : (
                searchResults.map((ex, i) => (
                  <button
                    key={`${ex.name}-${i}`}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-brand-ink/5 transition-colors"
                    onClick={() => selectExercise(ex)}
                    data-testid={`search-result-${i}`}
                  >
                    <span className="font-semibold text-sm">{ex.name}</span>
                    <span className="ml-2 tag-comic bg-brand-cyan text-black text-[10px]">{mapApiMuscleToGroup(ex.muscle)}</span>
                  </button>
                ))
              )}
            </div>
          )}
          {noKey && (
            <p className="text-[10px] text-brand-pink mt-1 uppercase tracking-wider">
              Set REACT_APP_NINJAS_API_KEY to enable exercise search.
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1">Group</label>
          <select
            data-testid="ex-group-select"
            className="input-comic"
            value={group}
            onChange={(e) => handleGroupChange(e.target.value)}
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`btn-comic ${!canAdd ? "opacity-50 cursor-not-allowed" : ""}`}
          data-testid="ex-add-btn"
          disabled={!canAdd}
        >
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
