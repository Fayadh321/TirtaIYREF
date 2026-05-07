import { ZoneRiskLevel } from "@/generated/prisma";
import { haversineMeters } from "@/lib/geo";

export function forecastToZoneRisk(avgRisk: number): ZoneRiskLevel {
  if (avgRisk >= 0.8) return ZoneRiskLevel.SANGAT_RAWAN;
  if (avgRisk >= 0.3) return ZoneRiskLevel.RAWAN;
  return ZoneRiskLevel.TIDAK_RAWAN;
}

export async function getNearestForecastAverageRisk(params: {
  origin: string;
  lat: number;
  lng: number;
}): Promise<{ averageRisk: number; zoneName: string | null } | null> {
  const res = await fetch(`${params.origin}/api/map/forecast`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: { average_risk?: number; grid_id?: string };
    }[];
  };

  const features = json.features ?? [];
  if (!Array.isArray(features) || features.length === 0) return null;

  let minDistance = Number.POSITIVE_INFINITY;
  let nearest: (typeof features)[number] | null = null;

  for (const f of features) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    const [gridLng, gridLat] = coords;
    if (!Number.isFinite(gridLat) || !Number.isFinite(gridLng)) continue;

    const d = haversineMeters(params.lat, params.lng, gridLat, gridLng);
    if (d < minDistance) {
      minDistance = d;
      nearest = f;
    }
  }

  if (!nearest) return null;

  const averageRisk = nearest.properties?.average_risk ?? 0;
  return {
    averageRisk: Number.isFinite(averageRisk) ? averageRisk : 0,
    zoneName: nearest.properties?.grid_id ?? null,
  };
}
