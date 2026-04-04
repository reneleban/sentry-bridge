import { useState } from "react";
import {
  Button,
  Card,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
  Title,
  Badge,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { StatusEvent } from "./usePrinterStatus";

interface Props {
  status: StatusEvent | null;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function stateColor(state: string): string {
  switch (state) {
    case "PRINTING":
      return "blue";
    case "PAUSED":
      return "yellow";
    case "FINISHED":
      return "green";
    case "ERROR":
      return "red";
    case "ATTENTION":
      return "orange";
    default:
      return "gray";
  }
}

export function PrinterCard({ status }: Props) {
  const { t } = useTranslation();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const printer = status?.printer ?? null;
  const job = status?.job ?? null;
  const state = printer?.state ?? "";
  const isPrinting = state === "PRINTING";
  const isPaused = state === "PAUSED";

  async function doAction(action: string) {
    setActionLoading(action);
    setActionError(null);
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setActionError(body.message ?? "Failed");
      }
    } catch {
      setActionError("Request failed");
    } finally {
      setActionLoading(null);
      setCancelOpen(false);
    }
  }

  return (
    <>
      <Modal
        opened={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t("dashboard.controls.cancel")}
        centered
        size="sm"
      >
        <Text mb="md">{t("dashboard.controls.confirm_cancel")}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setCancelOpen(false)}>
            {t("wizard.camera.back")}
          </Button>
          <Button
            color="red"
            loading={actionLoading === "cancel"}
            onClick={() => doAction("cancel")}
          >
            {t("dashboard.controls.cancel")}
          </Button>
        </Group>
      </Modal>

      <Card withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <Title order={5}>{t("dashboard.printer.heading")}</Title>
          {printer && (
            <Badge color={stateColor(state)} variant="light">
              {state}
            </Badge>
          )}
        </Group>

        <Stack gap="xs">
          {printer && (
            <Group gap="xl">
              <Text size="sm">
                {t("dashboard.printer.nozzle")}: {printer.tempNozzle.toFixed(1)}
                °C
                {printer.targetNozzle > 0 && ` / ${printer.targetNozzle}°C`}
              </Text>
              <Text size="sm">
                {t("dashboard.printer.bed")}: {printer.tempBed.toFixed(1)}°C
                {printer.targetBed > 0 && ` / ${printer.targetBed}°C`}
              </Text>
            </Group>
          )}

          {job ? (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {job.displayName || job.fileName}
              </Text>
              <Progress value={job.progress} size="sm" radius="xl" />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {job.progress.toFixed(1)}%
                </Text>
                <Text size="xs" c="dimmed">
                  {t("dashboard.printer.time_remaining")}:{" "}
                  {formatTime(job.timeRemaining)}
                </Text>
              </Group>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              {t("dashboard.printer.no_job")}
            </Text>
          )}

          {actionError && (
            <Text size="xs" c="red">
              {actionError}
            </Text>
          )}

          <Group mt="xs">
            <Button
              size="xs"
              variant="light"
              disabled={!isPrinting}
              loading={actionLoading === "pause"}
              onClick={() => doAction("pause")}
            >
              {t("dashboard.controls.pause")}
            </Button>
            <Button
              size="xs"
              variant="light"
              color="green"
              disabled={!isPaused}
              loading={actionLoading === "resume"}
              onClick={() => doAction("resume")}
            >
              {t("dashboard.controls.resume")}
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              disabled={!isPrinting && !isPaused}
              onClick={() => setCancelOpen(true)}
            >
              {t("dashboard.controls.cancel")}
            </Button>
          </Group>
        </Stack>
      </Card>
    </>
  );
}
