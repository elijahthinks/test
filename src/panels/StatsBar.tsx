import type { AppState } from "../state/appState";
import { formatNumber } from "../lib/format";

/** Totals for whatever the filters currently show. */
export function StatsBar({ app }: { app: AppState }) {
  const stats = [
    { value: app.events.length, label: app.events.length === 1 ? "conflict event" : "conflict events", short: "events" },
    {
      value: app.fatalities,
      label: "reported fatalities",
      short: "fatalities",
      note: app.unreported
        ? `${formatNumber(app.unreported)} ${app.unreported === 1 ? "event has" : "events have"} no fatality figure`
        : undefined,
    },
    { value: app.incidents.length, label: app.incidents.length === 1 ? "cyber incident" : "cyber incidents", short: "cyber incidents" },
  ];
  return (
    <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 lg:gap-x-6" aria-live="polite">
      {stats.map((s) => (
        <div key={s.label} className="flex items-baseline gap-1.5" title={s.note}>
          {/* dt must come first in the DOM; flex order puts the number first visually. */}
          <dt className="order-2 text-xs text-muted lg:text-sm">
            <span className="lg:hidden">{s.short}</span>
            <span className="hidden lg:inline">{s.label}</span>
            {s.note ? <span className="sr-only">. {s.note}</span> : null}
          </dt>
          <dd className="order-1 text-base font-bold lg:text-lg">{formatNumber(s.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
