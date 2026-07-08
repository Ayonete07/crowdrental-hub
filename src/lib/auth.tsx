import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, extractToken, extractUser, getStoredUser, getToken, setStoredUser, setToken } from "./api";

type AuthState = {
  token: string | null;
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    setTok(t);
    setUser(getStoredUser());
    if (t) {
      api("/admin/auth/me")
        .then((r: any) => {
          const u = extractUser(r) || r;
          setUser(u);
          setStoredUser(u);
        })
        .catch(() => {
          setToken(null);
          setStoredUser(null);
          setTok(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const r: any = await api("/admin/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    const t = extractToken(r);
    if (!t) throw new Error("Login response missing token");
    setToken(t);
    setTok(t);
    let u = extractUser(r);
    if (!u) {
      try {
        const me: any = await api("/admin/auth/me");
        u = extractUser(me) || me;
      } catch {}
    }
    setUser(u);
    setStoredUser(u);
  };

  const logout = async () => {
    try {
      await api("/admin/auth/logout", { method: "POST" });
    } catch {}
    setToken(null);
    setStoredUser(null);
    setTok(null);
    setUser(null);
  };

  const refresh = async () => {
    try {
      const me: any = await api("/admin/auth/me");
      const u = extractUser(me) || me;
      setUser(u);
      setStoredUser(u);
    } catch {}
  };

  return (
    <AuthCtx.Provider value={{ token, user, loading, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
