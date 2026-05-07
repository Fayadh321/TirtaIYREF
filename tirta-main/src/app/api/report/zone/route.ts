import { type NextRequest, NextResponse } from "next/server";
import { ZoneRiskLevel } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { forecastToZoneRisk, pointInZoneBbox } from "../add/route";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const lat = Number(searchParams.get("lat"));

  const lng = Number(searchParams.get("lng"));

  if (!lat || !lng) {
    return NextResponse.json(
      {
        error: "Missing coordinates",
      },
      {
        status: 400,
      },
    );
  }

  const nearbyZones = await prisma.floodZone.findMany({
    where: {
      centerLat: {
        gte: lat - 0.2,
        lte: lat + 0.2,
      },

      centerLng: {
        gte: lng - 0.2,
        lte: lng + 0.2,
      },
    },

    select: {
      id: true,
      name: true,
      centerLat: true,
      centerLng: true,
      averageRiskScore: true,
    },
  });

  const matchedZone =
    nearbyZones.find((z) =>
      pointInZoneBbox(lat, lng, z.centerLat, z.centerLng, 500),
    ) ?? null;

  if (!matchedZone) {
    return NextResponse.json({
      riskLevel: "UNKNOWN",
      averageRiskScore: 0,
      zoneName: null,
    });
  }

  const avgRisk = matchedZone.averageRiskScore ?? 0;

  const riskLevel = forecastToZoneRisk(avgRisk);

  return NextResponse.json({
    riskLevel,
    averageRiskScore: avgRisk,
    zoneName: matchedZone.name,
  });
}
