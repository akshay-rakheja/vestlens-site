import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/source-serif-4";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import { AGES, ageLabel, DEFAULT_AGE, flowSentence, lensRadii, money, who } from "./data.ts";

const $ = <T extends HTMLElement | SVGElement = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;

let current = DEFAULT_AGE;
try {
  const saved = localStorage.getItem("vl-age");
  if (saved !== null && AGES[Number(saved)]) current = Number(saved);
} catch {
  // Storage blocked: the default age group.
}

/** A small lens for the picker, on the same scale as the big one (viewBox radius 24). */
function smallLens(i: number): string {
  const { outer, inner } = lensRadii(AGES[i]!, 23);
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="ring" cx="24" cy="24" r="${outer.toFixed(2)}"/><circle class="ring-edge" cx="24" cy="24" r="${outer.toFixed(2)}"/><circle class="held" cx="24" cy="24" r="${inner.toFixed(2)}"/></svg>`;
}
$("ages").innerHTML = AGES.map((r, i) => `<button type="button" id="age-${i}" data-i="${i}" aria-label="Ages ${r.words}">${smallLens(i)}<span>${r.label}</span></button>`).join("");

function show(i: number) {
  current = i;
  const r = AGES[i]!;
  const { outer, inner } = lensRadii(r, 96);
  for (const id of ["lensRoom", "lensEdge"]) $<SVGCircleElement>(id).setAttribute("r", outer.toFixed(2));
  $<SVGCircleElement>("lensHeld").setAttribute("r", inner.toFixed(2));
  $("ageLabel").textContent = `${ageLabel(i)}, in 2024`;
  $("fmv").textContent = money(r.fmv);
  $("room").textContent = money(r.unusedRoom);
  $("flow").textContent = flowSentence(r);
  $("callout").innerHTML = `${who(i)} averaged <strong>${r.withdrawalCount.toFixed(1)} withdrawals</strong>. Room from a withdrawal comes back on 1 January of the next year, not right away. Putting the money back sooner uses this year's room, and CRA charges 1% a month on any amount over.`;
  document.querySelectorAll<HTMLButtonElement>("#ages button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.i) === i)));
  try {
    localStorage.setItem("vl-age", String(i));
  } catch {
    // Storage blocked: the choice just isn't remembered.
  }
}
$("ages").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (b) show(Number(b.dataset.i));
});
show(current);
