// Curated list of Swedish cities used as the centre for the "within X km"
// filter. We deliberately offer a fixed set of well-known places rather than
// the 200+ granular location strings that appear in the ad data (Bromma,
// Järfälla, Västra Frölunda, …). Picking "Stockholm + 50 km" then catches all
// of those suburbs automatically via the distance filter — see lib/geo.ts.
//
// Only Blocket ads carry coordinates today, so the radius filter only matches
// Blocket listings; fixed-location shops (Halkans, DLX, …) have no coords and
// fall outside any radius.

export type Place = { name: string; lat: number; lon: number };

// Ordered roughly by size so the most common picks sit at the top of the menu.
export const PLACES: Place[] = [
  { name: "Stockholm", lat: 59.3293, lon: 18.0686 },
  { name: "Göteborg", lat: 57.7089, lon: 11.9746 },
  { name: "Malmö", lat: 55.605, lon: 13.0038 },
  { name: "Uppsala", lat: 59.8586, lon: 17.6389 },
  { name: "Linköping", lat: 58.4109, lon: 15.6216 },
  { name: "Västerås", lat: 59.6099, lon: 16.5448 },
  { name: "Örebro", lat: 59.2741, lon: 15.2066 },
  { name: "Helsingborg", lat: 56.0465, lon: 12.6945 },
  { name: "Norrköping", lat: 58.5877, lon: 16.1924 },
  { name: "Jönköping", lat: 57.7826, lon: 14.1618 },
  { name: "Lund", lat: 55.7047, lon: 13.191 },
  { name: "Umeå", lat: 63.8258, lon: 20.263 },
  { name: "Gävle", lat: 60.6749, lon: 17.1413 },
  { name: "Borås", lat: 57.721, lon: 12.9401 },
  { name: "Södertälje", lat: 59.1955, lon: 17.6253 },
  { name: "Eskilstuna", lat: 59.3666, lon: 16.5077 },
  { name: "Halmstad", lat: 56.6745, lon: 12.8568 },
  { name: "Växjö", lat: 56.8777, lon: 14.8091 },
  { name: "Karlstad", lat: 59.3793, lon: 13.5036 },
  { name: "Sundsvall", lat: 62.3908, lon: 17.3069 },
  { name: "Östersund", lat: 63.1792, lon: 14.6357 },
  { name: "Trollhättan", lat: 58.2837, lon: 12.2886 },
  { name: "Luleå", lat: 65.5848, lon: 22.1567 },
  { name: "Borlänge", lat: 60.4858, lon: 15.4371 },
  { name: "Kalmar", lat: 56.6634, lon: 16.3568 },
  { name: "Kristianstad", lat: 56.0294, lon: 14.1567 },
  { name: "Falun", lat: 60.6065, lon: 15.6355 },
  { name: "Karlskrona", lat: 56.1612, lon: 15.5869 },
  { name: "Skövde", lat: 58.3912, lon: 13.8451 },
  { name: "Visby", lat: 57.6348, lon: 18.2948 },
];

const PLACE_BY_NAME = new Map(PLACES.map((p) => [p.name, p]));

/** Resolve a `near` query value to a known place, or null if unrecognised. */
export function getPlace(name: string | null | undefined): Place | null {
  if (!name) return null;
  return PLACE_BY_NAME.get(name) ?? null;
}

/** Selectable radii, in kilometres. */
export const RADII = [25, 50, 100, 200] as const;
export type RadiusKm = (typeof RADII)[number];
export const DEFAULT_RADIUS: RadiusKm = 50;

/** Parse a `dist` query value to an allowed radius, falling back to the default. */
export function parseRadius(value: string | null | undefined): RadiusKm {
  const n = Number(value);
  return (RADII as readonly number[]).includes(n) ? (n as RadiusKm) : DEFAULT_RADIUS;
}
