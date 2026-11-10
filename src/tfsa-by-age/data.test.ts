import { describe, expect, it } from "vitest";

import { AGES, ageLabel, flowSentence, lensRadii, LENS_SCALE, money, who } from "./data.ts";

describe("TFSA by age page", () => {
  it("carries all 14 CRA age groups in order", () => {
    expect(AGES.map((r) => r.label)).toEqual(["18–19", "20–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–54", "55–59", "60–64", "65–69", "70–74", "75–79", "80+"]);
    expect(AGES[3]).toMatchObject({ fmv: 18475, unusedRoom: 63600, contributions: 8938, withdrawalCount: 7.6 });
  });

  it("names the age groups in words", () => {
    expect(ageLabel(0)).toBe("Ages 18 and 19");
    expect(ageLabel(3)).toBe("Ages 30 to 34");
    expect(ageLabel(13)).toBe("Ages 80 and over");
    expect(who(13)).toBe("People 80 and over");
    expect(money(18475)).toBe("$18,475");
  });

  it("draws every lens by area on one scale", () => {
    expect(LENS_SCALE).toBe(76305 + 36526);
    const oldest = lensRadii(AGES[13]!, 100);
    expect(oldest.outer).toBeCloseTo(100, 6);
    const thirties = lensRadii(AGES[3]!, 100);
    // Area, not radius, carries the amount: (inner/outer)^2 is the held share of held + room.
    expect((thirties.inner / thirties.outer) ** 2).toBeCloseTo(18475 / (18475 + 63600), 6);
    for (const r of AGES) {
      const { outer, inner } = lensRadii(r, 100);
      expect(inner).toBeLessThan(outer);
      expect(outer).toBeLessThanOrEqual(100 + 1e-9);
    }
  });

  it("writes the year's deposits and withdrawals as one sentence", () => {
    expect(flowSentence(AGES[3]!)).toBe("During 2024 they put in $8,938 over 23.8 deposits and took out $9,548 over 7.6 withdrawals.");
  });
});
