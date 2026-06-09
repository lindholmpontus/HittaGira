import { sql, type SQL } from "drizzle-orm";
import { ads } from "@/db/schema";
import type { Place } from "./places";

const EARTH_RADIUS_KM = 6371;

/**
 * SQL predicate matching ads whose stored coordinates lie within `radiusKm`
 * of `place`, via the spherical law of cosines. We compare the cosine of the
 * central angle against cos(radius / R) rather than calling acos(): that's
 * numerically safe (no acos domain errors from float rounding) and keeps the
 * whole filter in SQL, so COUNT()/LIMIT pagination still works.
 *
 * Ads without coordinates (every non-Blocket source today) never match.
 */
export function withinRadius(place: Place, radiusKm: number): SQL {
  const lat0 = (place.lat * Math.PI) / 180;
  const lon0 = (place.lon * Math.PI) / 180;
  const cosLat0 = Math.cos(lat0);
  const sinLat0 = Math.sin(lat0);
  const cosThreshold = Math.cos(radiusKm / EARTH_RADIUS_KM);
  return sql`${ads.lat} IS NOT NULL AND (
    ${cosLat0} * cos(radians(${ads.lat})) * cos(radians(${ads.lon}) - ${lon0})
    + ${sinLat0} * sin(radians(${ads.lat}))
  ) >= ${cosThreshold}`;
}
