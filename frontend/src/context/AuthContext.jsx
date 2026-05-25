import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = logged out, obj = logged in
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => setUser(false));
  }, []);

  async function login(email, password) {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return data;
    } catch (e) {
      const msg = formatApiError(e);
      setError(msg);
      throw new Error(msg);
    }
  }

  async function register(payload) {
    setError("");
    try {
      const { data } = await api.post("/auth/register", payload);
      setUser(data);
      return data;
    } catch (e) {
      const msg = formatApiError(e);
      setError(msg);
      throw new Error(msg);
    }
  }

  async function logout() {
    await api.post("/auth/logout");
    setUser(false);
  }

  const value = useMemo(
    () => ({ user, error, login, register, logout }),
    [user, error]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
