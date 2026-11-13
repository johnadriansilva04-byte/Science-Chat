import { afterEach, describe, expect, it } from "vitest";
import {
  deleteDocumentBytes,
  documentKey,
  putDocumentBytes,
  readDocumentBytes,
} from "@/lib/cf/storage.server";

function setEnv(env: Record<string, unknown> | undefined) {
  (globalThis as { __env__?: Record<string, unknown> | undefined }).__env__ = env;
}

/** Bucket R2 falso, em memória, suficiente para exercitar a camada de storage. */
function fakeBucket() {
  const store = new Map<string, Uint8Array>();
  return {
    store,
    put: async (key: string, value: ArrayBuffer) => {
      store.set(key, new Uint8Array(value));
      return { key };
    },
    get: async (key: string) => {
      const bytes = store.get(key);
      if (!bytes) return null;
      return { arrayBuffer: async () => bytes.buffer };
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ objects: [] }),
  };
}

afterEach(() => setEnv(undefined));

describe("storage do dossiê", () => {
  it("grava e lê os bytes pelo R2 quando o binding FILES existe", async () => {
    const bucket = fakeBucket();
    setEnv({ FILES: bucket });
    const key = documentKey("a1", "d1");
    expect(key).toBe("articles/a1/documents/d1");

    const bytes = new TextEncoder().encode("prova do resultado");
    const stored = await putDocumentBytes(key, bytes, "text/plain");
    expect(stored).toBe(key);
    expect(bucket.store.has(key)).toBe(true);

    const read = await readDocumentBytes(key, null);
    expect(read).not.toBeNull();
    expect(new TextDecoder().decode(read!)).toBe("prova do resultado");
  });

  it("sem R2 devolve null no put e lê do base64 legado do D1", async () => {
    setEnv({});
    const bytes = new TextEncoder().encode("dados antigos");
    const put = await putDocumentBytes("k", bytes, "text/plain");
    expect(put).toBeNull();

    const base64 = Buffer.from("dados antigos").toString("base64");
    const read = await readDocumentBytes(null, base64);
    expect(new TextDecoder().decode(read!)).toBe("dados antigos");
  });

  it("prefere o R2 e ignora o base64 quando há storage_key", async () => {
    const bucket = fakeBucket();
    setEnv({ FILES: bucket });
    await putDocumentBytes("k", new TextEncoder().encode("do R2"), "text/plain");
    const base64 = Buffer.from("do D1").toString("base64");
    const read = await readDocumentBytes("k", base64);
    expect(new TextDecoder().decode(read!)).toBe("do R2");
  });

  it("apaga do R2 e não quebra quando não há binding", async () => {
    const bucket = fakeBucket();
    setEnv({ FILES: bucket });
    await putDocumentBytes("k", new TextEncoder().encode("x"), "text/plain");
    await deleteDocumentBytes("k");
    expect(bucket.store.has("k")).toBe(false);

    setEnv({});
    await expect(deleteDocumentBytes("k")).resolves.toBeUndefined();
    await expect(deleteDocumentBytes(null)).resolves.toBeUndefined();
  });
});
