import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Card,
  Image,
  Skeleton,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useHealth } from "../../hooks/useHealth";
import { createMjpegParser } from "./mjpeg";
import classes from "./CameraCard.module.css";

// Retry delay after the stream failed.
const ERROR_RETRY_MS = 15_000;
// Reconnect when no frame arrived for this long, but give slow cameras at
// least two frame intervals.
const MIN_STALL_TIMEOUT_MS = 30_000;
// Window over which the frame rate is averaged.
const FPS_WINDOW_MS = 5_000;
// How often the badge and the stall check are re-evaluated.
const TICK_MS = 1_000;

function stallTimeoutMs(frameIntervalSeconds: number | null): number {
  return Math.max(MIN_STALL_TIMEOUT_MS, 2 * (frameIntervalSeconds ?? 0) * 1000);
}

export function CameraCard() {
  const { t } = useTranslation();
  const { health } = useHealth();
  const [error, setError] = useState(false);
  // Changing it opens a new /stream request.
  const [attempt, setAttempt] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [frameIntervalSeconds, setFrameIntervalSeconds] = useState<
    number | null
  >(null);
  // Arrival times of recent frames, and the start of the current connection.
  const frameTimes = useRef<number[]>([]);
  const connectedAt = useRef(Date.now());

  const reconnect = useCallback(() => {
    setError(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        const seconds = cfg?.camera?.frameIntervalSeconds;
        if (typeof seconds === "number") setFrameIntervalSeconds(seconds);
      })
      .catch(() => {});
  }, []);

  // Read the MJPEG stream and show each frame as an object URL.
  useEffect(() => {
    if (error) return;
    const controller = new AbortController();
    let url: string | null = null;
    connectedAt.current = Date.now();
    frameTimes.current = [];

    const push = createMjpegParser((jpeg) => {
      const next = URL.createObjectURL(
        new Blob([jpeg as BlobPart], { type: "image/jpeg" })
      );
      if (url) URL.revokeObjectURL(url);
      url = next;
      const ts = Date.now();
      frameTimes.current = [
        ...frameTimes.current.filter((x) => ts - x <= FPS_WINDOW_MS),
        ts,
      ];
      setSrc(next);
    });

    (async () => {
      const res = await fetch(`/stream?attempt=${attempt}`, {
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) throw new Error("stream ended");
        push(value);
      }
    })().catch(() => {
      if (!controller.signal.aborted) setError(true);
    });

    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [attempt, error]);

  // Auto-retry when stream errors — camera may have recovered after a restart
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(reconnect, ERROR_RETRY_MS);
    return () => clearTimeout(timer);
  }, [error, reconnect]);

  // A camera that turned healthy again (after a config change, a reconnect or
  // a container restart) is a new stream: the open response no longer gets
  // frames, so reconnect. stateSince changes on every state transition.
  const camera = health?.components.camera;
  const healthySince = camera?.state === "healthy" ? camera.stateSince : null;
  const lastHealthySince = useRef<number | null>(null);
  useEffect(() => {
    if (healthySince === null) return;
    const previous = lastHealthySince.current;
    lastHealthySince.current = healthySince;
    if (previous !== null && previous !== healthySince) reconnect();
  }, [healthySince, reconnect]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const lastFrame = frameTimes.current[frameTimes.current.length - 1] ?? null;
  const sinceMs = now - (lastFrame ?? connectedAt.current);
  const stallMs = stallTimeoutMs(frameIntervalSeconds);
  const stalled = sinceMs > stallMs;

  // Frame-stall reconnect: no frame on this connection for too long.
  useEffect(() => {
    if (!error && stalled) reconnect();
  }, [error, stalled, reconnect]);

  const recent = frameTimes.current.filter((x) => now - x <= FPS_WINDOW_MS);
  const fps = recent.length / (FPS_WINDOW_MS / 1000);
  // Warn once frames are late by more than one expected interval.
  const late =
    lastFrame === null ||
    sinceMs > Math.max(5_000, 2 * (frameIntervalSeconds ?? 0) * 1000);
  const seconds = (sinceMs / 1000).toFixed(1);
  const label = late
    ? t("dashboard.camera.badge_stalled", {
        seconds: Math.round(sinceMs / 1000),
      })
    : t("dashboard.camera.badge_live", { fps: fps.toFixed(1), seconds });

  return (
    <Card withBorder radius="md" p="md">
      <Title order={5} mb="sm">
        {t("dashboard.camera.heading")}
      </Title>
      {!error && !src && <Skeleton height={200} radius="md" />}
      {!error && src && (
        <Box pos="relative">
          <Image src={src} radius="md" alt={t("dashboard.camera.heading")} />
          <Tooltip
            label={label}
            withArrow
            position="left"
            events={{ hover: true, focus: true, touch: true }}
          >
            <span
              className={classes.badge}
              tabIndex={0}
              role="img"
              aria-label={label}
            >
              <span
                key={late ? "late" : (lastFrame ?? 0)}
                className={late ? classes.dotLate : classes.dotLive}
              />
            </span>
          </Tooltip>
        </Box>
      )}
      {error && (
        <Text size="sm" c="dimmed">
          {t("dashboard.camera.no_frame")}
        </Text>
      )}
    </Card>
  );
}
