"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, MapPin, Clock } from "lucide-react";

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="md:absolute md:bottom-0 md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:px-5 md:pb-5 fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 px-5 pb-5">
      <div className="relative flex items-end justify-between rounded-3xl bg-white px-7 py-4 shadow-lg">
        <button
          className={"cursor-pointer" +
            pathname === "/home"
              ? "flex flex-col items-center gap-2 text-brand-600 hover:bg-brand-600/80"
              : "flex flex-col items-center gap-2 text-slate-500 hover:bg-slate-50"
          }
          onClick={() => router.push("/home")}
        >
          <Home size={20} />
          <span className="text-[11px] font-semibold">Home</span>
        </button>

        <button
          className={"cursor-pointer " +
            pathname === "/map"
              ? "relative -mt-10 flex flex-col items-center gap-2 text-brand-600 hover:bg-brand-600/80"
              : "relative -mt-10 flex flex-col items-center gap-2 text-slate-500 hover:bg-slate-50"
          }
          onClick={() => router.push("/map")}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-8 ring-white">
            <MapPin size={22} />
          </span>
          <span className="text-[11px] font-semibold">Map</span>
        </button>

        <button
          className={"cursor-pointer " +
            pathname === "/history"
              ? "flex flex-col items-center gap-2 text-brand-600 hover:bg-brand-600/80"
              : "flex flex-col items-center gap-2 text-slate-500 hover:bg-slate-50"
          }
          onClick={() => router.push("/history")}
        >
          <Clock size={20} />
          <span className="text-[11px] font-semibold">History</span>
        </button>
      </div>
    </nav>
  );
}
