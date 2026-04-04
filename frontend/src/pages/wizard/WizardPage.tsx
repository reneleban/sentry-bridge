import { Container, Paper, Stepper, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { WizardProvider, useWizard } from "./WizardContext";
import { StepPrusaLink } from "./StepPrusaLink";
import { StepCamera } from "./StepCamera";
import { StepObico } from "./StepObico";
import { StepDone } from "./StepDone";

function WizardContent() {
  const { t } = useTranslation();
  const { step } = useWizard();

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="xl" ta="center">
        {t("wizard.title")}
      </Title>
      <Stepper active={step} mb="xl">
        <Stepper.Step label={t("wizard.steps.prusalink")} />
        <Stepper.Step label={t("wizard.steps.camera")} />
        <Stepper.Step label={t("wizard.steps.obico")} />
        <Stepper.Step label={t("wizard.steps.done")} />
      </Stepper>
      <Paper withBorder p="xl" radius="md">
        {step === 0 && <StepPrusaLink />}
        {step === 1 && <StepCamera />}
        {step === 2 && <StepObico />}
        {step === 3 && <StepDone />}
      </Paper>
    </Container>
  );
}

export function WizardPage() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
