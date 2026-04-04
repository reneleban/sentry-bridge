import { useState } from "react";
import {
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Alert,
} from "@mantine/core";
import { IconPlugConnected, IconCheck, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useWizard } from "./WizardContext";

type Status = "idle" | "testing" | "ok" | "error";

export function StepPrusaLink() {
  const { t } = useTranslation();
  const { data, setData, nextStep } = useWizard();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleTest() {
    setStatus("testing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/wizard/test-prusalink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: data.prusaLinkUrl,
          username: data.username,
          password: data.password,
        }),
      });
      if (res.ok) {
        setStatus("ok");
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message ?? t("wizard.prusalink.error"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("wizard.prusalink.error"));
      setStatus("error");
    }
  }

  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        {t("wizard.prusalink.description")}
      </Text>
      <TextInput
        label={t("wizard.prusalink.url")}
        placeholder={t("wizard.prusalink.url_placeholder")}
        value={data.prusaLinkUrl}
        onChange={(e) => setData({ prusaLinkUrl: e.currentTarget.value })}
      />
      <TextInput
        label={t("wizard.prusalink.username")}
        placeholder={t("wizard.prusalink.username_placeholder")}
        value={data.username}
        onChange={(e) => setData({ username: e.currentTarget.value })}
      />
      <PasswordInput
        label={t("wizard.prusalink.password")}
        value={data.password}
        onChange={(e) => setData({ password: e.currentTarget.value })}
      />
      {status === "ok" && (
        <Alert color="green" icon={<IconCheck size={16} />}>
          {t("wizard.prusalink.success")}
        </Alert>
      )}
      {status === "error" && (
        <Alert color="red" icon={<IconX size={16} />}>
          {errorMsg}
        </Alert>
      )}
      <Button
        leftSection={<IconPlugConnected size={16} />}
        variant="default"
        loading={status === "testing"}
        onClick={handleTest}
        disabled={!data.prusaLinkUrl || !data.password}
      >
        {t("wizard.prusalink.test")}
      </Button>
      <Button onClick={nextStep} disabled={status !== "ok"}>
        {t("wizard.prusalink.next")}
      </Button>
    </Stack>
  );
}
