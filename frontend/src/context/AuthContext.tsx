import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  getOrgId,
  getToken,
  setOrgId as persistOrgId,
  setToken as persistToken,
  type Me,
} from "../api/client";

type AuthState = {
  me: Me | null;
  orgId: number | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    full_name?: string;
    organization_name: string;
  }) => Promise<void>;
  logout: () => void;
  switchOrg: (id: number) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [orgId, setOrgId] = useState<number | null>(getOrgId());
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<Me>("/auth/me");
      setMe(data);
      if (!getOrgId() && data.memberships.length > 0) {
        const first = data.memberships[0].organization.id;
        persistOrgId(first);
        setOrgId(first);
      }
    } catch {
      persistToken(null);
      persistOrgId(null);
      setMe(null);
      setOrgId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      persistToken(access_token);
      await loadMe();
    },
    [loadMe]
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      full_name?: string;
      organization_name: string;
    }) => {
      const { access_token } = await api<{ access_token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      persistToken(access_token);
      await loadMe();
    },
    [loadMe]
  );

  const logout = useCallback(() => {
    persistToken(null);
    persistOrgId(null);
    setMe(null);
    setOrgId(null);
  }, []);

  const switchOrg = useCallback((id: number) => {
    persistOrgId(id);
    setOrgId(id);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ me, orgId, loading, login, register, logout, switchOrg }),
    [me, orgId, loading, login, register, logout, switchOrg]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
