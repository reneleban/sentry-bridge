import { Container, SimpleGrid, Stack, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { usePrinterStatus } from "./usePrinterStatus";
import { StatusCard } from "./StatusCard";
import { PrinterCard } from "./PrinterCard";
import { CameraCard } from "./CameraCard";
import { ConfigCard } from "./ConfigCard";
import { ResilienceCard } from "./ResilienceCard";

export function DashboardPage() {
  const { t } = useTranslation();
  const { status } = usePrinterStatus();

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl" ta="center">
        {t("dashboard.title")}
      </Title>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <StatusCard status={status} />
          <PrinterCard status={status} />
        </SimpleGrid>
        <CameraCard />
        <ResilienceCard />
        <ConfigCard />
      </Stack>
    </Container>
  );
}
