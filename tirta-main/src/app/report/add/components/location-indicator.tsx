import { MapPin } from "lucide-react";

interface LocationIndicatorProps {
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
}

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

export function LocationIndicator({
  latitude,
  longitude,
  address,
}: LocationIndicatorProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
        <MapPin size={18} className="text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 leading-snug">
          {address || "Mencari lokasi..."}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400 font-medium">
          {latitude !== null && longitude !== null
            ? formatCoords(latitude, longitude)
            : "0° 0' 0.000\" N  0° 0' 0.000\" E"}
        </p>
      </div>
    </div>
  );
}
