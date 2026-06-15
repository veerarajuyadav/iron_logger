import { useAuth } from "../lib/AuthContext";
import { useState } from "react";

export default function SettingsPage() {
  const { user, updateUnits } = useAuth();
  const [units, setUnits] = useState(user?.units || "kg");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await updateUnits(units);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <div className="inline-block bg-brand-cyan text-black font-bold uppercase tracking-widest px-3 py-1 border-2 border-black shadow-comic mb-2">
          DING!
        </div>
        <h1 className="font-display text-5xl">SETTINGS</h1>
      </div>

      <div className="panel p-5 max-w-md">
        <h2 className="font-display text-2xl mb-3">UNITS</h2>
        <p className="text-brand-mute text-sm mb-3 uppercase tracking-widest">Choose your weight units.</p>
        <div className="flex gap-2">
          {["kg", "lbs"].map((u) => (
            <button
              key={u}
              data-testid={`units-${u}`}
              onClick={() => setUnits(u)}
              className={`flex-1 border-2 py-3 font-bold uppercase tracking-widest ${
                units === u ? "bg-brand-yellow text-black border-black shadow-comic" : "border-brand-line text-white"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        <button onClick={save} className="btn-comic mt-4 w-full" data-testid="save-units-btn">
          Save
        </button>
        {saved && <div className="mt-2 text-brand-green text-xs uppercase font-bold" data-testid="settings-saved">Saved!</div>}
      </div>

      <div className="panel p-5 max-w-md">
        <h2 className="font-display text-2xl mb-3">ACCOUNT</h2>
        <div className="text-sm">
          <div className="mb-1"><span className="text-brand-mute uppercase text-xs">Name:</span> <span className="font-bold ml-2">{user?.name}</span></div>
          <div><span className="text-brand-mute uppercase text-xs">Email:</span> <span className="font-bold ml-2">{user?.email}</span></div>
        </div>
      </div>
    </div>
  );
}
