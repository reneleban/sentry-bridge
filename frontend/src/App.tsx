import { AppShell } from "@mantine/core";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { WizardPage } from "./pages/wizard/WizardPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell header={{ height: 52 }}>
        <AppShell.Header>
          <AppHeader />
        </AppShell.Header>
        <AppShell.Main>
          <Routes>
            <Route path="/wizard" element={<WizardPage />} />
            <Route path="/" element={<WizardPage />} />
          </Routes>
        </AppShell.Main>
      </AppShell>
    </BrowserRouter>
  );
}
