import { describe, expect, it } from "vitest";
import {
  verifyDocumentSchema,
  createDocumentSchema,
} from "../../../src/modules/hr/documents/documents.validator.js";
import {
  initiatePayrollRunSchema,
} from "../../../src/modules/hr/payroll/payroll.validator.js";
import {
  performanceCycleReviewsParamSchema,
} from "../../../src/modules/hr/performance/performance.validator.js";
import { VALID_UUID } from "../../helpers/env.js";

describe("HR document validators", () => {
  it("accepts valid verify payload", () => {
    const result = verifyDocumentSchema.safeParse({ notes: "Looks good" });
    expect(result.success).toBe(true);
  });

  it("rejects notes over 1000 characters", () => {
    const result = verifyDocumentSchema.safeParse({ notes: "x".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("requires valid userId on create document", () => {
    const bad = createDocumentSchema.safeParse({
      userId: "not-a-uuid",
      documentType: "aadhaar",
      documentName: "Aadhaar",
      fileName: "aadhaar.pdf",
      fileUrl: "https://example.com/a.pdf",
    });
    expect(bad.success).toBe(false);
  });
});

describe("Payroll validators", () => {
  it("requires YYYY-MM month format", () => {
    const bad = initiatePayrollRunSchema.safeParse({ month: "2025/10" });
    expect(bad.success).toBe(false);

    const ok = initiatePayrollRunSchema.safeParse({ month: "2025-10" });
    expect(ok.success).toBe(true);
  });
});

describe("Performance validators", () => {
  it("rejects non-uuid cycle id in reviews route", () => {
    const bad = performanceCycleReviewsParamSchema.safeParse({
      cycleId: "not-a-uuid",
    });
    expect(bad.success).toBe(false);

    const ok = performanceCycleReviewsParamSchema.safeParse({
      cycleId: VALID_UUID,
    });
    expect(ok.success).toBe(true);
  });
});
