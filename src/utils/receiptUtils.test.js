import { describe, expect, it } from "vitest";
import {
  buildReceiptPayload,
  generateReceiptNumber,
  isValidIndianMobile,
  normalizeIndianMobile,
  toWords,
} from "./receiptUtils";

describe("receipt utilities", () => {
  it("generates a numbered receipt using the configured prefix", () => {
    expect(generateReceiptNumber("OMTM", 1, 1)).toBe("OMTM-001");
    expect(generateReceiptNumber("TRIAL", 2, 2)).toBe("TRIAL-002");
  });

  it("accepts a valid Indian mobile number", () => {
    expect(isValidIndianMobile("9999999999")).toBe(true);
    expect(isValidIndianMobile("1234567890")).toBe(false);
    expect(isValidIndianMobile("99999")).toBe(false);
  });

  it("normalizes a formatted Indian mobile number and stores it as text", () => {
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("9876543210");
    expect(normalizeIndianMobile("9876543210")).toBe("9876543210");
    expect(isValidIndianMobile(normalizeIndianMobile("+91 98765 43210"))).toBe(
      true,
    );
  });

  it("builds a receipt payload using the database field names", () => {
    expect(
      buildReceiptPayload({
        receipt_number: "TRIAL-003",
        donor_name: "Atharv",
        whatsapp_number: "9876543210",
        donation_amount: 101,
        payment_status: "Received",
        payment_method: "CASH",
        donation_date: "2026-10-03",
        festival_name: "Ganesh Festival",
        created_by_name: "Admin User",
        created_by_email: "admin@example.com",
      }),
    ).toMatchObject({
      receipt_number: "TRIAL-003",
      donor_name: "Atharv",
      whatsapp_number: "9876543210",
      donation_amount: 101,
      payment_status: "Received",
      payment_method: "CASH",
      festival_name: "Ganesh Festival",
      created_by_name: "Admin User",
      created_by_email: "admin@example.com",
    });
  });

  it("converts numbers into a readable number string", () => {
    expect(toWords(1001)).toContain("one thousand one");
  });
});
