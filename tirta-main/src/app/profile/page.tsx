"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

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
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-md px-6 pt-8">
        <Button
          className="bg-transparent items-center text-md hover:bg-slate-50 font-semibold text-brand-600"
          onClick={() => router.back()}
        >
          <ChevronLeft size={16} />
          Back
        </Button>

        <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your account information
          </p>

          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Email
              </p>
              <p className="mt-1 font-semibold text-slate-900">{user.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                User ID
              </p>
              <p className="mt-1 text-slate-600">{user.uid}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Joined
              </p>
              <p className="mt-1 text-slate-600">
                {user.metadata?.creationTime}
              </p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            className="mt-6 w-full rounded-xl bg-brand h-12 py-4 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
