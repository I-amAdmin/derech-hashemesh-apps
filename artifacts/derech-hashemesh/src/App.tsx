import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Quotes from "@/pages/quotes";
import QuoteNew from "@/pages/quote-new";
import QuoteDetail from "@/pages/quote-detail";
import Customers from "@/pages/customers";
import QuoteEdit from "@/pages/quote-edit";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/products" component={Products} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/quotes/new" component={QuoteNew} />
      <Route path="/quotes/:id/edit" component={QuoteEdit} />
      <Route path="/quotes/:id" component={QuoteDetail} />
      <Route path="/customers" component={Customers} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
