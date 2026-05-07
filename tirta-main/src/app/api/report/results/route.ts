import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  type AiMetricsRatios,
  buildTextAnalysis,
} from "@/lib/report-text-analysis";

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
            photoURL: true,
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
      ai_metrics?: AiMetricsRatios;
      photo_score?: number;
      zone_score?: number;
      form_score?: number;
    } | null;

    const score = report.analysis?.floodRiskScore ?? 0;
    const category = report.analysis?.categoryLevel ?? "UNKNOWN";

    const textAnalysis = buildTextAnalysis({
      finalFRI: score,
      category,
      metrics: aiMetrics?.ai_metrics ?? null,
    });

    return NextResponse.json({
      id: report.id,
      address: report.address,
      title: report.title,
      description: report.description ?? null,
      photos: report.photos.map((p) => p.photoURL),
      uploadedBy: report.user?.name || report.user?.email || "Unknown",
      uploadedByName: report.user?.name || report.user?.email || "Unknown",
      uploadedByPhoto: report.user?.photoURL ?? null,
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
