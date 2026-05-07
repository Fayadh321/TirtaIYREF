"use client";

import {
  ArrowRight,
  ChevronLeft,
  Info,
  Layers,
  Loader2,
  MapPin,
  ShieldAlert,
  Trash2,
  TreePine,
  Waves,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ResultData {
  id: string;
  address: string;
  title: string;
  description: string | null;
  photos: string[];
  uploadedBy: string;
  uploadedAt: string;
  coordinates: { lat: number; lng: number } | null;
  analysis: {
    score: number;
    category: "TINGGI" | "SEDANG" | "RENDAH" | "UNKNOWN";
    riskLevel:
      | "SANGAT_RAWAN"
      | "RAWAN"
      | "CUKUP_RAWAN"
      | "TIDAK_RAWAN"
      | "UNKNOWN";
    textAnalysis: string;
    visualizedUrl?: string | null;
    aiMetrics?: {
      ai_metrics: {
        vegetation_ratio: number;
        soil_ratio: number;
        impervious_ratio: number;
        building_ratio: number;
      };
      photo_score: number;
      zone_score: number;
      form_score: number;
    } | null;
  };
  details: {
    drainage: string;
    garbage: string;
    road: string;
    vegetation: string | null;
  };
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; pill: string; scoreColor: string; arc: string }
> = {
  TINGGI: {
    label: "TINGGI",
    pill: "bg-red-500 text-white",
    scoreColor: "text-red-500",
    arc: "text-red-500",
  },
  SEDANG: {
    label: "SEDANG",
    pill: "bg-amber-500 text-white",
    scoreColor: "text-amber-500",
    arc: "text-amber-500",
  },
  RENDAH: {
    label: "RENDAH",
    pill: "bg-brand text-white",
    scoreColor: "text-brand",
    arc: "text-brand",
  },
  UNKNOWN: {
    label: "UNKNOWN",
    pill: "bg-slate-400 text-white",
    scoreColor: "text-slate-400",
    arc: "text-slate-400",
  },
};

const ZONE_LABEL: Record<string, { label: string; pill: string }> = {
  SANGAT_RAWAN: { label: "SANGAT RAWAN", pill: "bg-red-500 text-white" },
  RAWAN: { label: "RAWAN", pill: "bg-red-500 text-white" },
  CUKUP_RAWAN: { label: "CUKUP RAWAN", pill: "bg-amber-500 text-white" },
  TIDAK_RAWAN: { label: "TIDAK RAWAN", pill: "bg-brand text-white" },
  UNKNOWN: { label: "UNKNOWN", pill: "bg-slate-400 text-white" },
};

type VisualMetricKind = "drainage" | "garbage" | "road" | "vegetation";

const METRIC_COLOR_BY_KIND: Record<VisualMetricKind, Record<string, string>> = {
  drainage: {
    TIDAK_ADA: "text-red-500",
    BURUK: "text-red-500",
    SEDANG: "text-amber-500",
    BAIK: "text-brand",
  },
  garbage: {
    BANYAK: "text-red-500",
    SEDANG: "text-amber-500",
    RINGAN: "text-amber-500",
    TIDAK_ADA: "text-brand",
  },
  road: {
    ASPAL: "text-slate-700",
    BETON: "text-slate-700",
    PAVING: "text-slate-700",
    TANAH: "text-slate-700",
    LAINNYA: "text-slate-700",
  },
  vegetation: {
    TIDAK_ADA: "text-red-500",
    RINGAN: "text-amber-500",
    SEDANG: "text-amber-500",
    BANYAK: "text-brand",
  },
};

function formatCoords(lat: number, lng: number): string {
  const fmt = (v: number, pos: string, neg: string) => {
    const abs = Math.abs(v);
    const deg = Math.floor(abs);
    const min = Math.floor((abs % 1) * 60);
    const sec = (((abs * 60) % 1) * 60).toFixed(3);
    return `${deg}° ${min}' ${sec}" ${v < 0 ? neg : pos}`;
  };
  return `${fmt(lat, "N", "S")}  ${fmt(lng, "E", "W")}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time}, ${date}`;
}

function pct(ratio: number) {
  return `${((ratio || 0) * 100).toFixed(1)}%`;
}

function RiskPill({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-4 py-1.5 font-semibold text-xs",
        className,
      )}
    >
      {label}
    </span>
  );
}

function VisualMetricRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  kind,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  kind: VisualMetricKind;
}) {
  const valueColor = METRIC_COLOR_BY_KIND[kind]?.[value] ?? "text-slate-700";
  const valueText = value ? value.replace("_", " ").toUpperCase() : "—";
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
          iconBg,
        )}
      >
        <Icon size={18} className={iconColor} />
      </div>
      <p className="flex-1 text-sm font-semibold text-slate-800">{label}</p>
      <p className={cn("text-sm font-semibold", valueColor)}>{valueText}</p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">{label}</span>
        <span className="text-xs font-semibold">{Math.round(value)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand transition-all duration-700"
          style={{ width: `${Math.round(value)}%` }}
        />
      </div>
    </div>
  );
}

function ReportResultsContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setError("ID Laporan tidak ditemukan");
      setLoading(false);
      return;
    }
    (async () => {
      await new Promise((r) => setTimeout(r, 1800));
      try {
        const res = await fetch(`/api/report/results?reportId=${reportId}`);
        if (!res.ok) throw new Error("Gagal mengambil hasil analisis");
        setData(await res.json());
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Gagal mengambil hasil analisis",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  const handlePublish = async () => {
    if (!reportId) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/report/manage?reportId=${reportId}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Gagal menerbitkan laporan");
      router.push(`/report/${reportId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!reportId || !confirm("Hapus laporan ini secara permanen?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/report/manage?reportId=${reportId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus laporan");
      router.push("/home");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsDeleting(false);
    }
  };

  // loading state
  if (loading) {
    return null;
  }

  // error state
  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-8 text-center">
        <h2 className="text-lg font-semibold">Terjadi Kesalahan</h2>
        <p className="mt-2 text-sm text-slate-400">
          {error || "Data tidak tersedia"}
        </p>
      </div>
    );
  }

  const cat =
    CATEGORY_CONFIG[data.analysis.category] ?? CATEGORY_CONFIG.UNKNOWN;
  const zone = ZONE_LABEL[data.analysis.riskLevel] ?? ZONE_LABEL.UNKNOWN;
  const CIRC = 339.3;
  const arcLen = (data.analysis.score / 100) * CIRC;
  const hasMetrics = !!data.analysis.aiMetrics?.ai_metrics;
  const hasBreakdown = !!data.analysis.aiMetrics;
  const segmentationUrl = data.analysis.visualizedUrl ?? null;

  return (
    <div className="min-h-screen bg-white pb-36">
      <div className="relative flex items-center justify-between px-5 pt-12 pb-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-900">Hasil Laporan</h1>
            <p className="text-xs text-slate-400">
              Hasil Analisis Laporan Akhir
            </p>
          </div>
        </div>

        <div className="absolute right-5 flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1">
          <ShieldAlert size={11} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">Draft</span>
        </div>
      </div>

      <div className="px-5 space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
            <MapPin size={18} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {data.address}
            </p>
            {data.coordinates && (
              <p className="mt-0.5 text-[10px] text-slate-400 font-medium">
                {formatCoords(data.coordinates.lat, data.coordinates.lng)}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Diunggah oleh{" "}
          <span className="font-bold text-slate-700">{data.uploadedBy}</span> |{" "}
          {formatDateTime(data.uploadedAt)}
        </p>

        <div className="flex items-start gap-3 rounded-lg bg-slate-100 px-4 py-3">
          <Info size={15} className="text-slate-500 shrink-0 mt-1" />
          <p className="text-xs font-semibold text-slate-500">
            Laporan ini masih berstatus{" "}
            <span className="font-semibold">Draft</span> dan belum terlihat di
            peta publik. Terbitkan agar dapat dipantau komunitas.
          </p>
        </div>

        <div className="relative w-full overflow-hidden rounded-lg bg-slate-200 aspect-4/3">
          {data.photos?.[activePhoto] ? (
            <Image
              src={data.photos[activePhoto]}
              alt="Foto Laporan"
              fill
              priority
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Info size={36} className="text-slate-300" />
            </div>
          )}
        </div>

        {data.photos?.length > 1 && (
          <div className="flex gap-2.5">
            {data.photos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setActivePhoto(i)}
                className={cn(
                  "relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl transition-all",
                  activePhoto === i
                    ? "ring-2 ring-brand ring-offset-2"
                    : "opacity-55 hover:opacity-80",
                )}
              >
                <Image
                  src={url}
                  alt={`foto-${i}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              Tingkat Risiko
            </p>
            <RiskPill className={cat.pill} label={cat.label} />
          </div>

          <div className="flex items-center justify-center py-2">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 120 120"
                aria-label="Flood Risk Score Chart"
                role="img"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${arcLen} ${CIRC}`}
                  className={cat.arc}
                />
              </svg>
              <div className="text-center">
                <p
                  className={cn(
                    "text-4xl font-semibold leading-none",
                    cat.scoreColor,
                  )}
                >
                  {Math.round(data.analysis.score)}
                </p>
                <p className="mt-1 font-bold text-xs text-slate-400">
                  FRI Score
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-bold text-slate-900">Analisis Risiko:</p>
            <p className="text-xs leading-relaxed text-slate-500">
              {data.analysis.textAnalysis}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-800">Zona</p>
            <RiskPill className={zone.pill} label={zone.label} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700 px-1">
            Penilaian Visual
          </p>
          <div className="rounded-lg border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100">
            <VisualMetricRow
              icon={Waves}
              iconBg="border-brand/30 bg-brand/10"
              iconColor="text-brand"
              label="Kualitas Drainase"
              value={data.details.drainage}
              kind="drainage"
            />
            <VisualMetricRow
              icon={TreePine}
              iconBg="border-brand/30 bg-brand/10"
              iconColor="text-brand"
              label="Area Hijau"
              value={data.details.vegetation ?? "—"}
              kind="vegetation"
            />
            <VisualMetricRow
              icon={Trash2}
              iconBg="border-red-200 bg-red-50"
              iconColor="text-red-500"
              label="Intensitas Sampah"
              value={data.details.garbage}
              kind="garbage"
            />
            <VisualMetricRow
              icon={Layers}
              iconBg="border-red-200 bg-red-50"
              iconColor="text-red-500"
              label="Jenis Jalan"
              value={data.details.road}
              kind="road"
            />
          </div>
        </div>

        {hasBreakdown && (
          <div className="overflow-hidden rounded-lg">
            <div className="px-5 py-5 space-y-3.5">
              <ScoreBar
                label="Skor Foto (AI)"
                value={data.analysis.aiMetrics?.photo_score ?? 0}
              />
              <ScoreBar
                label="Skor Zona"
                value={data.analysis.aiMetrics?.zone_score ?? 0}
              />
              <ScoreBar
                label="Skor Form"
                value={data.analysis.aiMetrics?.form_score ?? 0}
              />
            </div>

            {hasMetrics && (
              <div className="border-t border-white/5 px-5 pb-5 pt-4">
                <p className="mb-4 font-semibold text-xs">Deteksi Visual</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    {
                      label: "Vegetasi",
                      value: pct(
                        data.analysis.aiMetrics?.ai_metrics.vegetation_ratio ??
                          0,
                      ),
                      unit: "area",
                      cls: "text-green-500",
                    },
                    {
                      label: "Area Resapan",
                      value: pct(
                        data.analysis.aiMetrics?.ai_metrics.impervious_ratio ??
                          0,
                      ),
                      unit: "area",
                      cls: "text-orange-700",
                    },
                    {
                      label: "Permukaan Kedap Air",
                      value: pct(
                        data.analysis.aiMetrics?.ai_metrics.vegetation_ratio ??
                          0,
                      ),
                      unit: "area",
                      cls: "text-amber-500",
                    },
                    {
                      label: "Kepadatan Bangunan",
                      value: pct(
                        data.analysis.aiMetrics?.ai_metrics.building_ratio ?? 0,
                      ),
                      unit: "area",
                      cls: "text-red-500",
                    },
                  ].map((m) => (
                    <div key={m.label} className="flex flex-col gap-1">
                      <span className="font-bold text-xs text-slate-400 uppercase tracking-tight">
                        {m.label}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={cn(
                            "text-base font-black leading-none",
                            m.cls,
                          )}
                        >
                          {m.value}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300">
                          ratio
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {segmentationUrl && (
          <div className="space-y-3 pb-2">
            <p className="text-sm font-semibold text-slate-700 px-1">
              Hasil Segmentasi
            </p>
            <div className="relative w-full overflow-hidden rounded-lg bg-slate-200 aspect-4/3">
              <Image
                src={segmentationUrl}
                alt="Hasil Segmentasi"
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-slate-100 px-5 py-4 z-50">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isPublishing}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand py-2 font-semibold text-sm text-white disabled:opacity-50"
          >
            {isPublishing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Publikasikan
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      }
    >
      <ReportResultsContent />
    </Suspense>
  );
}
