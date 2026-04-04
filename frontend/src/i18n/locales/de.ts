export default {
  wizard: {
    title: "Einrichtungsassistent",
    steps: {
      prusalink: "PrusaLink",
      camera: "Kamera",
      obico: "Obico",
      done: "Fertig",
    },
    prusalink: {
      heading: "PrusaLink verbinden",
      description:
        "Gib die URL und Zugangsdaten deines PrusaLink-Druckers ein.",
      ip: "Drucker-IP-Adresse",
      ip_placeholder: "192.168.1.x",
      username: "Benutzername",
      username_placeholder: "maker",
      password: "Passwort",
      test: "Verbindung testen",
      testing: "Teste…",
      success: "Verbindung erfolgreich",
      error: "Verbindung fehlgeschlagen",
      next: "Weiter",
    },
    camera: {
      heading: "Kamera",
      description:
        "Der RTSP-Stream deines Druckers wird für die Live-Überwachung verwendet.",
      rtsp_url: "RTSP URL",
      rtsp_placeholder: "rtsp://192.168.1.x/live",
      test: "Stream testen",
      testing: "Teste…",
      success: "Stream erreichbar",
      error: "Stream nicht erreichbar",
      preview: "Vorschau",
      next: "Weiter",
      back: "Zurück",
    },
    obico: {
      heading: "Obico verbinden",
      description:
        "Gib die URL deines Obico-Servers ein und den Verifikationscode aus dem Obico-Einrichtungsassistenten.",
      server_url: "Obico Server URL",
      server_placeholder: "http://192.168.1.x:3334",
      pairing_code: "Verifikationscode",
      code_hint:
        "Öffne den Obico-Einrichtungsassistenten — er zeigt dir einen 6-stelligen Code. Gib ihn hier ein.",
      verify: "Verifizieren",
      success: "Erfolgreich gekoppelt",
      error: "Kopplung fehlgeschlagen",
      back: "Zurück",
    },
    done: {
      heading: "Einrichtung abgeschlossen",
      description:
        "Dein Drucker ist mit Obico verbunden. Du kannst ihn jetzt über das Dashboard überwachen und steuern.",
      go_dashboard: "Zum Dashboard",
    },
  },
  common: {
    language: "Sprache",
    theme: "Design",
    light: "Hell",
    dark: "Dunkel",
    system: "System",
  },
};
