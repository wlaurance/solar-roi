import { describe, expect, it } from "vitest";

// Lightweight unit coverage for HTML escaping / heading heuristics via public API
// would need a real PDF. Here we smoke-test module exports resolve.
import { pdfBytesToHtml } from "@/lib/power-bills/pdf-to-html";

describe("pdfBytesToHtml", () => {
  it("rejects empty / invalid PDFs with a thrown error", async () => {
    await expect(pdfBytesToHtml(new Uint8Array([1, 2, 3, 4]))).rejects.toBeTruthy();
  });
});
