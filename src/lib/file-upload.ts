/** Helpers de upload usados pelo dossiê documental (painel e gaveta do chat). */

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Abre o arquivo original numa nova aba (PDF/imagem) ou baixa (demais tipos). */
export function openBase64File(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  downloadBytes(bytes, filename, mime);
}

/** Baixa bytes como arquivo (blob). Usado para DOCX e demais exportações. */
export function downloadBytes(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: mime || "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const viewable = mime === "application/pdf" || mime.startsWith("image/");
  if (viewable) {
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Baixa bytes em base64 (DOCX vindo do servidor). */
export function downloadBase64File(base64: string, filename: string, mime: string) {
  downloadBytes(
    Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
    filename,
    mime,
  );
}
