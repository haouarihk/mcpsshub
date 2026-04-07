"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthContext {
  authenticated: boolean;
  loading: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContext>({
  authenticated: false,
  loading: true,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/verify")
      .then((r) => r.json())
      .then((data) => {
        setAuthenticated(data.authenticated);
        if (!data.authenticated && pathname !== "/login") {
          router.push("/login");
        }
      })
      .catch(() => {
        setAuthenticated(false);
        if (pathname !== "/login") router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const login = async (token: string) => {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      setAuthenticated(true);
      router.push("/servers");
      return true;
    }
    return false;
  };

  const logout = () => {
    document.cookie =
      "remoteclaw_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setAuthenticated(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
