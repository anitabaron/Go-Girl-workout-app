import { describe, expect, it } from "vitest";
import {
  formatCompactSeconds,
  formatDuration,
  formatTotalDuration,
} from "@/lib/utils/time-format";

describe("formatCompactSeconds", () => {
  it("formats seconds up to 60 as '<N> s'", () => {
    expect(formatCompactSeconds(10)).toBe("10 s");
    expect(formatCompactSeconds(60)).toBe("60 s");
  });

  it("formats values above 60 as 'M:SS min'", () => {
    expect(formatCompactSeconds(61)).toBe("1:01 min");
    expect(formatCompactSeconds(327)).toBe("5:27 min");
  });
});

describe("formatDuration", () => {
  it("returns '-' for nullish and zero values", () => {
    expect(formatDuration(null)).toBe("-");
    expect(formatDuration(undefined)).toBe("-");
    expect(formatDuration(0)).toBe("-");
  });

  it("uses compact format for positive values", () => {
    expect(formatDuration(61)).toBe("1:01 min");
  });
});

describe("formatTotalDuration", () => {
  it("uses compact format with units", () => {
    expect(formatTotalDuration(60)).toBe("60 s");
    expect(formatTotalDuration(301)).toBe("5:01 min");
  });
});
