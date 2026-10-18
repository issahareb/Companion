import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const SharePage = lazy(() => import("@/pages/SharePage"));
const DemoDashboard = lazy(() => import("@/pages/Demo"));
const ImprintPage = lazy(() => import("@/pages/Legal").then(m => ({ default: m.ImprintPage })));
const PrivacyPage = lazy(() => import("@/pages/Legal").then(m => ({ default: m.PrivacyPage })));

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
              <Suspense fallback={
                <div className="gg-route-loading min-h-[100dvh] flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
                  <div className="gg-route-loader" aria-hidden="true" />
                  <span className="font-mono text-xs tracking-[.24em] uppercase text-[var(--gg-muted)]">GuardianGrid / Loading</span>
                </div>
              }>
                <Router />
              </Suspense>
              <div className="noise-overlay" aria-hidden="true" />
            </div>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

export default App;
