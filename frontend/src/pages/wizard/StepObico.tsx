import { useState } from "react";
import {
  Button,
  Stack,
  Text,
  TextInput,
  Alert,
  PinInput,
  Group,
} from "@mantine/core";
import { IconCheck, IconX, IconLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useWizard } from "./WizardContext";

type Status = "idle" | "verifying" | "ok" | "error";

export function StepObico() {
  const { t } = useTranslation();
  const { data, setData, nextStep, prevStep } = useWizard();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>(
    data.obicoApiKey ? "ok" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const alreadyPaired = !!data.obicoApiKey && status !== "error";

  async function handleVerify() {
    setStatus("verifying");
    setErrorMsg("");
    try {
      const res = await fetch("/api/wizard/verify-pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obicoServerUrl: data.obicoServerUrl, code }),
      });
      if (res.ok) {
        const body = await res.json();
        const apiKey: string = body.apiKey;
        setData({ obicoApiKey: apiKey, obicoServerUrl: data.obicoServerUrl });
        await saveConfig(apiKey);
        setStatus("ok");
        setTimeout(nextStep, 1000);
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

  async function saveConfig(apiKey: string) {
    const saveRes = await fetch("/api/setup/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prusalink: {
          url: `http://${data.printerIp}`,
          username: data.username,
          password: data.password,
        },
        camera: { rtspUrl: data.rtspUrl, frameIntervalSeconds: 10 },
        obico: { serverUrl: data.obicoServerUrl, apiKey },
        polling: { statusIntervalMs: 5000 },
      }),
    });
    if (!saveRes.ok) {
      const body = await saveRes.json().catch(() => ({}));
      throw new Error(body.message ?? "Failed to save config");
    }
  }

  async function handleSkip() {
    try {
      await saveConfig(data.obicoApiKey);
      nextStep();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save");
      setStatus("error");
    }
  }

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
        disabled={alreadyPaired}
      />

      {alreadyPaired ? (
        <>
          <Alert color="green" icon={<IconLink size={16} />}>
            {t("wizard.obico.already_paired")}
          </Alert>
          {status === "error" && (
            <Alert color="red" icon={<IconX size={16} />}>
              {errorMsg}
            </Alert>
          )}
          <Group grow>
            <Button variant="default" onClick={prevStep}>
              {t("wizard.obico.back")}
            </Button>
            <Button onClick={handleSkip}>{t("wizard.obico.continue")}</Button>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => {
              setData({ obicoApiKey: "" });
              setStatus("idle");
            }}
          >
            {t("wizard.obico.relink")}
          </Button>
        </>
      ) : (
        <>
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {t("wizard.obico.pairing_code")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("wizard.obico.code_hint")}
            </Text>
            <Group justify="center">
              <PinInput
                length={6}
                type="number"
                value={code}
                onChange={setCode}
                disabled={status === "ok"}
                size="lg"
              />
            </Group>
          </Stack>
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
            loading={status === "verifying"}
            onClick={handleVerify}
            disabled={
              !data.obicoServerUrl || code.length < 6 || status === "ok"
            }
          >
            {t("wizard.obico.verify")}
          </Button>
          <Button
            variant="default"
            onClick={prevStep}
            disabled={status === "verifying"}
          >
            {t("wizard.obico.back")}
          </Button>
        </>
      )}
    </Stack>
  );
}
