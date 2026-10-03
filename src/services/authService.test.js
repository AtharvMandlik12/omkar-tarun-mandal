import { describe, expect, it } from "vitest";
import { buildAdminProfilePayload } from "./authService.js";

describe("buildAdminProfilePayload", () => {
  it("uses the authenticated user metadata and email to build an admin profile", () => {
    const payload = buildAdminProfilePayload({
      email: "admin@mandal.com",
      user_metadata: { full_name: "Mandal Admin" },
    });

    expect(payload).toMatchObject({
      name: "Mandal Admin",
      email: "admin@mandal.com",
      role: "Admin",
      mobile_number: "",
    });
  });

  it("falls back to the email prefix when no display name exists", () => {
    const payload = buildAdminProfilePayload({ email: "treasurer@mandal.com" });

    expect(payload).toMatchObject({
      name: "Treasurer",
      email: "treasurer@mandal.com",
      role: "Admin",
      mobile_number: "",
    });
  });
});
