import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  Collapse,
  Group,
  Stack,
  Text,
  Title,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconRefresh,
  IconShield,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type HealthState = "healthy" | "degraded" | "recovering" | "down";
type CBState = "CLOSED" | "OPEN" | "HALF_OPEN";
type ErrorSeverity = "warn" | "error" | "critical";

interface ErrorEntry {
  ts: number;
  msg: string;
  severity: ErrorSeverity;
}

interface CircuitBreakerStats {
  state: CBState;
  failureCount: number;
  totalFailures: number;
  totalSuccesses: number;
  openedAt: number | null;
  timeUntilHalfOpenMs: number | null;
}

interface ComponentStats {
  state: HealthState;
  stateSince: number;
  restartCount: number;
  lastErrors: ErrorEntry[];
  circuitBreaker?: CircuitBreakerStats;
}

interface HealthResponse {
  overall: HealthState;
  components: Record<string, ComponentStats>;
}

const COMPONENT_LABELS: Record<string, string> = {
  prusalink: "PrusaLink",
  camera: "Kamera",
  obico_ws: "Obico WS",
  janus: "Janus",
  rtp_stream: "RTP Stream",
  janus_relay: "Janus Relay",
};

const COMPONENT_ORDER = [
  "prusalink",
  "obico_ws",
  "camera",
  "rtp_stream",
  "janus",
  "janus_relay",
];

function stateColor(state: HealthState): string {
  switch (state) {
    case "healthy":
      return "green";
    case "degraded":
      return "yellow";
    case "recovering":
      return "orange";
    case "down":
      return "red";
  }
}

function severityColor(severity: ErrorSeverity): string {
  switch (severity) {
    case "warn":
      return "yellow";
    case "error":
      return "red";
    case "critical":
      return "red";
  }
}

function cbStateColor(state: CBState): string {
  switch (state) {
    case "CLOSED":
      return "green";
    case "HALF_OPEN":
      return "yellow";
    case "OPEN":
      return "red";
  }
}

function formatDuration(sinceMs: number): string {
  const s = Math.floor((Date.now() - sinceMs) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function StateIcon({ state }: { state: HealthState }) {
  switch (state) {
    case "healthy":
      return (
        <ThemeIcon color="green" variant="light" size="sm">
          <IconCircleCheck size={14} />
        </ThemeIcon>
      );
    case "recovering":
      return (
        <ThemeIcon color="orange" variant="light" size="sm">
          <IconRefresh size={14} />
        </ThemeIcon>
      );
    case "degraded":
      return (
        <ThemeIcon color="yellow" variant="light" size="sm">
          <IconAlertTriangle size={14} />
        </ThemeIcon>
      );
    case "down":
      return (
        <ThemeIcon color="red" variant="light" size="sm">
          <IconCircleX size={14} />
        </ThemeIcon>
      );
  }
}

function ComponentRow({
  name,
  stats,
}: {
  name: string;
  stats: ComponentStats;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails = stats.lastErrors.length > 0 || stats.circuitBreaker;
  const label = COMPONENT_LABELS[name] ?? name;

  return (
    <Stack gap={4}>
      <Group
        justify="space-between"
        style={{ cursor: hasDetails ? "pointer" : "default" }}
        onClick={() => hasDetails && setOpen((o) => !o)}
      >
        <Group gap="xs">
          <StateIcon state={stats.state} />
          <Text size="sm" fw={500}>
            {label}
          </Text>
          {stats.restartCount > 0 && (
            <Tooltip label={`${stats.restartCount} Neustart(s) seit Start`}>
              <Badge size="xs" color="gray" variant="light">
                ↺ {stats.restartCount}
              </Badge>
            </Tooltip>
          )}
        </Group>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {formatDuration(stats.stateSince)}
          </Text>
          <Badge size="xs" color={stateColor(stats.state)} variant="light">
            {stats.state}
          </Badge>
        </Group>
      </Group>

      {hasDetails && (
        <Collapse expanded={open}>
          <Stack gap={4} pl="lg">
            {stats.circuitBreaker && (
              <Group gap="xs">
                <ThemeIcon
                  color={cbStateColor(stats.circuitBreaker.state)}
                  variant="light"
                  size="xs"
                >
                  <IconShield size={10} />
                </ThemeIcon>
                <Text size="xs" c="dimmed">
                  Circuit Breaker:{" "}
                  <Text
                    span
                    fw={500}
                    c={cbStateColor(stats.circuitBreaker.state)}
                  >
                    {stats.circuitBreaker.state}
                  </Text>
                  {stats.circuitBreaker.state === "OPEN" &&
                    stats.circuitBreaker.timeUntilHalfOpenMs !== null && (
                      <>
                        {" "}
                        — Reset in{" "}
                        {Math.ceil(
                          stats.circuitBreaker.timeUntilHalfOpenMs / 1000
                        )}
                        s
                      </>
                    )}
                  {" · "}
                  {stats.circuitBreaker.failureCount}/
                  {stats.circuitBreaker.totalFailures} Fehler
                  {" · "}
                  {stats.circuitBreaker.totalSuccesses} OK
                </Text>
              </Group>
            )}
            {stats.lastErrors.map((e, i) => (
              <Group key={i} gap="xs" align="flex-start">
                <Badge
                  size="xs"
                  color={severityColor(e.severity)}
                  variant="dot"
                >
                  {e.severity}
                </Badge>
                <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                  {new Date(e.ts).toLocaleTimeString()} — {e.msg}
                </Text>
              </Group>
            ))}
          </Stack>
        </Collapse>
      )}
    </Stack>
  );
}

export function ResilienceCard() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    function fetchHealth() {
      fetch("/api/health")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setHealth(data as HealthResponse))
        .catch(() => {});
    }
    fetchHealth();
    const id = setInterval(fetchHealth, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card withBorder radius="md" p="md" style={{ height: "100%" }}>
      <Group justify="space-between" mb="sm">
        <Title order={5}>{t("dashboard.resilience.heading")}</Title>
        {health && (
          <Badge color={stateColor(health.overall)} variant="light">
            {health.overall}
          </Badge>
        )}
      </Group>
      <Stack gap="sm">
        {COMPONENT_ORDER.map((name) => {
          const stats = health?.components[name];
          if (!stats) return null;
          return <ComponentRow key={name} name={name} stats={stats} />;
        })}
        {!health && (
          <Text size="sm" c="dimmed">
            {t("dashboard.resilience.loading")}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
