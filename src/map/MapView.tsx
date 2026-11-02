import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type LngLatBoundsLike, type MapGeoJSONFeature } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
// MapLibre 6 finds its worker relative to its own module URL, which breaks once
// a bundler moves files around. Importing it as an asset gives a stable URL.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { ConflictEvent, CountryCode, CyberIncident } from "../../shared/schema";
import { COUNTRIES } from "../../shared/schema";
import type { Countries } from "../lib/api";
import { EVENT_TYPE_INFO, FAMILY_ORDER, type Family } from "../lib/taxonomy";
import type { Selection } from "../state/appState";
import { buildStyle, hatchImage } from "./style";
import { clusterElement, pointElement, styleDot, type ClusterCounts, type PointProps } from "./markers";

export const REGION_BOUNDS: LngLatBoundsLike = [
  [24, 11.5],
  [63.5, 42.5],
];

interface Props {
  countries: Countries;
  events: ConflictEvent[];
  incidents: CyberIncident[];
  layers: { conflict: boolean; cyber: boolean };
  /** Target countries of the highlighted threat group, or null. */
  highlightCountries: string[] | null;
  selection: Selection;
  focusCountry: CountryCode | null;
  /** Space covered by overlaid UI (the mobile sheet), so fits avoid it. */
  padding: { top: number; right: number; bottom: number; left: number };
  onSelect: (s: Selection) => void;
}

setWorkerUrl(workerUrl);

const NONE = "__none__";

function toPoints(events: ConflictEvent[]): FeatureCollection<Point, PointProps> {
  return {
    type: "FeatureCollection",
    features: events.map((e) => ({
      type: "Feature",
      properties: {
        id: e.id,
        event_type: e.event_type,
        family: EVENT_TYPE_INFO[e.event_type].family,
        date: e.date,
        location_name: e.location_name,
      },
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
    })),
  };
}

function boundsOf(countries: Countries, iso: string): LngLatBoundsLike | null {
  const f = countries.features.find((c) => c.properties.iso === iso);
  if (!f) return null;
  let [w, s, e, n] = [180, 90, -180, -90];
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys)
    for (const [x, y] of poly[0]) {
      w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y);
    }
  return [[w, s], [e, n]];
}

export function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  // Latest props for map event handlers, which are bound once.
  const live = useRef(props);
  live.current = props;

  const markers = useRef(new Map<string, Marker>());
  const onScreen = useRef(new Set<string>());

  /* ----------------------------------------------------------- create */
  useEffect(() => {
    const map = new MapLibreMap({
      container: container.current!,
      style: buildStyle(props.countries),
      bounds: REGION_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      minZoom: 2.5,
      maxZoom: 11,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __map: MapLibreMap }).__map = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.touchZoomRotate.disableRotation();

    map.on("load", () => {
      map.addImage("hatch", hatchImage(2), { pixelRatio: 2 });
      map.addLayer(
        {
          id: "cyber-hatch",
          type: "fill",
          source: "countries",
          filter: ["get", "in_scope"],
          paint: {
            "fill-pattern": "hatch",
            "fill-opacity": ["case", ["boolean", ["feature-state", "weak"], false], 1, 0],
          },
        },
        "group-dim",
      );
      map.addSource("events", {
        type: "geojson",
        data: toPoints([]),
        cluster: true,
        clusterRadius: 30,
        clusterMaxZoom: 7,
        clusterProperties: Object.fromEntries(
          FAMILY_ORDER.map((f) => [f, ["+", ["case", ["==", ["get", "family"], f], 1, 0]]]),
        ),
      });
      // Invisible layer: MapLibre only builds tiles for sources a layer uses,
      // and the HTML markers read their positions from those tiles.
      map.addLayer({ id: "events-anchor", type: "circle", source: "events", paint: { "circle-radius": 0, "circle-opacity": 0 } });
      setReady(true);
    });

    // Tiles can fail (offline, blocked network). The bundled boundaries still
    // draw the map, so log once and carry on.
    let warned = false;
    map.on("error", (e) => {
      if (import.meta.env.DEV) console.warn("[map]", e.error?.message);
      else if (!warned) console.warn("Map resource failed to load; continuing with bundled boundaries.", e.error?.message);
      warned = true;
    });

    map.on("click", (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ["land"] }).find((f) => f.properties.in_scope);
      live.current.onSelect(hit ? { kind: "country", iso: hit.properties.iso as CountryCode } : null);
    });
    map.on("mousemove", (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ["land"] }).some((f) => f.properties.in_scope);
      map.getCanvas().style.cursor = hit ? "pointer" : "";
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current!);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markers.current.clear();
      onScreen.current.clear();
    };
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------- event markers */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const clearMarkers = () => {
      for (const m of markers.current.values()) m.remove();
      markers.current.clear();
      onScreen.current.clear();
    };

    // Cluster ids are only stable for one dataset, so start fresh on every change.
    clearMarkers();
    (map.getSource("events") as GeoJSONSource).setData(toPoints(props.layers.conflict ? props.events : []));

    const update = () => {
      if (!map.getSource("events") || !map.isSourceLoaded("events")) return;
      const next = new Set<string>();
      for (const f of map.querySourceFeatures("events") as MapGeoJSONFeature[]) {
        const p = f.properties;
        const coords = (f.geometry as Point).coordinates as [number, number];
        const key = p.cluster ? `c${p.cluster_id}` : `e${p.id}`;
        if (next.has(key)) continue;
        next.add(key);
        let marker = markers.current.get(key);
        if (!marker) {
          let el: HTMLButtonElement;
          if (p.cluster) {
            const counts = Object.fromEntries(FAMILY_ORDER.map((fam) => [fam, Number(p[fam] ?? 0)])) as ClusterCounts;
            el = clusterElement(Number(p.point_count), counts);
            const clusterId = Number(p.cluster_id);
            el.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              const zoom = await (map.getSource("events") as GeoJSONSource).getClusterExpansionZoom(clusterId);
              map.easeTo({ center: coords, zoom: Math.min(zoom + 0.25, 11) });
            });
          } else {
            const point = p as unknown as PointProps;
            el = pointElement(point);
            const sel = live.current.selection;
            styleDot(el, point.family as Family, sel?.kind === "event" && sel.id === point.id);
            el.addEventListener("click", (ev) => {
              ev.stopPropagation();
              live.current.onSelect({ kind: "event", id: point.id });
            });
          }
          marker = new Marker({ element: el }).setLngLat(coords);
          markers.current.set(key, marker);
        }
        if (!onScreen.current.has(key)) marker.addTo(map);
      }
      for (const key of onScreen.current) if (!next.has(key)) markers.current.get(key)?.remove();
      onScreen.current = next;
    };

    map.on("render", update);
    update();
    return () => {
      map.off("render", update);
    };
  }, [ready, props.events, props.layers.conflict]);

  // Restyle the selected dot without rebuilding markers.
  useEffect(() => {
    const sel = props.selection;
    for (const m of markers.current.values()) {
      const el = m.getElement();
      const id = el.dataset.eventId;
      if (!id) continue;
      const ev = live.current.events.find((e) => e.id === id);
      if (ev) styleDot(el, EVENT_TYPE_INFO[ev.event_type].family, sel?.kind === "event" && sel.id === id);
    }
  }, [props.selection]);

  /* ------------------------------------------------------ cyber layer */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const counts = new Map<string, { total: number; unattributed: number }>();
    for (const i of props.incidents) {
      const c = counts.get(i.target_country) ?? { total: 0, unattributed: 0 };
      c.total++;
      if (!i.attributed_group) c.unattributed++;
      counts.set(i.target_country, c);
    }
    for (const iso of Object.keys(COUNTRIES)) {
      const c = counts.get(iso);
      map.setFeatureState(
        { source: "countries", id: iso },
        { count: c?.total ?? 0, weak: !!c && c.unattributed / c.total > 0.5 },
      );
    }
  }, [ready, props.incidents]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const v = props.layers.cyber ? "visible" : "none";
    map.setLayoutProperty("cyber-fill", "visibility", v);
    map.setLayoutProperty("cyber-hatch", "visibility", v);
  }, [ready, props.layers.cyber]);

  /* ------------------------------------------- highlight and selection */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const targets = props.highlightCountries;
    map.setFilter("group-outline", targets ? ["in", ["get", "iso"], ["literal", targets]] : ["==", ["get", "iso"], NONE]);
    map.setFilter(
      "group-dim",
      targets ? ["all", ["get", "in_scope"], ["!", ["in", ["get", "iso"], ["literal", targets]]]] : ["==", ["get", "iso"], NONE],
    );
  }, [ready, props.highlightCountries]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const iso = props.selection?.kind === "country" ? props.selection.iso : NONE;
    map.setFilter("selected-country", ["==", ["get", "iso"], iso]);
  }, [ready, props.selection]);

  /* -------------------------------------------------------- camera */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const bounds = props.focusCountry ? boundsOf(props.countries, props.focusCountry) : REGION_BOUNDS;
    if (bounds) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.fitBounds(bounds, { padding: addPad(props.padding, 32), maxZoom: 7, duration: reduce ? 0 : 900 });
    }
    // Padding changes alone shouldn't move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.focusCountry, props.countries]);

  // MapLibre's stylesheet sets the container to position: relative, so the
  // absolute positioning lives on a wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" role="region" aria-label="Map of the Middle East" />
    </div>
  );
}

const addPad = (p: Props["padding"], n: number) => ({
  top: p.top + n,
  right: p.right + n,
  bottom: p.bottom + n,
  left: p.left + n,
});
