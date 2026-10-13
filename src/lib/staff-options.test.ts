import { describe, expect, it } from "vitest";
import { isPlausiblePhone, isValidEmail } from "./staff-options";

describe("contact validation", () => {
  it("accepts international phone numbers with country codes", () => {
    expect(isPlausiblePhone("+61 412 345 678")).toBe(true);
    expect(isPlausiblePhone("+254 (0) 712-345-678")).toBe(true);
  });
  it("rejects implausible phone numbers", () => {
    expect(isPlausiblePhone("12345")).toBe(false);
    expect(isPlausiblePhone("call me")).toBe(false);
  });
  it("validates email format", () => {
    expect(isValidEmail("jane@windsongtravel.com.au")).toBe(true);
    expect(isValidEmail("jane@nowhere")).toBe(false);
  });
});
