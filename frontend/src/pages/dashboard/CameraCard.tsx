import { useEffect, useState } from "react";
import { Card, Image, Skeleton, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

export function CameraCard() {
  const { t } = useTranslation();
  const [showStream, setShowStream] = useState(false);
  const [error, setError] = useState(false);

  // Show the img after a short delay — MJPEG onLoad fires only after first frame
  // which can take up to frameIntervalSeconds. Show skeleton briefly then reveal.
  useEffect(() => {
    const timer = setTimeout(() => setShowStream(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card withBorder radius="md" p="md">
      <Title order={5} mb="sm">
        {t("dashboard.camera.heading")}
      </Title>
      {!showStream && <Skeleton height={200} radius="md" />}
      {showStream && !error && (
        <Image src="/stream" radius="md" onError={() => setError(true)} />
      )}
      {error && (
        <Text size="sm" c="dimmed">
          {t("dashboard.camera.no_frame")}
        </Text>
      )}
    </Card>
  );
}
