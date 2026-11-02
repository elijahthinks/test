import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { loadDataset, type Dataset } from "./lib/api";
import { useAppState, type AppState } from "./state/appState";
import { MapView } from "./map/MapView";
import { Filters } from "./panels/Filters";
import { ThreatGroups } from "./panels/ThreatGroups";
import { Detail } from "./panels/Detail";
import { StatsBar } from "./panels/StatsBar";

export function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    loadDataset().then(setData, (e: Error) => setError(e.message));
  };
  useEffect(load, []);

  if (error) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-md space-y-3">
          <h1 className="text-lg font-bold">The map data didn't load</h1>
          <p className="text-sm text-muted">
            The API returned an error ({error}). If you're running locally, start both servers with{" "}
            <code className="text-paper">npm run dev</code>, then try again.
          </p>
          <button type="button" onClick={load} className="rounded border border-paper px-3 py-1.5 text-sm">
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-muted" role="status">
        Loading map data…
      </div>
    );
  }
  return <Shell data={data} />;
}

const desktopQuery = "(min-width: 1024px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(desktopQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(desktopQuery).matches,
  );
}

type Tab = "filters" | "groups" | "details";

function Shell({ data }: { data: Dataset }) {
  const app = useAppState(data);
  const { state, dispatch } = app;
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<Tab>("filters");
  const [sheetOpen, setSheetOpen] = useState(false);

  const highlighted = state.highlightGroup ? data.groups.find((g) => g.id === state.highlightGroup) : null;

  // On mobile, picking something on the map opens the details tab.
  const lastSelection = useRef(state.selection);
  useEffect(() => {
    if (state.selection && state.selection !== lastSelection.current && !isDesktop) {
      setTab("details");
      setSheetOpen(true);
    }
    lastSelection.current = state.selection;
  }, [state.selection, isDesktop]);

  const closeDetail = () => {
    dispatch({ type: "select", selection: null });
    if (!isDesktop) setTab("filters");
  };

  const panels: Record<Tab, ReactNode> = {
    filters: <Filters app={app} />,
    groups: <ThreatGroups app={app} groups={data.groups} />,
    details: <Detail app={app} data={data} onClose={closeDetail} />,
  };

  const sheetHeight = sheetOpen ? Math.round(window.innerHeight * 0.58) : 56;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-col gap-1.5 border-b border-rule bg-ink px-4 py-2.5 lg:flex-row lg:py-3 lg:items-center lg:justify-between lg:gap-6 lg:px-5">
        <h1 className="text-base font-bold leading-tight lg:text-lg">Conflict and cyber activity in the Middle East</h1>
        <StatsBar app={app} />
      </header>

      <div className="relative flex min-h-0 flex-1">
        {isDesktop ? (
          <aside className="flex w-[320px] shrink-0 flex-col border-r border-rule bg-panel" aria-label="Filters and threat groups">
            <Tabs tabs={["filters", "groups"]} active={tab === "details" ? "filters" : tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5" role="tabpanel" id={`panel-${tab}`}>
              {panels[tab === "details" ? "filters" : tab]}
            </div>
          </aside>
        ) : null}

        <main className="relative min-w-0 flex-1">
          <MapView
            countries={data.countries}
            events={app.events}
            incidents={app.incidents}
            layers={state.layers}
            highlightCountries={highlighted?.target_countries ?? null}
            selection={state.selection}
            focusCountry={state.filters.country}
            padding={{ top: 40, right: 0, bottom: isDesktop ? 0 : sheetHeight, left: 0 }}
            onSelect={(selection) => dispatch({ type: "select", selection })}
          />
          <Disclaimer />
          {highlighted ? <HighlightNote app={app} name={highlighted.name} /> : null}
        </main>

        {isDesktop && state.selection ? (
          <aside className="w-[380px] shrink-0 overflow-y-auto border-l border-rule bg-panel px-6 py-5" aria-label="Details">
            {panels.details}
          </aside>
        ) : null}

        {!isDesktop ? (
          <section
            aria-label="Map controls"
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-xl border-t border-rule bg-panel shadow-[0_-8px_24px_rgb(0_0_0/0.35)] transition-[height] duration-200"
            style={{ height: sheetHeight }}
          >
            <div className="flex items-stretch">
              <Tabs
                className="flex-1"
                tabs={state.selection ? ["filters", "groups", "details"] : ["filters", "groups"]}
                active={tab}
                onChange={(t) => {
                  if (t === tab) setSheetOpen((o) => !o);
                  else {
                    setTab(t);
                    setSheetOpen(true);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setSheetOpen((o) => !o)}
                aria-expanded={sheetOpen}
                className="shrink-0 border-b border-rule px-4 text-sm text-muted"
              >
                {sheetOpen ? "Hide" : "Show"}
              </button>
            </div>
            {sheetOpen ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]" role="tabpanel" id={`panel-${tab}`}>
                {panels[tab]}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

const TAB_LABEL: Record<Tab, string> = { filters: "Filters", groups: "Threat groups", details: "Details" };

function Tabs({ tabs, active, onChange, className = "" }: { tabs: Tab[]; active: Tab; onChange: (t: Tab) => void; className?: string }) {
  return (
    <div role="tablist" className={`flex border-b border-rule ${className}`}>
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={active === t}
          aria-controls={`panel-${t}`}
          onClick={() => onChange(t)}
          className={`flex-1 border-b-2 px-3 py-3.5 text-sm transition-colors ${
            active === t ? "border-paper font-bold text-paper" : "border-transparent text-muted hover:text-paper"
          }`}
        >
          {TAB_LABEL[t]}
        </button>
      ))}
    </div>
  );
}

function Disclaimer() {
  return (
    <p
      role="note"
      className="pointer-events-none absolute top-3 left-1/2 z-10 max-w-[calc(100%-6rem)] -translate-x-1/2 rounded-full border border-focus/60 bg-ink/90 px-3.5 py-1.5 text-center text-xs text-paper"
    >
      Demo with sample data. Not for operational use.
    </p>
  );
}

function HighlightNote({ app, name }: { app: AppState; name: string }) {
  return (
    <div className="absolute bottom-10 left-3 z-10 hidden items-center gap-3 rounded border border-rule bg-ink/90 px-3 py-2 text-sm lg:flex">
      <span>
        <span className="text-muted">Outlined: countries targeted by </span>
        {name}
      </span>
      <button
        type="button"
        onClick={() => app.dispatch({ type: "selectGroup", id: null })}
        className="rounded text-muted underline decoration-rule underline-offset-4 hover:text-paper"
      >
        Clear
      </button>
    </div>
  );
}
