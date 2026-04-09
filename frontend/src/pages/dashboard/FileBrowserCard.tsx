import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { StatusEvent } from "./usePrinterStatus";

interface GcodeFile {
  name: string;
  display: string;
  path: string;
  date: number;
}

interface Props {
  status: StatusEvent | null;
}

function makeSuggestedName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return `${filename}_1`;
  return `${filename.slice(0, dot)}_1${filename.slice(dot)}`;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString();
}

export function FileBrowserCard({ status }: Props) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<GcodeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [printingFile, setPrintingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<"display" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [overwritePending, setOverwritePending] = useState<{
    file: File;
    name: string;
    suggestedName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleFiles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? files.filter((f) => f.display.toLowerCase().includes(term))
      : files;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "display") cmp = a.display.localeCompare(b.display);
      else cmp = a.date - b.date;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [files, searchTerm, sortKey, sortDir]);

  function toggleSort(key: "display" | "date") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function indicator(key: string) {
    if (sortKey !== key) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const isPrinting =
    status?.printer?.state === "PRINTING" ||
    status?.printer?.state === "PAUSED";

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      setError(t("dashboard.fileBrowser.error_load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 409) {
          setOverwritePending({
            file,
            name: file.name,
            suggestedName: makeSuggestedName(file.name),
          });
          return;
        }
        throw new Error(
          body?.message ?? t("dashboard.fileBrowser.error_upload")
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("dashboard.fileBrowser.error_upload")
      );
    } finally {
      setUploading(false);
      loadFiles();
    }
  }

  async function handleOverwrite() {
    if (!overwritePending) return;
    const { file, suggestedName } = overwritePending;
    setOverwritePending(null);
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file, suggestedName);
    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ?? t("dashboard.fileBrowser.error_upload")
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("dashboard.fileBrowser.error_upload")
      );
    } finally {
      setUploading(false);
      loadFiles();
    }
  }

  async function handlePrint(name: string) {
    setPrintingFile(name);
    setError(null);
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(name)}/print`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setError(t("dashboard.fileBrowser.error_print"));
    } finally {
      setPrintingFile(null);
    }
  }

  async function handleDelete(name: string) {
    setDeletingFile(name);
    setError(null);
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFiles((prev) => prev.filter((f) => f.name !== name));
    } catch {
      setError(t("dashboard.fileBrowser.error_delete"));
    } finally {
      setDeletingFile(null);
      setConfirmDelete(null);
    }
  }

  return (
    <>
      <Modal
        opened={overwritePending !== null}
        onClose={() => setOverwritePending(null)}
        title={t("dashboard.fileBrowser.overwrite_title")}
        centered
        size="sm"
      >
        <Text mb="md">
          {t("dashboard.fileBrowser.overwrite_confirm", {
            suggestedName: overwritePending?.suggestedName ?? "",
          })}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setOverwritePending(null)}>
            {t("wizard.camera.back")}
          </Button>
          <Button color="orange" onClick={handleOverwrite}>
            {t("dashboard.fileBrowser.overwrite_yes")}
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t("dashboard.fileBrowser.delete")}
        centered
        size="sm"
      >
        <Text mb="md">
          {t("dashboard.fileBrowser.confirm_delete", {
            name: confirmDelete ?? "",
          })}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmDelete(null)}>
            {t("wizard.camera.back")}
          </Button>
          <Button
            color="red"
            loading={deletingFile !== null}
            onClick={() => confirmDelete && handleDelete(confirmDelete)}
          >
            {t("dashboard.fileBrowser.delete")}
          </Button>
        </Group>
      </Modal>

      <Card withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <Title order={5}>{t("dashboard.fileBrowser.title")}</Title>
          <Group gap="xs">
            <input
              ref={fileInputRef}
              type="file"
              accept=".gcode,.bgcode"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              size="xs"
              variant="light"
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {t("dashboard.fileBrowser.upload")}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={loadFiles}
              loading={loading}
            >
              ↻
            </Button>
          </Group>
        </Group>

        {error && (
          <Text size="xs" c="red" mb="sm">
            {error}
          </Text>
        )}

        {files.length > 0 && (
          <TextInput
            size="xs"
            placeholder={t("dashboard.fileBrowser.search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            mb="sm"
          />
        )}

        {loading && !files.length ? (
          <Text size="sm" c="dimmed">
            {t("dashboard.fileBrowser.loading")}
          </Text>
        ) : files.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("dashboard.fileBrowser.no_files")}
          </Text>
        ) : files.length > 0 && visibleFiles.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("dashboard.fileBrowser.no_search_results")}
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleSort("display")}
                >
                  {t("dashboard.fileBrowser.col_name")}
                  {indicator("display")}
                </Table.Th>
                <Table.Th
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleSort("date")}
                >
                  {t("dashboard.fileBrowser.col_date")}
                  {indicator("date")}
                </Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleFiles.map((file) => (
                <Table.Tr key={file.name}>
                  <Table.Td>
                    <Text size="sm" style={{ wordBreak: "break-all" }}>
                      {file.display}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatDate(file.date)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        size="xs"
                        variant="light"
                        color="blue"
                        disabled={isPrinting}
                        loading={printingFile === file.name}
                        onClick={() => handlePrint(file.name)}
                      >
                        {t("dashboard.fileBrowser.print")}
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        loading={deletingFile === file.name}
                        onClick={() => setConfirmDelete(file.name)}
                      >
                        {t("dashboard.fileBrowser.delete")}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Stack gap={0} mt="xs">
          <Text size="xs" c="dimmed">
            {t("dashboard.fileBrowser.file_count", { count: files.length })}
          </Text>
        </Stack>
      </Card>
    </>
  );
}
