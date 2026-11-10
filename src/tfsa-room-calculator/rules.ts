/**
 * CRA's TFSA contribution room rules, for the public calculator. Limits: "TFSA dollar limits" table; room formula and
 * add-backs: "Calculate your TFSA contribution room"; excess: "Tax payable on excess TFSA amounts" (all canada.ca, read
 * 2026-11-02). The limit is set each January: a year not in the table is reported as missing, never assumed.
 */
export const TFSA_LIMITS: Readonly<Record<number, number>> = {
  2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000, 2013: 5500, 2014: 5500, 2015: 10000, 2016: 5500, 2017: 5500,
  2018: 5500, 2019: 6000, 2020: 6000, 2021: 6000, 2022: 6000, 2023: 6500, 2024: 7000, 2025: 7000, 2026: 7000,
};
export const FIRST_LIMIT_YEAR = 2009;
export const LATEST_LIMIT_YEAR = 2026;
export const TFSA_AGE = 18;

export interface RoomInput {
  birthYear: number;
  /** The year they became a Canadian resident, if that came after turning 18. */
  residentSince: number | null;
  /** Calendar years spent fully as a non-resident; a part-year resident still gets the full limit. */
  nonResidentYears: readonly number[];
  /** All contributions ever, this year's included; qualifying transfers between TFSAs don't count. */
  totalContributed: number;
  withdrawnBeforeThisYear: number;
  withdrawnThisYear: number;
  year: number;
}

export interface RoomResult {
  eligible: boolean;
  firstYear: number;
  years: Array<{ year: number; limit: number }>;
  limitsTotal: number;
  room: number;
  excess: number;
  /** The excess if everything withdrawn this year came out while over; the order of moves isn't an input. */
  lowestExcess: number;
  /** This year's withdrawals, which come back on January 1 of next year, less any part that lowered an excess. */
  addedBackNextYear: number;
  limitsThrough: number;
  limitMissing: boolean;
}

export function calculateRoom(input: RoomInput): RoomResult {
  const firstYear = Math.max(FIRST_LIMIT_YEAR, input.birthYear + TFSA_AGE, input.residentSince ?? FIRST_LIMIT_YEAR);
  const lastYear = Math.min(input.year, LATEST_LIMIT_YEAR);
  const away = new Set(input.nonResidentYears);
  const eligible = firstYear <= input.year;
  const years: RoomResult["years"] = [];
  for (let year = firstYear; eligible && year <= lastYear; year++) {
    if (!away.has(year)) years.push({ year, limit: TFSA_LIMITS[year]! });
  }
  const limitsTotal = years.reduce((sum, y) => sum + y.limit, 0);
  const balance = eligible ? limitsTotal + input.withdrawnBeforeThisYear - input.totalContributed : 0;
  return {
    eligible,
    firstYear,
    years,
    limitsTotal,
    room: Math.max(0, balance),
    excess: Math.max(0, -balance),
    lowestExcess: Math.max(0, -balance - input.withdrawnThisYear),
    addedBackNextYear: input.withdrawnThisYear,
    limitsThrough: lastYear,
    limitMissing: input.year > LATEST_LIMIT_YEAR,
  };
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** 1% of the highest excess in each month it remains. */
export function excessTax(highestExcessByMonth: readonly number[]): number {
  return cents(highestExcessByMonth.reduce((sum, excess) => sum + excess, 0) / 100);
}

/** One amount over from a start month through the month it's removed, both charged in full. Months are 1 to 12. */
export function excessTaxForPeriod(input: { amount: number; startMonth: number; removedMonth: number }) {
  const months = Math.max(0, input.removedMonth - input.startMonth + 1);
  return { months, perMonth: cents(input.amount / 100), total: excessTax(Array.from({ length: months }, () => input.amount)) };
}

/** A typed dollar amount: blank is zero; anything else that isn't a plain positive amount is NaN. */
export function parseAmount(text: string): number {
  const cleaned = text.replace(/[\s$,]/g, "");
  if (cleaned === "") return 0;
  return /^\d+(\.\d{0,2})?$/.test(cleaned) ? Number(cleaned) : NaN;
}

export const dollars = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
