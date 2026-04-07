import { useEffect, useState } from "react";
import {
  Badge,
  Card,
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

function stateColor(state: HealthState, restartCount = 0): string {
  if (state === "healthy" && restartCount > 0) return "yellow";
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

function stateLabel(state: HealthState, restartCount = 0): string {
  if (state === "healthy" && restartCount > 0) return "UNSTABLE";
  return state.toUpperCase();
}

function severityColor(severity: ErrorSeverity): string {
  switch (severity) {
    case "warn":
      return "yellow";
    case "error":
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
  const label = COMPONENT_LABELS[name] ?? name;
  const hasDetails = stats.lastErrors.length > 0 || !!stats.circuitBreaker;

  return (
    <Stack gap={6}>
      <Group justify="space-between">
        <Group gap="xs">
          <StateIcon state={stats.state} />
          <Text size="sm" fw={500}>
            {label}
          </Text>
          {stats.restartCount > 0 && (
            <Tooltip label={`${stats.restartCount} Neustart(s) seit Start`}>
              <Badge
                size="xs"
                color={stats.restartCount >= 3 ? "orange" : "gray"}
                variant="light"
              >
                ↺ {stats.restartCount}
              </Badge>
            </Tooltip>
          )}
        </Group>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {formatDuration(stats.stateSince)}
          </Text>
          <Badge
            size="xs"
            color={stateColor(stats.state, stats.restartCount)}
            variant="light"
          >
            {stateLabel(stats.state, stats.restartCount)}
          </Badge>
        </Group>
      </Group>

      {hasDetails && (
        <Stack gap={4} pl="calc(1.5rem + 8px)">
          {stats.circuitBreaker && (
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon
                color={cbStateColor(stats.circuitBreaker.state)}
                variant="light"
                size="xs"
                style={{ flexShrink: 0 }}
              >
                <IconShield size={10} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                CB:{" "}
                <Text
                  span
                  fw={600}
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
            <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
              <Badge
                size="xs"
                color={severityColor(e.severity)}
                variant="dot"
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                {e.severity}
              </Badge>
              <Text size="xs" c="dimmed" style={{ wordBreak: "break-word" }}>
                {new Date(e.ts).toLocaleTimeString()} — {e.msg}
              </Text>
            </Group>
          ))}
        </Stack>
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
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" mb="sm">
        <Title order={5}>{t("dashboard.resilience.heading")}</Title>
        {health &&
          (() => {
            const totalRestarts = health.components
              ? Object.values(health.components).reduce(
                  (s, c) => s + (c.restartCount ?? 0),
                  0
                )
              : 0;
            return (
              <Badge
                color={stateColor(health.overall, totalRestarts)}
                variant="light"
              >
                {stateLabel(health.overall, totalRestarts)}
              </Badge>
            );
          })()}
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
