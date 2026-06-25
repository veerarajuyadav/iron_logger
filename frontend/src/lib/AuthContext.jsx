import { createContext, useContext, useEffect, useState } from "react";
import api, { formatApiError } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = unknown, false = logged out, obj = logged in
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.token) localStorage.setItem("gym_token", data.token);
      setUser(data);
      return { ok: true };
    } catch (e) {
      const errorPayload = e.response?.data?.detail ?? e.response?.data;
      return { ok: false, error: formatApiError(errorPayload) || e.message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      if (data.token) localStorage.setItem("gym_token", data.token);
      setUser(data);
      return { ok: true };
    } catch (e) {
      const errorPayload = e.response?.data?.detail ?? e.response?.data;
      return { ok: false, error: formatApiError(errorPayload) || e.message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (_e) {
      // ignore network errors on logout
    }
    localStorage.removeItem("gym_token");
    setUser(false);
  };

  const updateUnits = async (units) => {
    await api.patch("/auth/units", { units });
    setUser((u) => (u ? { ...u, units } : u));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, updateUnits }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
