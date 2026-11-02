import { useEffect, useState } from "react";
import { loadDataset, type Dataset } from "./lib/api";
import { useAppState } from "./state/appState";
import { MapView } from "./map/MapView";

export function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadDataset().then(setData, (e: Error) => setError(e.message));
  }, []);
  if (error) return <p className="p-6">Couldn't load the map data ({error}).</p>;
  if (!data) return <p className="p-6 text-muted">Loading map data…</p>;
  return <Shell data={data} />;
}

function Shell({ data }: { data: Dataset }) {
  const app = useAppState(data);
  const { state, dispatch } = app;
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-rule px-4 py-3">
        <h1 className="text-lg font-bold">Conflict and cyber activity in the Middle East</h1>
        <p className="text-sm text-muted">{app.events.length} events</p>
      </header>
      <main className="relative flex-1">
        <MapView
          countries={data.countries}
          events={app.events}
          incidents={app.incidents}
          layers={state.layers}
          highlightCountries={null}
          selection={state.selection}
          focusCountry={state.filters.country}
          padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
          onSelect={(selection) => dispatch({ type: "select", selection })}
        />
      </main>
    </div>
  );
}
