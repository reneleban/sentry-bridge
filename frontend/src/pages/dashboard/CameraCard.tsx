import { useEffect, useState } from "react";
import { Card, Image, Skeleton, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

const POLL_INTERVAL_MS = 10_000;

export function CameraCard() {
  const { t } = useTranslation();
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function fetchFrame() {
      try {
        const res = await fetch(`/api/camera/snapshot?t=${Date.now()}`);
        if (res.ok && alive) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch {
        // keep previous frame
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchFrame();
    const interval = setInterval(fetchFrame, POLL_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Card withBorder radius="md" p="md">
      <Title order={5} mb="sm">
        {t("dashboard.camera.heading")}
      </Title>
      {loading ? (
        <Skeleton height={200} radius="md" />
      ) : src ? (
        <Image src={src} radius="md" />
      ) : (
        <Text size="sm" c="dimmed">
          {t("dashboard.camera.no_frame")}
        </Text>
      )}
    </Card>
  );
}
