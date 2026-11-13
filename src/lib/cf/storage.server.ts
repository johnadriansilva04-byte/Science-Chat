/**
 * Armazenamento dos arquivos do dossiê. Usa o R2 (binding `FILES`) quando ele
 * está disponível na conta; caso contrário, devolve `null` e quem chama guarda
 * os bytes em base64 no D1 (fallback usado enquanto o R2 não está habilitado).
 */
import { getEnv, type R2Bucket } from "@/lib/cf/bindings.server";
import { bytesToBase64, base64ToBytes } from "@/lib/base64";

function files(): R2Bucket | undefined {
  return getEnv().FILES;
}

export function storageAvailable(): boolean {
  return Boolean(files());
}

export function documentKey(articleId: string, documentId: string): string {
  return `articles/${articleId}/documents/${documentId}`;
}

/** Grava os bytes no R2. Retorna a chave gravada, ou null se o R2 não existe. */
export async function putDocumentBytes(
  key: string,
  bytes: Uint8Array,
  mime: string,
): Promise<string | null> {
  const bucket = files();
  if (!bucket) return null;
  await bucket.put(key, bytes as unknown as ArrayBuffer, {
    httpMetadata: { contentType: mime || "application/octet-stream" },
  });
  return key;
}

/**
 * Lê os bytes de um documento. Prefere o R2 (quando há `storageKey`); se não
 * houver, decodifica o base64 legado guardado no D1.
 */
export async function readDocumentBytes(
  storageKey: string | null,
  base64Content: string | null,
): Promise<Uint8Array | null> {
  if (storageKey) {
    const bucket = files();
    if (bucket) {
      const obj = (await bucket.get(storageKey)) as { arrayBuffer(): Promise<ArrayBuffer> } | null;
      if (obj) return new Uint8Array(await obj.arrayBuffer());
    }
  }
  if (base64Content) return base64ToBytes(base64Content);
  return null;
}

export async function deleteDocumentBytes(storageKey: string | null): Promise<void> {
  if (!storageKey) return;
  const bucket = files();
  if (!bucket) return;
  await bucket.delete(storageKey);
}

/** Converte bytes para base64 (usado quando o destino é o D1). */
export function toBase64(bytes: Uint8Array): string {
  return bytesToBase64(bytes);
}
