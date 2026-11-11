import { useEffect, useRef, useState } from "react";
import { Card, Image, Skeleton, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useHealth } from "../../hooks/useHealth";

// Reconnect when the stream showed no first frame within this time.
const FIRST_FRAME_TIMEOUT_MS = 30_000;

export function CameraCard() {
  const { t } = useTranslation();
  const { health } = useHealth();
  const [showStream, setShowStream] = useState(false);
  const [error, setError] = useState(false);
  // Changing it remounts the img, which opens a new /stream request.
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Show the img after a short delay — MJPEG onLoad fires only after first frame
  // which can take up to frameIntervalSeconds. Show skeleton briefly then reveal.
  useEffect(() => {
    const timer = setTimeout(() => setShowStream(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-retry when stream errors — camera may have recovered after a restart
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError(false);
      setAttempt((n) => n + 1);
    }, 15000);
    return () => clearTimeout(timer);
  }, [error]);

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
    if (previous !== null && previous !== healthySince) {
      setError(false);
      setAttempt((n) => n + 1);
    }
  }, [healthySince]);

  // Fallback: no first frame on this connection — try a new one.
  useEffect(() => {
    if (!showStream || error || loaded) return;
    const timer = setTimeout(
      () => setAttempt((n) => n + 1),
      FIRST_FRAME_TIMEOUT_MS
    );
    return () => clearTimeout(timer);
  }, [showStream, error, loaded, attempt]);

  useEffect(() => setLoaded(false), [attempt]);

  return (
    <Card withBorder radius="md" p="md">
      <Title order={5} mb="sm">
        {t("dashboard.camera.heading")}
      </Title>
      {!showStream && <Skeleton height={200} radius="md" />}
      {showStream && !error && (
        <Image
          key={attempt}
          src={`/stream?attempt=${attempt}`}
          radius="md"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
      {error && (
        <Text size="sm" c="dimmed">
          {t("dashboard.camera.no_frame")}
        </Text>
      )}
    </Card>
  );
}
