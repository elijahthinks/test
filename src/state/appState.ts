import { useMemo, useReducer } from "react";
import { ATTACK_TYPES, EVENT_TYPES, type CountryCode } from "../../shared/constants";
import type { AttackType, EventType } from "../../shared/schema";
import { matchesConflict, matchesCyber, type ConflictQuery, type CyberQuery } from "../../shared/filters";
import type { Dataset } from "../lib/api";

export type Selection =
  | { kind: "event"; id: string }
  | { kind: "country"; iso: CountryCode }
  | { kind: "group"; id: string }
  | null;

export interface Filters {
  /** Index into `months`, inclusive. */
  monthFrom: number;
  monthTo: number;
  eventTypes: EventType[];
  attackTypes: AttackType[];
  country: CountryCode | null;
}

export interface State {
  filters: Filters;
  layers: { conflict: boolean; cyber: boolean };
  selection: Selection;
  /** Group whose target countries are outlined on the map. Survives clicking a country. */
  highlightGroup: string | null;
}

type Action =
  | { type: "setMonths"; from: number; to: number }
  | { type: "toggleEventType"; value: EventType }
  | { type: "setEventTypes"; values: EventType[] }
  | { type: "toggleAttackType"; value: AttackType }
  | { type: "setCountry"; value: CountryCode | null }
  | { type: "toggleLayer"; layer: keyof State["layers"] }
  | { type: "select"; selection: Selection }
  | { type: "selectGroup"; id: string | null }
  | { type: "resetFilters" };

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

function initialFilters(monthCount: number): Filters {
  return {
    monthFrom: 0,
    monthTo: monthCount - 1,
    eventTypes: [...EVENT_TYPES],
    attackTypes: [...ATTACK_TYPES],
    country: null,
  };
}

function reducer(monthCount: number) {
  return (state: State, action: Action): State => {
    const f = state.filters;
    switch (action.type) {
      case "setMonths":
        return { ...state, filters: { ...f, monthFrom: action.from, monthTo: action.to } };
      case "toggleEventType":
        return { ...state, filters: { ...f, eventTypes: toggle(f.eventTypes, action.value) } };
      case "setEventTypes":
        return { ...state, filters: { ...f, eventTypes: action.values } };
      case "toggleAttackType":
        return { ...state, filters: { ...f, attackTypes: toggle(f.attackTypes, action.value) } };
      case "setCountry":
        return { ...state, filters: { ...f, country: action.value } };
      case "toggleLayer":
        return { ...state, layers: { ...state.layers, [action.layer]: !state.layers[action.layer] } };
      case "select":
        return { ...state, selection: action.selection };
      case "selectGroup":
        return {
          ...state,
          highlightGroup: action.id,
          selection: action.id ? { kind: "group", id: action.id } : state.selection?.kind === "group" ? null : state.selection,
        };
      case "resetFilters":
        return { ...state, filters: initialFilters(monthCount) };
    }
  };
}

/** Every month from the earliest to the latest record, as YYYY-MM-01. */
export function monthsCovering(dates: string[]): string[] {
  const sorted = [...dates].sort();
  const [y0, m0] = sorted[0].split("-").map(Number);
  const [y1, m1] = sorted[sorted.length - 1].split("-").map(Number);
  const out: string[] = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, (m = 1)) : m++) {
    out.push(`${y}-${String(m).padStart(2, "0")}-01`);
  }
  return out;
}

const lastDayOfMonth = (monthStart: string) => {
  const [y, m] = monthStart.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

export function useAppState(data: Dataset) {
  const months = useMemo(
    () => monthsCovering([...data.events.map((e) => e.date), ...data.incidents.map((i) => i.date)]),
    [data],
  );
  const [state, dispatch] = useReducer(reducer(months.length), undefined, () => ({
    filters: initialFilters(months.length),
    layers: { conflict: true, cyber: true },
    selection: null,
    highlightGroup: null,
  }));

  const derived = useMemo(() => {
    const f = state.filters;
    const from = months[f.monthFrom];
    const to = lastDayOfMonth(months[f.monthTo]);
    const countries = f.country ? [f.country] : undefined;
    const conflictQuery: ConflictQuery = { from, to, types: f.eventTypes, countries };
    const cyberQuery: CyberQuery = { from, to, attackTypes: f.attackTypes, countries };
    // An empty type list means the person unticked everything: show nothing, not everything.
    const events = f.eventTypes.length ? data.events.filter((e) => matchesConflict(e, conflictQuery)) : [];
    const incidents = f.attackTypes.length ? data.incidents.filter((i) => matchesCyber(i, cyberQuery)) : [];
    const fatalities = events.reduce((sum, e) => sum + (e.fatalities ?? 0), 0);
    const unreported = events.filter((e) => e.fatalities === null).length;
    const isDefault =
      f.monthFrom === 0 &&
      f.monthTo === months.length - 1 &&
      f.eventTypes.length === EVENT_TYPES.length &&
      f.attackTypes.length === ATTACK_TYPES.length &&
      f.country === null;
    return { from, to, events, incidents, fatalities, unreported, isDefault };
  }, [state.filters, data, months]);

  return { state, dispatch, months, ...derived };
}

export type AppState = ReturnType<typeof useAppState>;
export type Dispatch = AppState["dispatch"];
