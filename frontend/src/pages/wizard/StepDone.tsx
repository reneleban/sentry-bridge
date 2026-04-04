import { Button, Center, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCircleCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function StepDone() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Center>
      <Stack align="center" gap="md">
        <ThemeIcon size={64} radius="xl" color="green">
          <IconCircleCheck size={40} />
        </ThemeIcon>
        <Title order={3}>{t("wizard.done.heading")}</Title>
        <Text c="dimmed" ta="center" maw={360}>
          {t("wizard.done.description")}
        </Text>
        <Button size="md" onClick={() => navigate("/")}>
          {t("wizard.done.go_dashboard")}
        </Button>
      </Stack>
    </Center>
  );
}
