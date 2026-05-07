"use client";

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForecastToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

export function ForecastToggleButton({
  isActive,
  onClick,
  isLoading,
}: ForecastToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition-all active:scale-95",
        isActive
          ? "bg-brand-600 text-white"
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
        isLoading && "opacity-70 cursor-not-allowed",
      )}
    >
      <Activity size={20} className={cn(isLoading && "animate-pulse")} />
    </button>
  );
}
