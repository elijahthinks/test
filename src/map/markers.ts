/** DOM builders for the HTML event markers. */
import { EVENT_TYPE_INFO, FAMILIES, FAMILY_ORDER, PALETTE, type Family } from "../lib/taxonomy";
import { formatDate, plural } from "../lib/format";
import type { EventType } from "../../shared/schema";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface PointProps {
  id: string;
  event_type: EventType;
  family: Family;
  date: string;
  location_name: string;
}

export type ClusterCounts = Record<Family, number>;

/** Diameter grows with the square root of the count, so area tracks the number. */
export const clusterSize = (n: number) => Math.round(Math.min(64, 26 + Math.sqrt(n) * 5));

export function clusterElement(total: number, counts: ClusterCounts): HTMLButtonElement {
  const size = clusterSize(total);
  const r = size / 2;
  const ring = Math.max(5, size * 0.2);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "event-marker";
  btn.style.width = btn.style.height = `${size}px`;
  const parts = FAMILY_ORDER.filter((f) => counts[f] > 0).map((f) => `${plural(counts[f], FAMILIES[f].label.toLowerCase(), FAMILIES[f].label.toLowerCase())}`);
  btn.setAttribute("aria-label", `${plural(total, "event")}: ${parts.join(", ")}. Zoom in.`);
  btn.title = `${plural(total, "event")}. Click to zoom in.`;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("aria-hidden", "true");

  // Donut: one arc per family, with a thin gap of the ink color between arcs.
  const bg = document.createElementNS(SVG_NS, "circle");
  bg.setAttribute("cx", String(r));
  bg.setAttribute("cy", String(r));
  bg.setAttribute("r", String(r));
  bg.setAttribute("fill", PALETTE.ink);
  svg.appendChild(bg);

  const present = FAMILY_ORDER.filter((f) => counts[f] > 0);
  const arcR = r - 1 - ring / 2;
  const circumference = 2 * Math.PI * arcR;
  const gap = present.length > 1 ? 1.5 : 0;
  let offset = 0;
  for (const f of present) {
    const len = (counts[f] / total) * circumference;
    const arc = document.createElementNS(SVG_NS, "circle");
    arc.setAttribute("cx", String(r));
    arc.setAttribute("cy", String(r));
    arc.setAttribute("r", String(arcR));
    arc.setAttribute("fill", "none");
    arc.setAttribute("stroke", FAMILIES[f].color);
    arc.setAttribute("stroke-width", String(ring));
    arc.setAttribute("stroke-dasharray", `${Math.max(0, len - gap)} ${circumference}`);
    arc.setAttribute("stroke-dashoffset", String(-offset));
    arc.setAttribute("transform", `rotate(-90 ${r} ${r})`);
    svg.appendChild(arc);
    offset += len;
  }

  const label = document.createElementNS(SVG_NS, "text");
  label.setAttribute("x", String(r));
  label.setAttribute("y", String(r));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "central");
  label.setAttribute("fill", PALETTE.paper);
  label.setAttribute("font-family", "Atkinson Hyperlegible Next, system-ui, sans-serif");
  label.setAttribute("font-weight", "700");
  label.setAttribute("font-size", String(size < 34 ? 11 : 13));
  label.textContent = String(total);
  svg.appendChild(label);

  btn.appendChild(svg);
  return btn;
}

export function pointElement(p: PointProps): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "event-marker";
  btn.dataset.eventId = p.id;
  const label = `${EVENT_TYPE_INFO[p.event_type].label}, ${p.location_name}, ${formatDate(p.date)}`;
  btn.setAttribute("aria-label", label);
  btn.title = label;
  styleDot(btn, p.family, false);
  return btn;
}

export function styleDot(btn: HTMLElement, family: Family, selected: boolean) {
  const size = selected ? 20 : 14;
  btn.style.width = btn.style.height = `${size}px`;
  btn.style.background = FAMILIES[family].color;
  btn.style.boxShadow = selected
    ? `0 0 0 2px ${PALETTE.ink}, 0 0 0 4px ${PALETTE.paper}`
    : `0 0 0 2px ${PALETTE.ink}`;
  btn.setAttribute("aria-pressed", String(selected));
}
