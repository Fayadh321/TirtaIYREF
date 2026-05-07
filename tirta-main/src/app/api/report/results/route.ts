import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function buildTextAnalysis(
  finalFRI: number,
  category: string,
  metrics?: {
    vegetation_ratio: number;
    soil_ratio: number;
    impervious_ratio: number;
    building_ratio: number;
  } | null,
) {
  if (!metrics)
    return `Area ini memiliki Final Flood Risk Index (FRI) sebesar ${finalFRI.toFixed(1)} dengan kategori ${category.toLowerCase()}.`;

  const { vegetation_ratio, soil_ratio, impervious_ratio, building_ratio } =
    metrics;
  const notes: string[] = [];

  if (impervious_ratio > 0.5)
    notes.push(
      "Area memiliki dominasi permukaan kedap air yang tinggi sehingga potensi limpasan air meningkat.",
    );

  if (building_ratio > 0.6)
    notes.push(
      "Kepadatan bangunan yang tinggi dapat mengurangi kapasitas resapan dan memperbesar risiko genangan.",
    );

  if (vegetation_ratio < 0.15)
    notes.push(
      "Vegetasi di area ini tergolong rendah sehingga kemampuan penyerapan air alami terbatas.",
    );

  if (soil_ratio < 0.1)
    notes.push(
      "Area resapan terbuka sangat minim sehingga infiltrasi air berpotensi kurang optimal.",
    );

  let summary = "";

  if (category === "HIGH") {
    summary =
      "Area ini tergolong memiliki risiko banjir tinggi berdasarkan analisis lingkungan visual.";
  } else if (category === "MEDIUM") {
    summary =
      "Area ini memiliki risiko banjir menengah dan tetap memerlukan perhatian terhadap kondisi lingkungan sekitar.";
  } else {
    summary =
      "Area ini tergolong memiliki risiko banjir rendah dengan kondisi lingkungan yang relatif lebih baik.";
  }

  return (
    `${summary} ` +
    `Final Flood Risk Index (FRI) tercatat sebesar ${finalFRI.toFixed(1)}. ` +
    notes.join(" ")
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json(
      {
        error: "Missing reportId",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const report = await prisma.userReport.findUnique({
      where: { id: reportId },
      include: {
        photos: {
          select: {
            photoURL: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        analysis: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        {
          error: "Report not found",
        },
        {
          status: 404,
        },
      );
    }

    const aiMetrics = report.analysis?.analysisMetrics as {
      ai_metrics?: {
        vegetation_ratio: number;
        soil_ratio: number;
        impervious_ratio: number;
        building_ratio: number;
      };
      photo_score?: number;
      zone_score?: number;
      form_score?: number;
    } | null;

    const score = report.analysis?.floodRiskScore ?? 0;
    const category = report.analysis?.categoryLevel ?? "UNKNOWN";

    const textAnalysis = buildTextAnalysis(
      score,
      category,
      aiMetrics?.ai_metrics ?? null,
    );

    return NextResponse.json({
      id: report.id,
      address: report.address,
      title: report.title,
      description: report.description ?? null,
      photos: report.photos.map((p) => p.photoURL),
      uploadedBy: report.user?.name || report.user?.email || "Unknown",
      uploadedAt: report.reportedAt.toISOString(),
      coordinates: { lat: report.latitude, lng: report.longitude },
      analysis: {
        score,
        category,
        riskLevel: report.analysis?.riskLevel ?? "UNKNOWN",
        visualizedUrl: report.analysis?.visualizedUrl || null,
        aiMetrics: aiMetrics ?? null,
        photoScore: aiMetrics?.photo_score ?? 0,
        zoneScore: aiMetrics?.zone_score ?? 0,
        formScore: aiMetrics?.form_score ?? 0,
        textAnalysis,
      },
      details: {
        drainage: report.drainageQuality,
        garbage: report.garbageCategory,
        road: report.roadType,
        vegetation: report.vegetationDensity,
      },
      status: report.status,
    });
  } catch {
    // console.error("Error fetching report results:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch results",
      },
      {
        status: 500,
      },
    );
  }
}
