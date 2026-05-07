"use client";

import { ReportCardOverlay } from "@/components/card/report-card-overlay";

interface ClusterReportItem {
  id: string;
  title: string | null;
  address: string | null;
  reportedAt: string;
  imageUrl?: string | null;
  floodRiskScore: number;
  categoryLevel: "TINGGI" | "SEDANG" | "RENDAH" | null;
  user: { name: string | null };
}

interface MapClusterOverlayCardsProps {
  reports: ClusterReportItem[];
  sheetLoading: boolean;
  formatRelative: (date: string) => string;
}

export function MapClusterOverlayCards({
  reports,
  sheetLoading,
  formatRelative,
}: MapClusterOverlayCardsProps) {
  if (sheetLoading) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        Memuat laporan...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        Tidak ada laporan di cluster ini
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {reports.map((report) => (
        <ReportCardOverlay
          key={report.id}
          id={report.id}
          imageUrl={report.imageUrl ?? null}
          address={report.title ?? report.address ?? "Laporan tanpa judul"}
          distanceLabel={`${report.user.name ?? "Anonim"} · ${formatRelative(report.reportedAt)}`}
          friScore={report.floodRiskScore}
          riskCategory={report.categoryLevel ?? undefined}
          className="w-64 h-56 shrink-0 rounded-2xl"
        />
      ))}
    </div>
  );
}
