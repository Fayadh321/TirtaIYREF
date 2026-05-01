export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-8 py-16 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <p className="text-4xl font-semibold tracking-tight">Tirta</p>
        <h1 className="mt-6 text-2xl font-semibold leading-snug">
          Every story keeps a community safe
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Report, track, and share flood updates with clarity and care.
        </p>
        <a
          href="/auth/login"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-brand px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/80 hover:shadow-sm"
        >
          Get started
        </a>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-tl-[160px] bg-linear-to-tr from-sky-200 via-sky-100 to-transparent sm:h-64 sm:w-64" />
    </main>
  );
}
