import {
  ActionIcon,
  Group,
  Select,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun, IconDeviceDesktop } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function AppHeader() {
  const { t, i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const themeIcons = {
    light: <IconSun size={16} />,
    dark: <IconMoon size={16} />,
    auto: <IconDeviceDesktop size={16} />,
  };

  function cycleTheme() {
    const next =
      colorScheme === "light"
        ? "dark"
        : colorScheme === "dark"
          ? "auto"
          : "light";
    setColorScheme(next);
  }

  return (
    <Group
      justify="space-between"
      px="md"
      py="sm"
      style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
    >
      <Text fw={600} size="sm">
        Obico PrusaLink Bridge
      </Text>
      <Group gap="xs">
        <Select
          size="xs"
          w={80}
          value={i18n.resolvedLanguage ?? "en"}
          onChange={(val) => val && i18n.changeLanguage(val)}
          data={[
            { value: "en", label: "EN" },
            { value: "de", label: "DE" },
          ]}
          aria-label={t("common.language")}
        />
        <ActionIcon
          variant="default"
          size="md"
          onClick={cycleTheme}
          aria-label={t("common.theme")}
        >
          {themeIcons[colorScheme]}
        </ActionIcon>
      </Group>
    </Group>
  );
}
