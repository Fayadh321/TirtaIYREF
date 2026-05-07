"use client";

import { X } from "lucide-react";
import { MapClusterOverlayCards } from "./map-cluster-overlay-cards";
import { ZoneRiskBadge } from "./zone-risk-badge";

interface MapBottomSheetProps {
  selectedCluster: {
    address: string | null;
    clusterCount: number;
    floodRiskScore: number;
    riskLevel: string;
    categoryLevel: "TINGGI" | "SEDANG" | "RENDAH" | null;
  };
  clusterReports: Array<{
    id: string;
    title: string | null;
    address: string | null;
    reportedAt: string;
    imageUrl?: string | null;
    floodRiskScore: number;
    categoryLevel: "TINGGI" | "SEDANG" | "RENDAH" | null;
    user: { name: string | null };
  }>;
  sheetLoading: boolean;
  onClose: () => void;
  formatRelative: (date: string) => string;
  getScoreColor: (score: number, category: string | null) => string;
}

export function MapBottomSheet({
  selectedCluster,
  clusterReports,
  sheetLoading,
  onClose,
  formatRelative,
  getScoreColor,
}: MapBottomSheetProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Tutup detail cluster"
        onClick={onClose}
        className="absolute inset-0 z-40 bg-black/35"
      />

      <div className="absolute inset-x-0 bottom-0 z-50 h-[52dvh] rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {selectedCluster.clusterCount > 1
                ? `${selectedCluster.clusterCount} laporan dalam radius 100m`
                : "Detail laporan"}
            </p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5 max-w-60 truncate">
              {selectedCluster.address ?? "Lokasi tidak diketahui"}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <ZoneRiskBadge level={selectedCluster.riskLevel} />
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                style={{
                  background: getScoreColor(
                    selectedCluster.floodRiskScore,
                    selectedCluster.categoryLevel,
                  ),
                }}
              >
                {Math.round(selectedCluster.floodRiskScore)} FRI
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="h-[calc(72dvh-96px)] overflow-y-auto px-5 py-4">
          <MapClusterOverlayCards
            reports={clusterReports}
            sheetLoading={sheetLoading}
            formatRelative={formatRelative}
          />
        </div>
      </div>
    </>
  );
}
