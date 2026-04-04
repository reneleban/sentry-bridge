import { createContext, useContext, useState } from "react";

export interface WizardData {
  printerIp: string;
  rtspUrl: string;
  username: string;
  password: string;
  obicoServerUrl: string;
  obicoApiKey: string;
}

interface WizardContextValue {
  data: WizardData;
  setData: (patch: Partial<WizardData>) => void;
  step: number;
  nextStep: () => void;
  prevStep: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(0);
  const [data, setDataState] = useState<WizardData>({
    printerIp: "",
    rtspUrl: "",
    username: "maker",
    password: "",
    obicoServerUrl: "",
    obicoApiKey: "",
  });

  function setData(patch: Partial<WizardData>) {
    setDataState((prev) => ({ ...prev, ...patch }));
  }

  return (
    <WizardContext.Provider
      value={{
        data,
        setData,
        step,
        nextStep: () => setStep((s) => s + 1),
        prevStep: () => setStep((s) => s - 1),
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}
