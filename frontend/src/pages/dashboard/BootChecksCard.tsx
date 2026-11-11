import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Group, List, Text, ThemeIcon } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface BootCheckResult {
  id: string;
  ok: boolean;
  hint: string | null;
}

interface BootCheckReport {
  checkedAt: string | null;
  results: BootCheckResult[];
}

// The bridge runs its checks in the background right after start, so the
// first GET may arrive before they finish.
const PENDING_POLL_MS = 3000;

/** Startup diagnostics (#13). Shown only while a check fails. */
export function BootChecksCard() {
  const { t } = useTranslation();
  const [report, setReport] = useState<BootCheckReport | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/boot-checks");
      if (res.ok) setReport((await res.json()) as BootCheckReport);
    } catch {
      // Diagnostics are best effort; the health card covers connectivity.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (report && report.checkedAt !== null) return;
    const id = setInterval(load, PENDING_POLL_MS);
    return () => clearInterval(id);
  }, [report, load]);

  const recheck = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/boot-checks", { method: "POST" });
      if (res.ok) setReport((await res.json()) as BootCheckReport);
    } catch {
      // keep the previous report
    } finally {
      setRunning(false);
    }
  };

  if (!report || !report.results.some((r) => !r.ok)) return null;

  return (
    <Alert
      color="red"
      variant="light"
      icon={<IconAlertTriangle />}
      title={t("bootChecks.title")}
    >
      <List spacing="xs" size="sm" center>
        {report.results.map((r) => (
          <List.Item
            key={r.id}
            icon={
              <ThemeIcon color={r.ok ? "green" : "red"} size="sm" radius="xl">
                {r.ok ? (
                  <IconCircleCheck size={14} />
                ) : (
                  <IconCircleX size={14} />
                )}
              </ThemeIcon>
            }
          >
            <Text size="sm" fw={500}>
              {t(`bootChecks.checks.${r.id}`)}
            </Text>
            {r.hint && (
              <Text size="xs" c="dimmed">
                {t(`bootChecks.hints.${r.hint}`)}
              </Text>
            )}
          </List.Item>
        ))}
      </List>
      <Group mt="sm">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconRefresh size={14} />}
          loading={running}
          onClick={recheck}
        >
          {t("bootChecks.recheck")}
        </Button>
      </Group>
    </Alert>
  );
}
