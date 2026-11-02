import type { ThreatGroup } from "../../shared/schema";
import type { AppState } from "../state/appState";
import { plural } from "../lib/format";
import { ConfidenceMeter, TextButton } from "./ui";

export function ThreatGroups({ app, groups }: { app: AppState; groups: ThreatGroup[] }) {
  const { state, dispatch } = app;
  const incidentCount = (id: string) => app.incidents.filter((i) => i.attributed_group === id).length;

  return (
    <div>
      <p className="mb-4 max-w-prose text-sm text-muted">
        Public profiles of groups active in the region. Choose one to outline the countries it's reported to target.
        Sponsors are as reported, not proven.
      </p>
      {state.highlightGroup ? (
        <div className="mb-3">
          <TextButton onClick={() => dispatch({ type: "selectGroup", id: null })}>Clear highlight</TextButton>
        </div>
      ) : null}
      <ul className="-mx-2 space-y-1">
        {groups.map((g) => {
          const active = state.highlightGroup === g.id;
          const n = incidentCount(g.id);
          return (
            <li key={g.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "selectGroup", id: active ? null : g.id })}
                className={`w-full rounded border-l-2 px-3 py-2.5 text-left transition-colors ${
                  active ? "border-focus bg-land" : "border-transparent hover:bg-land/60"
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">{g.name}</span>
                  {g.attack_id ? <span className="text-xs text-muted">{g.attack_id}</span> : null}
                </span>
                {g.aliases.length ? (
                  <span className="mt-0.5 block truncate text-xs text-muted">Also {g.aliases.slice(0, 3).join(", ")}</span>
                ) : null}
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span>
                    <span className="text-muted">Sponsor </span>
                    {g.suspected_sponsor.value ? shortSponsor(g.suspected_sponsor.value) : "not named"}
                  </span>
                  <ConfidenceMeter level={g.suspected_sponsor.confidence} subject="in the sponsor" />
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {plural(g.target_countries.length, "target country", "target countries")}. {n ? `${plural(n, "sample incident")} in view.` : "No sample incidents in view."}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Iran (Ministry of Intelligence and Security)" reads as "Iran" in the list. */
const shortSponsor = (s: string) => s.replace(/\s*\(.*\)$/, "");
