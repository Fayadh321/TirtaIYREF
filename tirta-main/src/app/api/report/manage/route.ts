import { v2 as cloudinary } from "cloudinary";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

export async function PATCH(req: NextRequest) {
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
    const report = await prisma.userReport.update({
      where: {
        id: reportId,
      },
      data: {
        status: "PUBLISHED",
      },
    });

    return NextResponse.json({ success: true, report });
  } catch {
    // console.error("Error publishing report:", error);
    return NextResponse.json(
      {
        error: "Failed to publish report",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(req: NextRequest) {
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
      where: {
        id: reportId,
      },
      include: {
        photos: true,
        analysis: true,
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

    const deletePhoto = async (url: string) => {
      const publicId = url.split("/").pop()?.split(".")[0];

      if (publicId)
        await cloudinary.uploader.destroy(`tirta/reports/${publicId}`);
    };

    const deleteMask = async (url: string) => {
      const publicId = url.split("/").pop()?.split(".")[0];

      if (publicId)
        await cloudinary.uploader.destroy(`tirta/segments/${publicId}`);
    };

    for (const photo of report.photos) {
      await deletePhoto(photo.photoURL);
    }

    if (report.analysis?.visualizedUrl) {
      await deleteMask(report.analysis.visualizedUrl);
    }

    await prisma.$transaction([
      prisma.reportPhoto.deleteMany({
        where: {
          reportId,
        },
      }),
      prisma.reportAnalysis.deleteMany({
        where: {
          reportId,
        },
      }),
      prisma.reportFloodHistory.deleteMany({
        where: {
          reportId,
        },
      }),
      prisma.userReport.delete({
        where: {
          id: reportId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
    });
  } catch {
    // console.error("Error deleting report:", error);
    return NextResponse.json(
      {
        error: "Failed to delete report",
      },
      {
        status: 500,
      },
    );
  }
}
