import { NextResponse } from "next/server";

const FAST_API_URL = process.env.FAST_API_URL;

if (!FAST_API_URL) {
  throw new Error("Missing FORECAST_API_URL environment variable");
}

export async function GET() {
  try {
    const response = await fetch(`${FAST_API_URL}/models/forecast`, {
      next: {
        revalidate: 3600,
      },
    });

    if (!response.ok) {
      throw new Error("Gagal mengambil data dari server ML");
    }

    const forecastJson = await response.json();

    const features = (forecastJson.data as ForecastGrid[]).map((grid) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [grid.lon, grid.lat],
      },
      properties: {
        grid_id: grid.grid_id,
        risk_score_month1: grid.risk_score_month1,
        risk_score_month2: grid.risk_score_month2,
        risk_score_month3: grid.risk_score_month3,
        average_risk: grid.average_risk,
        highest_risk_score: grid.highest_risk_score,
        category: grid.category_month1,
        grid_size_km: forecastJson.grid_size_km,
      },
    }));

    const geoJsonData = {
      type: "FeatureCollection",
      features: features,
    };

    return NextResponse.json(geoJsonData);
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

type ForecastGrid = {
  grid_id: string;
  lat: number;
  lon: number;
  risk_score_month1: number;
  risk_score_month2: number;
  risk_score_month3: number;
  average_risk: number;
  highest_risk_score: number;
  category_month1: string;
};
