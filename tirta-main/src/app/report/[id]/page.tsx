"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Droplets,
  Info,
  Layers,
  Lightbulb,
  MapPin,
  Share2,
  Trash2,
  TreePine,
  Waves,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ReportDetail {
  id: string;
  title: string;
  address: string;
  coordinates: { lat: number; lng: number } | null;
  uploadedBy: string;
  uploadedAt: string;
  photos: string[];
  analysis: {
    score: number;
    category: "TINGGI" | "SEDANG" | "RENDAH" | "UNKNOWN";
    riskLevel:
      | "SANGAT_RAWAN"
      | "RAWAN"
      | "CUKUP_RAWAN"
      | "TIDAK_RAWAN"
      | "UNKNOWN";
    recommendation: string | null;
    aiMetrics?: {
      drainage_quality: string;
      vegetation_density: string;
      garbage_intensity: string;
      soil_absorption: string;
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

const METRIC_VALUE_COLOR: Record<string, string> = {
  RENDAH: "text-red-500",
  RINGAN: "text-red-500",
  BURUK: "text-red-500",
  SEDANG: "text-amber-500",
  TINGGI: "text-red-500",
  BANYAK: "text-red-500",
  BAIK: "text-brand",
  TIDAK_ADA: "text-slate-400",
};

function formatCoords(lat: number, lng: number): string {
  const latDeg = Math.abs(Math.floor(lat));
  const latMin = Math.abs(Math.floor((lat % 1) * 60));
  const latSec = Math.abs(((lat * 60) % 1) * 60).toFixed(3);
  const latDir = lat < 0 ? "S" : "N";
  const lngDeg = Math.abs(Math.floor(lng));
  const lngMin = Math.abs(Math.floor((lng % 1) * 60));
  const lngSec = Math.abs(((lng * 60) % 1) * 60).toFixed(3);
  const lngDir = lng > 0 ? "E" : "W";
  return `${latDeg}° ${latMin}' ${latSec}" ${latDir}  ${lngDeg}° ${lngMin}' ${lngSec}" ${lngDir}`;
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

function RiskPill({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wide",
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
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  const valueColor = METRIC_VALUE_COLOR[value] ?? "text-slate-700";
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3.5">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
          iconBg,
        )}
      >
        <Icon size={18} className={iconColor} />
      </div>
      <p className="flex-1 text-sm font-semibold text-slate-800">{label}</p>
      <p className={cn("text-sm font-black uppercase", valueColor)}>{value}</p>
    </div>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/report/results?reportId=${id}`);
        if (!res.ok) throw new Error("Gagal mengambil detail laporan");
        setData(await res.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-brand animate-spin" />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Memuat...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h2 className="text-lg font-black text-slate-900">
          Laporan Tidak Ditemukan
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Laporan mungkin telah dihapus atau ID tidak valid.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-8 rounded-2xl bg-slate-900 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-all"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const cat =
    CATEGORY_CONFIG[data.analysis.category] ?? CATEGORY_CONFIG.UNKNOWN;
  const zone = ZONE_LABEL[data.analysis.riskLevel] ?? ZONE_LABEL.UNKNOWN;
  const photos = data.photos ?? [];
  const CIRC = 339.3;
  const arcLen = (data.analysis.score / 100) * CIRC;

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="flex items-center justify-center px-5 pt-12 pb-4 relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-5 flex h-9 w-9 items-center justify-center text-brand active:scale-90 transition-all"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-base font-bold text-brand">Hasil Laporan</h1>
      </div>

      <div className="px-5 space-y-5">
        {/* ---------------------------------------------------------------- */}
        {/* location header                                                  */}
        {/* ---------------------------------------------------------------- */}
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

        {/* uploader meta */}
        <p className="text-xs text-slate-400">
          Diunggah oleh{" "}
          <span className="font-bold text-slate-700">{data.uploadedBy}</span> |{" "}
          {formatDateTime(data.uploadedAt)}
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* main photo                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="relative w-full overflow-hidden rounded-3xl bg-slate-200 aspect-[4/3]">
          {photos[activePhoto] ? (
            <Image
              src={photos[activePhoto]}
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

        {/* photo thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-2.5">
            {photos.map((url, i) => (
              <button
                key={url ?? i}
                type="button"
                onClick={() => setActivePhoto(i)}
                className={cn(
                  "relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl transition-all",
                  activePhoto === i
                    ? "ring-2 ring-brand ring-offset-2"
                    : "opacity-60 hover:opacity-80",
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

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
          {/* tingkat risiko row */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              Tingkat Risiko
            </p>
            <RiskPill className={cat.pill} label={cat.label} />
          </div>

          {/* score circle */}
          <div className="flex items-center justify-center py-2">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 120 120"
                aria-label="Flood Risk Score Chart"
                role="img"
              >
                {/* track */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                />
                {/* arc */}
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
                    "text-4xl font-black leading-none",
                    cat.scoreColor,
                  )}
                >
                  {Math.round(data.analysis.score)}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  FRI Score
                </p>
              </div>
            </div>
          </div>

          {/* analisis risiko */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-900">Analisis Risiko:</p>
            <p className="text-xs leading-relaxed text-slate-500">
              {data.analysis.recommendation ??
                "Berdasarkan analisis visual dan data lingkungan, area ini menunjukkan potensi risiko banjir yang perlu diperhatikan."}
            </p>
          </div>

          {/* zona row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-800">Zona</p>
            <RiskPill className={zone.pill} label={zone.label} />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* penilaian visual                                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700 px-1">
            Penilaian Visual
          </p>

          <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100">
            <VisualMetricRow
              icon={Waves}
              iconBg="border-red-200 bg-red-50"
              iconColor="text-red-500"
              label="Kualitas Drainase"
              value={data.details.drainage}
            />
            <VisualMetricRow
              icon={TreePine}
              iconBg="border-brand/30 bg-brand/10"
              iconColor="text-brand"
              label="Elemen Vegetasi"
              value={data.details.vegetation ?? "—"}
            />
            <VisualMetricRow
              icon={Trash2}
              iconBg="border-red-200 bg-red-50"
              iconColor="text-red-500"
              label="Intensitas Sampah"
              value={data.details.garbage}
            />
            <VisualMetricRow
              icon={Layers}
              iconBg="border-red-200 bg-red-50"
              iconColor="text-red-500"
              label="Daya Serap Tanah"
              value={data.details.road}
            />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* saran aksi                                                       */}
        {/* ---------------------------------------------------------------- */}
        {data.analysis.recommendation && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 px-1">
              Saran Aksi
            </p>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 space-y-3">
              {/* header rekomendasi */}
              <div className="flex items-center gap-2">
                <Lightbulb size={15} className="text-brand shrink-0" />
                <p className="text-[11px] font-black uppercase tracking-widest text-brand">
                  Rekomendasi Strategis
                </p>
              </div>

              {/* border left accent */}
              <div className="border-l-4 border-brand pl-4 space-y-2">
                <p className="text-sm leading-relaxed text-slate-700">
                  {data.analysis.recommendation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* share FAB                                                           */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="button"
        className="fixed bottom-8 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 active:scale-90 transition-all z-20"
      >
        <Share2 size={20} />
      </button>
    </div>
  );
}
