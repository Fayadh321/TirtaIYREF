"use client";

import { AuthProvider } from "@/lib/auth-context";
import { PWAProvider } from "./pwa-provider";

export function LayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <PWAProvider />
      <div className="min-h-screen bg-white md:flex md:items-center md:justify-center md:py-8">
        <div className="w-full md:max-w-md md:rounded-[32px] md:border md:border-slate-200 md:shadow-lg md:overflow-hidden md:relative">
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}
