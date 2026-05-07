import Image from "next/image";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-700 px-8 py-16 text-white">
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="flex items-center justify-center">
          <Image
            src="/tirta-putih.svg"
            alt="Tirta Logo"
            width={72}
            height={72}
            priority
            className="h-16 w-16 object-contain"
          />
        </div>

        <p className="mt-2 text-3xl font-semibold tracking-tight ">
          Tirta
        </p>

        <h1 className="mt-5 text-2xl font-semibold ">
          Every story keeps
          <br />
          a community safe
        </h1>

        <p className="mt-4 max-w-xs text-sm">
          Report, monitor, and share flood conditions with clarity for safer and more connected communities.
        </p>

        <a
          href="/auth/login"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-semibold text-brand-700 transition-all hover:scale-[0.98]"
        >
          Get Started
        </a>
      </div>

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
    </main>
  );
}
