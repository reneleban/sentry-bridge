import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { StatusEvent } from "./usePrinterStatus";

interface Props {
  status: StatusEvent | null;
}

export function StatusCard({ status }: Props) {
  const { t } = useTranslation();

  function badge(connected: boolean) {
    return (
      <Badge color={connected ? "green" : "red"} variant="light">
        {connected
          ? t("dashboard.status.connected")
          : t("dashboard.status.disconnected")}
      </Badge>
    );
  }

  return (
    <Card withBorder radius="md" p="md">
      <Title order={5} mb="sm">
        {t("dashboard.status.heading")}
      </Title>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm">{t("dashboard.status.prusalink")}</Text>
          {badge(status?.prusalink.connected ?? false)}
        </Group>
        <Group justify="space-between">
          <Text size="sm">{t("dashboard.status.obico")}</Text>
          {badge(status?.obico.connected ?? false)}
        </Group>
        <Group justify="space-between">
          <Text size="sm">{t("dashboard.status.camera")}</Text>
          {badge(status?.camera.connected ?? false)}
        </Group>
        {status?.janus.available && (
          <Group justify="space-between">
            <Group gap="xs">
              <Text size="sm">{t("dashboard.status.janus")}</Text>
              {status.janus.mode !== "unavailable" && (
                <Badge size="xs" color="gray" variant="outline">
                  {status.janus.mode !== "unavailable" &&
                    t(`dashboard.status.janus_${status.janus.mode}`)}
                </Badge>
              )}
            </Group>
            {badge(status.janus.connected)}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
