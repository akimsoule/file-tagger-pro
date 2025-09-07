import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalCommand from "./components/GlobalCommand";
import GlobalFab from "./components/GlobalFab";
import { SettingsModal } from "./components/settings";
import { ThemeProvider } from "./components/ThemeProvider";
import { AppProviders } from "./contexts/AppProviders";
import { UiCommandProvider } from "./contexts/ui/UiCommandContext";
import { useUiCommands } from "./contexts/ui/useUiCommands";
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";

function RouteExtras() {
  const { pathname } = useLocation();
  // Afficher uniquement sur la page d'accueil et Favoris
  const allowed = pathname === "/"; // plus de page Favoris
  if (!allowed) return null;
  return (
    <>
      <GlobalCommand />
      <GlobalFab />
    </>
  );
}

function GlobalModals() {
  const { setOpenSettings } = useUiCommands();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    setOpenSettings(() => () => setSettingsOpen(true));
    return () => setOpenSettings(undefined);
  }, [setOpenSettings]);

  // Ouvrir automatiquement si l'URL contient ?modal=settings
  React.useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const wantSettings = sp.get("modal") === "settings";
    if (wantSettings) setSettingsOpen(true);
  }, [location.search]);

  return (
    <>
      <SettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          const sp = new URLSearchParams(location.search);
          if (sp.get("modal") === "settings") {
            sp.delete("modal");
            navigate(
              { pathname: location.pathname, search: sp.toString() ? `?${sp.toString()}` : "" },
              { replace: true },
            );
          }
        }}
      />
    </>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProviders>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <UiCommandProvider>
              <ErrorBoundary>
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <LoginPage />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <RouteExtras />
                <GlobalModals />
              </ErrorBoundary>
            </UiCommandProvider>
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </AppProviders>
  </QueryClientProvider>
);

export default App;
