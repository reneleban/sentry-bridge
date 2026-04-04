import { useEffect, useState } from "react";
import { AppShell, Center, Loader } from "@mantine/core";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { WizardPage } from "./pages/wizard/WizardPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";

function useConfigured() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/wizard/configured")
      .then((r) => r.json())
      .then((b) => setConfigured((b as { configured: boolean }).configured))
      .catch(() => setConfigured(false));
  }, []);

  return configured;
}

export default function App() {
  const configured = useConfigured();

  return (
    <BrowserRouter>
      <AppShell header={{ height: 52 }}>
        <AppShell.Header>
          <AppHeader />
        </AppShell.Header>
        <AppShell.Main>
          {configured === null ? (
            <Center h="80vh">
              <Loader />
            </Center>
          ) : (
            <Routes>
              <Route path="/wizard" element={<WizardPage />} />
              <Route
                path="/"
                element={
                  configured ? (
                    <DashboardPage />
                  ) : (
                    <Navigate to="/wizard" replace />
                  )
                }
              />
            </Routes>
          )}
        </AppShell.Main>
      </AppShell>
    </BrowserRouter>
  );
}
