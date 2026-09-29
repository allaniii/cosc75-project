import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "../config/supabase.js";
import { $, text, options } from "../utils/dom.js";
let map,
  routeLayer,
  markers = [],
  selected;
async function invoke(body) {
  const { data, error } = await db().functions.invoke("route", { body });
  if (error) {
    let m = error.message;
    try {
      m = (await error.context.json()).error || m;
    } catch {}
    throw new Error(m);
  }
  if (data.error) throw new Error(data.error);
  return data;
}
function getMap() {
  if (!map) {
    map = L.map("route-map").setView([14.35, 120.95], 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
  }
  return map;
}
export async function selectRoute(dispatch) {
  selected = dispatch;
  getMap();
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  $("#route-candidates").hidden = true;
  if (!dispatch) {
    text("route-summary", "No dispatch selected.");
    return;
  }
  const link = $("#directions-link");
  link.hidden = false;
  link.href =
    "https://www.google.com/maps/dir/?api=1&origin=" +
    encodeURIComponent(dispatch.pickup) +
    "&destination=" +
    encodeURIComponent(dispatch.destination);
  text(
    "route-summary",
    `${dispatch.pickup} → ${dispatch.destination} · Loading provider route…`,
  );
  try {
    if (
      [
        dispatch.pickup_lon,
        dispatch.pickup_lat,
        dispatch.destination_lon,
        dispatch.destination_lat,
      ].every((v) => v !== null && Number.isFinite(Number(v)))
    ) {
      await draw(
        [
          [dispatch.pickup_lon, dispatch.pickup_lat],
          [dispatch.destination_lon, dispatch.destination_lat],
        ],
        dispatch.id,
      );
    } else {
      const [from, to] = await Promise.all([
        invoke({ action: "geocode", text: dispatch.pickup }),
        invoke({ action: "geocode", text: dispatch.destination }),
      ]);
      if (selected?.id !== dispatch.id) return;
      const choices = (data) =>
        data.features.map((f, i) => ({
          id: String(i),
          label: f.properties.label,
          coords: f.geometry.coordinates,
        }));
      const a = choices(from),
        b = choices(to);
      if (!a.length || !b.length)
        throw new Error(
          "No matching locations. Edit the dispatch with exact latitude and longitude.",
        );
      options("#pickup-choice", a, (x) => x.label, null);
      options("#destination-choice", b, (x) => x.label, null);
      $("#route-candidates").hidden = false;
      text(
        "route-summary",
        "Confirm the matching Philippine locations, then show the road route.",
      );
      $("#draw-route").onclick = async () => {
        try {
          await draw(
            [
              a[Number($("#pickup-choice").value)].coords,
              b[Number($("#destination-choice").value)].coords,
            ],
            dispatch.id,
          );
        } catch (e) {
          text("route-summary", e.message);
        }
      };
    }
  } catch (e) {
    if (selected?.id === dispatch.id)
      text(
        "route-summary",
        `Embedded route unavailable: ${e.message} Use external directions below. Configure the route Edge Function and ORS_API_KEY in README.`,
      );
  }
}
async function draw(coords, id) {
  const geo = await invoke({ action: "directions", coordinates: coords });
  if (selected?.id !== id) return;
  if (routeLayer) map.removeLayer(routeLayer);
  markers.forEach((m) => map.removeLayer(m));
  routeLayer = L.geoJSON(geo, { style: { color: "#2f72dc", weight: 5 } }).addTo(
    map,
  );
  markers = coords.map((c, i) =>
    L.circleMarker([c[1], c[0]], {
      radius: 7,
      color: i ? "#d24b55" : "#12866e",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(i ? "Destination" : "Pickup"),
  );
  map.fitBounds(routeLayer.getBounds(), { padding: [25, 25] });
  const s = geo.features[0]?.properties?.summary;
  if (!s) throw new Error("Routing provider returned no summary.");
  text(
    "route-summary",
    `${selected.pickup} → ${selected.destination} · ${(s.distance / 1000).toFixed(1)} km · ${Math.round(s.duration / 60)} min estimated · HGV route, no live traffic`,
  );
}
