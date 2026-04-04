import { useEffect, useState } from "react";
import {
  Button,
  Code,
  Loader,
  Stack,
  Text,
  TextInput,
  Alert,
  CopyButton,
  ActionIcon,
  Group,
} from "@mantine/core";
import { IconCheck, IconCopy, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useWizard } from "./WizardContext";

type Status = "idle" | "requesting" | "waiting" | "ok" | "error";

export function StepObico() {
  const { t } = useTranslation();
  const { data, setData, nextStep, prevStep } = useWizard();
  const [status, setStatus] = useState<Status>("idle");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function startPairing() {
    setStatus("requesting");
    setErrorMsg("");
    setPairingCode(null);
    try {
      const res = await fetch("/api/wizard/start-pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obicoServerUrl: data.obicoServerUrl }),
      });
      if (res.ok) {
        const body = await res.json();
        setPairingCode(body.pairingCode);
        setStatus("waiting");
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message ?? t("wizard.obico.error"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("wizard.obico.error"));
      setStatus("error");
    }
  }

  useEffect(() => {
    if (status !== "waiting") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/wizard/pairing-status");
        if (res.ok) {
          const body = await res.json();
          if (body.paired) {
            clearInterval(interval);
            setStatus("ok");
          }
        }
      } catch {
        // keep polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status === "ok") {
      const timer = setTimeout(nextStep, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, nextStep]);

  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        {t("wizard.obico.description")}
      </Text>
      <TextInput
        label={t("wizard.obico.server_url")}
        placeholder={t("wizard.obico.server_placeholder")}
        value={data.obicoServerUrl}
        onChange={(e) => setData({ obicoServerUrl: e.currentTarget.value })}
        disabled={status === "waiting" || status === "ok"}
      />
      {pairingCode && (
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {t("wizard.obico.pairing_code")}
          </Text>
          <Group gap="xs">
            <Code
              fz="xl"
              style={{
                letterSpacing: "0.2em",
                flex: 1,
                textAlign: "center",
                padding: "12px",
              }}
            >
              {pairingCode}
            </Code>
            <CopyButton value={pairingCode}>
              {({ copied, copy }) => (
                <ActionIcon variant="default" onClick={copy} size="xl">
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              )}
            </CopyButton>
          </Group>
        </Stack>
      )}
      {status === "waiting" && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            {t("wizard.obico.waiting")}
          </Text>
        </Group>
      )}
      {status === "ok" && (
        <Alert color="green" icon={<IconCheck size={16} />}>
          {t("wizard.obico.success")}
        </Alert>
      )}
      {status === "error" && (
        <Alert color="red" icon={<IconX size={16} />}>
          {errorMsg}
        </Alert>
      )}
      <Button
        loading={status === "requesting"}
        onClick={startPairing}
        disabled={
          !data.obicoServerUrl || status === "waiting" || status === "ok"
        }
      >
        {t("wizard.obico.heading")}
      </Button>
      <Button
        variant="default"
        onClick={prevStep}
        disabled={status === "waiting"}
      >
        {t("wizard.obico.back")}
      </Button>
    </Stack>
  );
}
