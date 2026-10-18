import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

import Dashboard from "@/pages/Dashboard";
import SharePage from "@/pages/SharePage";
import DemoDashboard from "@/pages/Demo";
import { ImprintPage, PrivacyPage } from "@/pages/Legal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/share/:shareCode" component={SharePage} />
      <Route path="/demo" component={DemoDashboard} />
      <Route path="/imprint" component={ImprintPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary fallbackTitle="GuardianGrid encountered an error">
            <div className="guardian-app">
              <Toaster />
              <Router />
              <div className="noise-overlay" aria-hidden="true" />
            </div>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

export default App;
