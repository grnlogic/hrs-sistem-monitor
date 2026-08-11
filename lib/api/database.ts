import { API_BASE_URL, getAuthToken } from "./core";

export interface RestorePreviewData {
  previewId: string;
  fileName: string;
  fileSizeFormatted: string;
  statementCount: number;
  previewLines: string[];
  warning: string;
}

export interface RestoreExecuteResult {
  message: string;
  details?: string;
}

export const databaseAPI = {
  /**
   * Trigger download file dump database .sql
   */
  exportDatabase: async (): Promise<void> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/database/export`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMessage =
        errData.error || errData.message || `Export database gagal (Status: ${res.status})`;
      throw new Error(errorMessage);
    }

    const disposition = res.headers.get("content-disposition");
    let filename = `hrd-backup-${new Date().toISOString().slice(0, 10)}.sql`;

    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Upload file .sql untuk pratinjau sebelum restore
   */
  previewRestore: async (file: File): Promise<RestorePreviewData> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("backupFile", file);

    const res = await fetch(`${API_BASE_URL}/database/restore/preview`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMessage =
        data.error || data.message || "Gagal memproses pratinjau file restore.";
      throw new Error(errorMessage);
    }

    return (data.data || data) as RestorePreviewData;
  },

  /**
   * Eksekusi restore database dari previewId yang sudah dikonfirmasi
   */
  executeRestore: async (previewId: string): Promise<RestoreExecuteResult> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/database/restore/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ previewId }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMessage =
        data.error || data.message || "Gagal mengeksekusi restore database.";
      throw new Error(errorMessage);
    }

    return (data.data || data) as RestoreExecuteResult;
  },
};
