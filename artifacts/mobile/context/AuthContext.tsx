import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";

type AuthState = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  auth: AuthState;
  refetch: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  auth: "loading",
  refetch: () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function useProtectedRoute(auth: AuthState) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (auth === "loading") return;

    const inLoginScreen = segments[0] === "login";

    if (auth === "unauthenticated" && !inLoginScreen) {
      router.replace("/login");
    } else if (auth === "authenticated" && inLoginScreen) {
      router.replace("/(tabs)");
    }
  }, [auth, segments, router]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>("loading");

  function checkAuth() {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { authenticated?: boolean }) => {
        setAuth(data.authenticated ? "authenticated" : "unauthenticated");
      })
      .catch(() => setAuth("unauthenticated"));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setAuth("unauthenticated");
  }

  useEffect(() => {
    checkAuth();
  }, []);

  useProtectedRoute(auth);

  return (
    <AuthContext.Provider value={{ auth, refetch: checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
