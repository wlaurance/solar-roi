/** Guest-selected bill kept locally until account creation. */

export const PENDING_BILL_KEY = "solarflow_pending_bill_meta";
export const PENDING_BILL_DB = "solarflow_pending_bill";
export const PENDING_BILL_STORE = "files";

export type PendingBillMeta = {
  utilitySlug: string;
  utilityName: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  projectId?: string | null;
  savedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PENDING_BILL_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING_BILL_STORE)) {
        db.createObjectStore(PENDING_BILL_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export function savePendingBillMeta(meta: PendingBillMeta): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_BILL_KEY, JSON.stringify(meta));
}

export function readPendingBillMeta(): PendingBillMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_BILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBillMeta;
    if (!parsed.utilitySlug || !parsed.fileName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingBillMeta(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_BILL_KEY);
}

export async function savePendingBillFile(file: File): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_BILL_STORE, "readwrite");
    tx.objectStore(PENDING_BILL_STORE).put(file, "pending");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to stash bill file"));
  });
  db.close();
}

export async function readPendingBillFile(): Promise<File | null> {
  const db = await openDb();
  const file = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(PENDING_BILL_STORE, "readonly");
    const req = tx.objectStore(PENDING_BILL_STORE).get("pending");
    req.onsuccess = () => resolve((req.result as File | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("Failed to read bill file"));
  });
  db.close();
  return file;
}

export async function clearPendingBillFile(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_BILL_STORE, "readwrite");
    tx.objectStore(PENDING_BILL_STORE).delete("pending");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to clear bill file"));
  });
  db.close();
}

export async function clearPendingBill(): Promise<void> {
  clearPendingBillMeta();
  try {
    await clearPendingBillFile();
  } catch {
    // ignore
  }
}

export async function stashPendingBill(input: {
  file: File;
  utilitySlug: string;
  utilityName: string;
  projectId?: string | null;
}): Promise<void> {
  await savePendingBillFile(input.file);
  savePendingBillMeta({
    utilitySlug: input.utilitySlug,
    utilityName: input.utilityName,
    fileName: input.file.name,
    mimeType: input.file.type || "application/pdf",
    byteSize: input.file.size,
    projectId: input.projectId ?? null,
    savedAt: new Date().toISOString(),
  });
}
