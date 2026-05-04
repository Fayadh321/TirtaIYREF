"use client";

import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { useAuth } from "@/lib/auth-context";

export default function MapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <header className="px-5 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Map</h1>
              <p className="mt-1 text-sm text-slate-500">
                Flood map and safe routes will appear here.
              </p>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
              onClick={() => router.push("/profile")}
            >
              <Home size={16} className="text-slate-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 pt-6 pb-24">
          <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white text-sm text-slate-400">
            Map placeholder
          </div>
        </main>

        <AppBottomNav />
      </div>
    </div>
  );
}
