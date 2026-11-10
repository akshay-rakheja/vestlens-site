import { describe, expect, it } from "vitest";

import { calculateRoom, excessTax, excessTaxForPeriod, LATEST_LIMIT_YEAR, parseAmount, TFSA_LIMITS } from "./rules.ts";

const base = { residentSince: null, nonResidentYears: [], totalContributed: 0, withdrawnBeforeThisYear: 0, withdrawnThisYear: 0 };

describe("TFSA dollar limits", () => {
  it("matches CRA's published table for every year", () => {
    const expected: Record<number, number> = {
      2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000, 2013: 5500, 2014: 5500, 2015: 10000, 2016: 5500, 2017: 5500,
      2018: 5500, 2019: 6000, 2020: 6000, 2021: 6000, 2022: 6000, 2023: 6500, 2024: 7000, 2025: 7000, 2026: 7000,
    };
    expect(TFSA_LIMITS).toEqual(expected);
    expect(LATEST_LIMIT_YEAR).toBe(2026);
  });
});

describe("calculateRoom", () => {
  it("gives $109,000 to someone eligible since 2009, as of 2026", () => {
    expect(calculateRoom({ ...base, birthYear: 1985, year: 2026 }).room).toBe(109000);
  });

  it("starts in 2009 for someone who turned 18 before the TFSA existed", () => {
    const r = calculateRoom({ ...base, birthYear: 1950, year: 2026 });
    expect(r.firstYear).toBe(2009);
    expect(r.room).toBe(109000);
  });

  it("CRA's Joe: turned 18 in 2024, put in $7,000 and $2,000, has $12,000 in 2026", () => {
    expect(calculateRoom({ ...base, birthYear: 2006, year: 2026, totalContributed: 9000 }).room).toBe(12000);
  });

  it("CRA's Brayden: counts the full limit for the year of turning 18, $14,000 in early 2025", () => {
    expect(calculateRoom({ ...base, birthYear: 2006, year: 2025 }).room).toBe(14000);
  });

  it("CRA's Alex: a 2025 withdrawal comes back on January 1, 2026, for $17,000", () => {
    // Alex had used all room up to the end of 2024: the limits from 2009 to 2024 add up to $95,000.
    const before = 95000;
    const in2025 = calculateRoom({ ...base, birthYear: 1985, year: 2025, totalContributed: before + 1000, withdrawnThisYear: 4000 });
    expect(in2025.room).toBe(6000);
    expect(in2025.addedBackNextYear).toBe(4000);
    const in2026 = calculateRoom({ ...base, birthYear: 1985, year: 2026, totalContributed: before + 1000, withdrawnBeforeThisYear: 4000 });
    expect(in2026.room).toBe(17000);
  });

  it("does not add this year's withdrawal back until next year (CRA's Twyla)", () => {
    const r = calculateRoom({ ...base, birthYear: 1985, year: 2026, totalContributed: 109000, withdrawnThisYear: 3000 });
    expect(r.room).toBe(0);
    expect(r.addedBackNextYear).toBe(3000);
  });

  it("CRA's David: a resident from 2024 who put in $95,000 is $88,000 over that year", () => {
    const r = calculateRoom({ ...base, birthYear: 1980, residentSince: 2024, year: 2024, totalContributed: 95000 });
    expect(r.firstYear).toBe(2024);
    expect(r.room).toBe(0);
    expect(r.excess).toBe(88000);
  });

  it("counts a new resident's room from the year they arrived, not the year they turned 18", () => {
    expect(calculateRoom({ ...base, birthYear: 1990, residentSince: 2023, year: 2026 }).room).toBe(27500);
  });

  it("uses the year of turning 18 when residency came earlier", () => {
    expect(calculateRoom({ ...base, birthYear: 2006, residentSince: 2015, year: 2026 }).firstYear).toBe(2024);
  });

  it("gives no new room for a year spent fully as a non-resident", () => {
    expect(calculateRoom({ ...base, birthYear: 1985, year: 2026, nonResidentYears: [2015, 2016] }).room).toBe(109000 - 15500);
  });

  it("ignores non-resident years before room started", () => {
    expect(calculateRoom({ ...base, birthYear: 2006, year: 2026, nonResidentYears: [2015] }).room).toBe(21000);
  });

  it("lists the limit for each counted year", () => {
    expect(calculateRoom({ ...base, birthYear: 2006, year: 2026, nonResidentYears: [2025] }).years).toEqual([
      { year: 2024, limit: 7000 },
      { year: 2026, limit: 7000 },
    ]);
  });

  it("gives no room to someone who hasn't turned 18 this year", () => {
    const r = calculateRoom({ ...base, birthYear: 2009, year: 2026 });
    expect(r.eligible).toBe(false);
    expect(r.room).toBe(0);
    expect(r.excess).toBe(0);
  });

  it("counts someone turning 18 this year", () => {
    expect(calculateRoom({ ...base, birthYear: 2008, year: 2026 }).room).toBe(7000);
  });

  it("gives no room to someone not yet resident in the chosen year", () => {
    expect(calculateRoom({ ...base, birthYear: 1990, residentSince: 2030, year: 2026 }).eligible).toBe(false);
  });

  it("flags a year past the last published limit instead of inventing one", () => {
    const r = calculateRoom({ ...base, birthYear: 1985, year: 2027 });
    expect(r.limitsThrough).toBe(2026);
    expect(r.limitMissing).toBe(true);
    expect(r.room).toBe(109000);
  });

  it("does not flag the latest published year", () => {
    expect(calculateRoom({ ...base, birthYear: 1985, year: 2026 }).limitMissing).toBe(false);
  });

  it("lets withdrawals of growth lift room above the sum of limits", () => {
    expect(calculateRoom({ ...base, birthYear: 2006, year: 2026, totalContributed: 21000, withdrawnBeforeThisYear: 30000 }).room).toBe(30000);
  });
});

describe("excess tax", () => {
  it("CRA's example: $2,000 over from June, removed in September, is $80", () => {
    expect(excessTaxForPeriod({ amount: 2000, startMonth: 6, removedMonth: 9 })).toEqual({ months: 4, perMonth: 20, total: 80 });
  });

  it("CRA's example: charges 1% of each month's highest excess", () => {
    expect(excessTax([6000, 6000, 2000])).toBe(140);
  });

  it("charges the removal month in full when it's the same month", () => {
    expect(excessTaxForPeriod({ amount: 1000, startMonth: 3, removedMonth: 3 })).toEqual({ months: 1, perMonth: 10, total: 10 });
  });

  it("keeps cents", () => {
    expect(excessTaxForPeriod({ amount: 1234.5, startMonth: 1, removedMonth: 2 }).total).toBe(24.69);
  });

  it("returns no charge if removal comes before the start", () => {
    expect(excessTaxForPeriod({ amount: 1000, startMonth: 6, removedMonth: 5 })).toEqual({ months: 0, perMonth: 10, total: 0 });
  });
});

describe("parseAmount", () => {
  it("reads blanks as zero", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("   ")).toBe(0);
  });

  it("accepts dollar signs, commas and cents", () => {
    expect(parseAmount("$12,500.50")).toBe(12500.5);
  });

  it("rejects negatives and text", () => {
    expect(parseAmount("-5")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount("1e5")).toBeNaN();
  });
});

// CRA counts a withdrawal made while over against the excess straight away, and only the rest comes back on January 1.
// The calculator isn't told the order, so it reports both ends.
describe("withdrawals this year when over", () => {
  const over = { birthYear: 1990, residentSince: null, nonResidentYears: [], totalContributed: 120_000, withdrawnBeforeThisYear: 3_000, year: 2026 };

  it("can lower the excess by up to the amount withdrawn", () => {
    const r = calculateRoom({ ...over, withdrawnThisYear: 2_000 });
    expect(r.excess).toBe(8_000);
    expect(r.lowestExcess).toBe(6_000);
  });

  it("can clear the excess, but not below zero", () => {
    const r = calculateRoom({ ...over, withdrawnThisYear: 20_000 });
    expect(r.lowestExcess).toBe(0);
  });

  it("leaves the excess alone with no withdrawal this year", () => {
    const r = calculateRoom({ ...over, withdrawnThisYear: 0 });
    expect(r.lowestExcess).toBe(8_000);
  });

  it("has nothing to lower when not over, so the whole withdrawal comes back", () => {
    const r = calculateRoom({ ...over, totalContributed: 50_000, withdrawnThisYear: 2_000 });
    expect(r.lowestExcess).toBe(0);
    expect(r.addedBackNextYear).toBe(2_000);
  });
});
