import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createContext, useContext, useEffect, useState } from "react";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Quotes from "@/pages/quotes";
import QuoteNew from "@/pages/quote-new";
import QuoteDetail from "@/pages/quote-detail";
import Customers from "@/pages/customers";
import QuoteEdit from "@/pages/quote-edit";
import QuotePublic from "@/pages/quote-public";
import Login from "@/pages/login";

const queryClient = new QueryClient();

type AuthState = "loading" | "authenticated" | "unauthenticated";

const AuthContext = createContext<{ auth: AuthState; refetch: () => void }>({
  auth: "loading",
  refetch: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>("loading");

  function checkAuth() {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { authenticated?: boolean }) => {
        setAuth(data.authenticated ? "authenticated" : "unauthenticated");
      })
      .catch(() => setAuth("unauthenticated"));
  }

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ auth, refetch: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { auth } = useAuth();
  if (auth === "loading") return null;
  if (auth === "unauthenticated") return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  const { auth } = useAuth();

  return (
    <Switch>
      <Route path="/q/:token" component={QuotePublic} />
      <Route path="/login">
        {auth === "authenticated" ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/products" component={() => <ProtectedRoute component={Products} />} />
      <Route path="/quotes" component={() => <ProtectedRoute component={Quotes} />} />
      <Route path="/quotes/new" component={() => <ProtectedRoute component={QuoteNew} />} />
      <Route path="/quotes/:id/edit" component={() => <ProtectedRoute component={QuoteEdit} />} />
      <Route path="/quotes/:id" component={() => <ProtectedRoute component={QuoteDetail} />} />
      <Route path="/customers" component={() => <ProtectedRoute component={Customers} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/+$/, "") || ""}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
