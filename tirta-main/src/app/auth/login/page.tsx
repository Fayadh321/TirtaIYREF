"use client";

import { Loader, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.push("/home");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");

    try {
      await loginWithGoogle();
      router.push("/home");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="mx-auto w-full max-w-md px-5">
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center">
            <Image
              src="/tirta.svg"
              alt="Tirta Logo"
              width={72}
              height={72}
              priority
              className="h-16 w-16 object-contain"
            />
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-brand-700">Tirta</h1>
          <p className="mt-4 text-xl font-semibold text-brand-700">
            {isLogin ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-3 text-slate-400"
                size={20}
              />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 pl-10 pr-4 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 shadow-sm"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-3 text-slate-400"
                size={20}
              />
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 pl-10 pr-4 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 shadow-sm"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-brand text-white hover:bg-brand-600 disabled:bg-brand-100"
          >
            {loading && <Loader size={18} className="animate-spin" />}
            {isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-wide text-slate-400">
            or
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          variant="outline"
          className="h-12 w-full rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
        >
          {loading ? (
            <Loader size={18} className="animate-spin" />
          ) : (
            <FcGoogle className="h-4 w-4" />
          )}
          Continue with Google
        </Button>

        <div className="mt-8 text-center">
          <p className="text-slate-600 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="p-0 text-brand-600 font-semibold hover:text-brand-700 cursor-pointer"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
