import { type NextRequest, NextResponse } from "next/server";

import {
  forecastToZoneRisk,
  getNearestForecastAverageRisk,
} from "@/lib/forecast-zone";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const lat = Number(searchParams.get("lat"));

  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      {
        error: "Missing coordinates",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const origin = new URL(req.url).origin;
    const nearest = await getNearestForecastAverageRisk({
      origin,
      lat,
      lng,
    });

    if (!nearest) {
      return NextResponse.json({
        riskLevel: "UNKNOWN",
        averageRiskScore: 0,
        zoneName: null,
      });
    }

    const avgRisk = nearest.averageRisk;
    const riskLevel = forecastToZoneRisk(avgRisk);

    return NextResponse.json({
      riskLevel,
      averageRiskScore: avgRisk,
      zoneName: nearest.zoneName,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to fetch zone risk",
      },
      {
        status: 500,
      },
    );
  }
}
