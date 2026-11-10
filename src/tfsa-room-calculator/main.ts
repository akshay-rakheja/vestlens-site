import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/source-serif-4";

import { calculateRoom, dollars, excessTaxForPeriod, FIRST_LIMIT_YEAR, LATEST_LIMIT_YEAR, parseAmount, TFSA_AGE } from "./rules.ts";

// Nothing here is stored or sent: the inputs live in the page until it's closed.
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const YEAR = new Date().getFullYear();
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const away = new Set<number>();

document.querySelectorAll(".thisYear").forEach((el) => { el.textContent = String(YEAR); });

function fieldError(id: string, message: string | null) {
  const input = $<HTMLInputElement>(id);
  const err = $(`${id}Err`);
  err.hidden = message === null;
  err.textContent = message ?? "";
  if (message === null) input.removeAttribute("aria-invalid");
  else input.setAttribute("aria-invalid", "true");
}

function readAmount(id: string): number {
  const value = parseAmount($<HTMLInputElement>(id).value);
  fieldError(id, Number.isNaN(value) ? "Enter a dollar amount, like 5,000." : null);
  return value;
}

/** A four-digit year within range, null if blank or still being typed, NaN if it can't be right. */
function readYear(id: string, min: number, max: number): number | null {
  const text = $<HTMLInputElement>(id).value.trim();
  if (text.length < 4) {
    fieldError(id, /^\d*$/.test(text) ? null : "Enter a four-digit year.");
    return /^\d*$/.test(text) ? null : NaN;
  }
  const year = Number(text);
  const ok = /^\d{4}$/.test(text) && year >= min && year <= max;
  fieldError(id, ok ? null : `Enter a year from ${min} to ${max}.`);
  return ok ? year : NaN;
}

function renderAwayYears(firstYear: number) {
  const box = $("awayYears");
  const last = Math.min(YEAR, LATEST_LIMIT_YEAR);
  for (const y of [...away]) if (y < firstYear || y > last) away.delete(y);
  const years: number[] = [];
  for (let y = firstYear; y <= last; y++) years.push(y);
  const wanted = years.join();
  if (box.dataset.years !== wanted) {
    box.dataset.years = wanted;
    box.innerHTML = years.map((y) => `<button type="button" data-year="${y}" aria-pressed="${away.has(y)}">${y}</button>`).join("");
  }
}

function setWarn(id: string, text: string | null) {
  const el = $(id);
  el.hidden = text === null;
  el.textContent = text ?? "";
}

function clearAnswer(what: string) {
  $("answer").classList.remove("over");
  $("roomFigure").textContent = "—";
  $("roomWhat").textContent = what;
  $("sum").hidden = true;
  $("yearsBox").hidden = true;
  for (const id of ["overNote", "backNote", "missingNote"]) setWarn(id, null);
  $("awayNote").hidden = true;
}

function update() {
  $("movedField").hidden = !$<HTMLInputElement>("movedHere").checked;
  $("awayField").hidden = !$<HTMLInputElement>("wasAway").checked;

  const birthYear = readYear("birthYear", YEAR - 110, YEAR);
  const moved = $<HTMLInputElement>("movedHere").checked;
  const residentSince = moved ? readYear("residentSince", YEAR - 110, YEAR) : null;
  if (!moved) fieldError("residentSince", null);
  const totalContributed = readAmount("contributed");
  const withdrawnBeforeThisYear = readAmount("withdrawnBefore");
  const withdrawnThisYear = readAmount("withdrawnNow");

  if (birthYear === null || Number.isNaN(birthYear)) {
    clearAnswer("Enter the year you were born to see your room.");
    return;
  }
  if (moved && (residentSince === null || Number.isNaN(residentSince))) {
    clearAnswer("Enter the year you became a resident to see your room.");
    return;
  }
  if ([totalContributed, withdrawnBeforeThisYear, withdrawnThisYear].some(Number.isNaN)) {
    clearAnswer("Fix the highlighted amount to see your room.");
    return;
  }

  const wasAway = $<HTMLInputElement>("wasAway").checked;
  renderAwayYears(Math.max(FIRST_LIMIT_YEAR, birthYear + TFSA_AGE, residentSince ?? FIRST_LIMIT_YEAR));
  const r = calculateRoom({
    birthYear, residentSince, nonResidentYears: wasAway ? [...away] : [], totalContributed, withdrawnBeforeThisYear, withdrawnThisYear, year: YEAR,
  });
  if (!r.eligible) {
    clearAnswer(`Your room starts in ${r.firstYear}, the year you turn ${TFSA_AGE}.`);
    return;
  }

  const over = r.excess > 0;
  $("answer").classList.toggle("over", over);
  $("roomFigure").textContent = dollars(over ? r.excess : r.room);
  $("roomWhat").textContent = over ? `${r.lowestExcess < r.excess ? "at most, " : ""}over your room in ${YEAR}, based on what you entered` : `of TFSA room left in ${YEAR}`;
  $("sum").hidden = false;
  $("limitsLabel").textContent = `Limits from ${r.years[0]?.year ?? r.firstYear} to ${r.limitsThrough}`;
  $("limitsValue").textContent = dollars(r.limitsTotal);
  $("backValue").textContent = `+${dollars(withdrawnBeforeThisYear)}`;
  $("contribValue").textContent = `−${dollars(totalContributed)}`;
  $("totalLabel").textContent = over ? "Amount over" : "Room left";
  $("totalValue").textContent = dollars(over ? r.excess : r.room);
  $("yearsBox").hidden = false;
  $("yearsRows").innerHTML = r.years.map((y) => `<tr><td>${y.year}</td><td>${dollars(y.limit)}</td></tr>`).join("");

  setWarn("overNote", over ? "If this is right, CRA charges 1% a month on the excess until it's gone. Check your figures against CRA My Account, then see what it costs below." : null);
  setWarn("backNote", withdrawnThisYear === 0 ? null : over
    ? `If the ${dollars(withdrawnThisYear)} you withdrew in ${YEAR} came out after you went over, it lowers the amount over, to as little as ${dollars(r.lowestExcess)}, and only the rest comes back on January 1, ${YEAR + 1}. This page isn't told the order, so the figure above doesn't count it.`
    : `The ${dollars(withdrawnThisYear)} you withdrew in ${YEAR} isn't counted yet. It comes back on January 1, ${YEAR + 1}.`);
  setWarn("missingNote", r.limitMissing ? `The ${YEAR} limit isn't in this calculator yet, so it isn't counted. Your room will be higher once it's added.` : null);
  $("awayNote").hidden = !(wasAway && away.size > 0);

  // Follows the calculated excess until the reader types their own amount.
  if ($("overAmount").dataset.typed !== "1") {
    $<HTMLInputElement>("overAmount").value = over ? dollars(r.excess) : "";
    updateTax();
  }
}

function updateTax() {
  const amount = readAmount("overAmount");
  const startMonth = Number($<HTMLSelectElement>("overStart").value);
  const removedMonth = Number($<HTMLSelectElement>("overEnd").value);
  const out = $("taxOut");
  if (Number.isNaN(amount) || amount <= 0) {
    out.textContent = "Enter an amount to see the tax.";
    return;
  }
  if (removedMonth < startMonth) {
    out.textContent = "The month it comes out can't be before the month you went over.";
    return;
  }
  const t = excessTaxForPeriod({ amount, startMonth, removedMonth });
  out.textContent = `${dollars(t.total)} in tax: ${dollars(t.perMonth)} a month for ${t.months} ${t.months === 1 ? "month" : "months"}.`;
}

const options = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
$("overStart").innerHTML = options;
$("overEnd").innerHTML = options;
const thisMonth = new Date().getMonth() + 1;
$<HTMLSelectElement>("overStart").value = String(thisMonth);
$<HTMLSelectElement>("overEnd").value = String(Math.min(12, thisMonth));

for (const id of ["birthYear", "residentSince", "contributed", "withdrawnBefore", "withdrawnNow", "movedHere", "wasAway"]) {
  $(id).addEventListener("input", update);
}
$("awayYears").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!b) return;
  const year = Number(b.dataset.year);
  if (away.has(year)) away.delete(year);
  else away.add(year);
  b.setAttribute("aria-pressed", String(away.has(year)));
  update();
});
$("overAmount").addEventListener("input", () => {
  $("overAmount").dataset.typed = "1";
  updateTax();
});
for (const id of ["overStart", "overEnd"]) $(id).addEventListener("change", updateTax);

update();
