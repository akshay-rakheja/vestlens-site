/** CRA TFSA statistics, 2024 contribution year, Table 3A (females and males), per age group. CRA's "under 20" group is
 * shown as 18–19: a TFSA can only be opened at 18. */
export interface AgeRow {
  label: string;
  words: string;
  /** Average fair market value at year end. */
  fmv: number;
  unusedRoom: number;
  contributions: number;
  contributionCount: number;
  withdrawals: number;
  withdrawalCount: number;
}

const row = (label: string, words: string, fmv: number, unusedRoom: number, contributions: number, contributionCount: number, withdrawals: number, withdrawalCount: number): AgeRow =>
  ({ label, words, fmv, unusedRoom, contributions, contributionCount, withdrawals, withdrawalCount });

export const AGES: readonly AgeRow[] = [
  row("18–19", "18 and 19", 4179, 6915, 4706, 8.0, 2035, 5.3),
  row("20–24", "20 to 24", 8652, 22983, 6063, 15.0, 4351, 6.4),
  row("25–29", "25 to 29", 13967, 44346, 7644, 20.9, 7470, 7.3),
  row("30–34", "30 to 34", 18475, 63600, 8938, 23.8, 9548, 7.6),
  row("35–39", "35 to 39", 21561, 66934, 9600, 23.1, 10519, 6.9),
  row("40–44", "40 to 44", 24061, 66918, 9993, 21.8, 10815, 6.4),
  row("45–49", "45 to 49", 28084, 66094, 10697, 20.8, 11213, 5.9),
  row("50–54", "50 to 54", 35235, 62659, 11942, 18.9, 12291, 5.3),
  row("55–59", "55 to 59", 43519, 57618, 13157, 16.4, 13384, 4.8),
  row("60–64", "60 to 64", 52381, 51778, 13996, 12.9, 14163, 4.4),
  row("65–69", "65 to 69", 59344, 47232, 14324, 9.3, 14662, 4.0),
  row("70–74", "70 to 74", 64972, 44264, 13865, 6.9, 14634, 3.6),
  row("75–79", "75 to 79", 71094, 41030, 13528, 5.5, 16002, 3.3),
  row("80+", "80 and over", 76305, 36526, 14609, 3.6, 31068, 2.8),
];
export const DEFAULT_AGE = 3;

export const money = (n: number) => "$" + n.toLocaleString("en-CA");

export function ageLabel(i: number): string {
  if (i === AGES.length - 1) return "Ages 80 and over";
  return `Ages ${AGES[i]!.words}`;
}

export function who(i: number): string {
  if (i === AGES.length - 1) return "People 80 and over";
  return `People aged ${AGES[i]!.words}`;
}

/** The largest held + unused room of any age group: every lens is drawn against it, so they share one scale. */
export const LENS_SCALE = Math.max(...AGES.map((r) => r.fmv + r.unusedRoom));

/**
 * A lens drawn to scale by area: the disc is the average value, the ring around it the average unused room.
 * `outer` is the radius of value + room, `inner` the radius of value alone, both against LENS_SCALE at `radius`.
 */
export function lensRadii(r: AgeRow, radius: number): { outer: number; inner: number } {
  return { outer: radius * Math.sqrt((r.fmv + r.unusedRoom) / LENS_SCALE), inner: radius * Math.sqrt(r.fmv / LENS_SCALE) };
}

/** The sentence under the lens: what the age group put in and took out during the year. */
export function flowSentence(r: AgeRow): string {
  return `During 2024 they put in ${money(r.contributions)} over ${r.contributionCount.toFixed(1)} deposits and took out ${money(r.withdrawals)} over ${r.withdrawalCount.toFixed(1)} withdrawals.`;
}
