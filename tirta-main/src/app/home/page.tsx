"use client";

import { SlidersHorizontal, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
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
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <header className="px-5 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Location
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                Your Area
              </p>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
              onClick={() => router.push("/profile")}
            >
              <User size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search updates near you"
                className="h-12 rounded-2xl bg-white pl-4 pr-10 text-sm shadow-sm"
              />
            </div>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-sm"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 pb-24 pt-6">
          <section className="rounded-3xl bg-white px-6 py-8 text-center shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              No reports yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Start tracking your area and share updates with the community.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create report
            </button>
          </section>
        </main>

        <AppBottomNav />
      </div>
    </div>
  );
}
