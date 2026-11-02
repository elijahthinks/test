/**
 * The basemap, built in code rather than loaded from a hosted style so it can
 * use the app's palette.
 *
 * Two layers of geography:
 *  - Natural Earth country polygons, bundled with the app. These draw the land,
 *    the choropleth and the borders, so the map still reads if tiles fail.
 *  - OpenFreeMap vector tiles (OpenStreetMap data, OpenMapTiles schema, no API
 *    key) for crisp coastlines, province lines and city names.
 *
 * Glyphs (label fonts) are self-hosted in /public/glyphs for the same reason.
 */
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import { CYBER_RAMP, PALETTE } from "../lib/taxonomy";
import type { Countries } from "../lib/api";

export const OPENFREEMAP_TILEJSON = "https://tiles.openfreemap.org/planet";

/** Incident-count class breaks. The legend reads from the same list. */
export const CYBER_BREAKS = [1, 3, 5, 8, 12] as const;

export const cyberFillColor: ExpressionSpecification = [
  "step",
  ["coalesce", ["feature-state", "count"], 0],
  "rgba(0,0,0,0)",
  CYBER_BREAKS[0], CYBER_RAMP[0],
  CYBER_BREAKS[1], CYBER_RAMP[1],
  CYBER_BREAKS[2], CYBER_RAMP[2],
  CYBER_BREAKS[3], CYBER_RAMP[3],
  CYBER_BREAKS[4], CYBER_RAMP[4],
];

const englishName: ExpressionSpecification = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "name:latin"],
];

export function buildStyle(countries: Countries): StyleSpecification {
  const labelPoints = {
    type: "FeatureCollection" as const,
    features: countries.features
      .filter((f) => f.properties.in_scope)
      .map((f) => ({
        type: "Feature" as const,
        properties: { iso: f.properties.iso, name: f.properties.name },
        geometry: { type: "Point" as const, coordinates: [f.properties.label_lng, f.properties.label_lat] },
      })),
  };

  return {
    version: 8,
    glyphs: `${window.location.origin}/glyphs/{fontstack}/{range}.pbf`,
    sources: {
      omt: {
        type: "vector",
        url: OPENFREEMAP_TILEJSON,
        attribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      },
      countries: {
        type: "geojson",
        data: countries,
        promoteId: "iso",
        attribution: '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>',
      },
      "country-labels": { type: "geojson", data: labelPoints },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": PALETTE.ink } },
      {
        id: "land",
        type: "fill",
        source: "countries",
        paint: {
          // Countries outside the study area sit back a step.
          "fill-color": ["case", ["get", "in_scope"], PALETTE.land, "#1f2539"],
        },
      },
      {
        id: "omt-water",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        paint: { "fill-color": PALETTE.ink },
      },
      {
        id: "omt-admin1",
        type: "line",
        source: "omt",
        "source-layer": "boundary",
        minzoom: 5,
        filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
        paint: { "line-color": PALETTE.rule, "line-width": 0.6, "line-dasharray": [3, 2] },
      },
      {
        id: "cyber-fill",
        type: "fill",
        source: "countries",
        filter: ["get", "in_scope"],
        paint: { "fill-color": cyberFillColor, "fill-opacity": 0.72 },
      },
      // "cyber-hatch" is inserted here at runtime, once its pattern image exists.
      {
        id: "group-dim",
        type: "fill",
        source: "countries",
        filter: ["==", ["get", "iso"], "__none__"],
        paint: { "fill-color": PALETTE.ink, "fill-opacity": 0.55 },
      },
      {
        id: "country-borders",
        type: "line",
        source: "countries",
        paint: { "line-color": PALETTE.rule, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 7, 1.4] },
      },
      {
        id: "group-outline",
        type: "line",
        source: "countries",
        filter: ["==", ["get", "iso"], "__none__"],
        paint: { "line-color": PALETTE.paper, "line-width": 1.8 },
      },
      {
        id: "selected-country",
        type: "line",
        source: "countries",
        filter: ["==", ["get", "iso"], "__none__"],
        paint: { "line-color": PALETTE.focus, "line-width": 2.6 },
      },
      {
        id: "omt-places",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        minzoom: 4.5,
        filter: [
          "any",
          ["all", ["==", ["get", "class"], "city"], ["<=", ["coalesce", ["get", "rank"], 99], 6]],
          ["all", [">=", ["zoom"], 6.5], ["in", ["get", "class"], ["literal", ["city", "town"]]]],
        ],
        layout: {
          "text-field": englishName,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 9, 13],
          "text-max-width": 8,
          "text-variable-anchor": ["top", "bottom", "left", "right"],
          "text-radial-offset": 0.6,
        },
        paint: { "text-color": PALETTE.muted, "text-halo-color": PALETTE.ink, "text-halo-width": 1.2 },
      },
      {
        id: "country-labels",
        type: "symbol",
        source: "country-labels",
        maxzoom: 7.5,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 6, 14],
          "text-letter-spacing": 0.02,
          "text-max-width": 7,
          "text-padding": 4,
        },
        paint: { "text-color": PALETTE.paper, "text-opacity": 0.8, "text-halo-color": PALETTE.ink, "text-halo-width": 1.4 },
      },
    ],
  };
}

/** A diagonal hatch, drawn once into an image the map can tile. */
export function hatchImage(pixelRatio = 2) {
  const size = 9 * pixelRatio;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "rgba(22, 27, 46, 0.55)";
  ctx.lineWidth = 1.6 * pixelRatio;
  ctx.beginPath();
  // Three strokes so the pattern joins up seamlessly across tiles.
  for (const o of [-size, 0, size]) {
    ctx.moveTo(o, size);
    ctx.lineTo(o + size, 0);
  }
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}
