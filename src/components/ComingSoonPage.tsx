interface ComingSoonPageProps {
  title: string;
  subtitle: string;
}

export function ComingSoonPage({ title, subtitle }: ComingSoonPageProps) {
  return (
    <main className="bg-app px-4 py-4 text-slate-100 sm:px-8 sm:py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-3xl border border-cyan-400/25 bg-slate-950/65 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
          TM AI Studio
        </p>

        <h1 className="text-2xl font-semibold text-slate-100 md:text-4xl">
          {title}
        </h1>

        <p className="max-w-2xl text-sm text-slate-300 md:text-base">
          {subtitle}
        </p>

        <div className="mt-4 rounded-2xl border border-dashed border-cyan-400/30 bg-slate-900/75 p-8 text-center md:p-12">
          <p className="text-lg font-semibold tracking-[0.08em] text-cyan-100 md:text-2xl">
            Coming soon
          </p>
        </div>
      </section>
    </main>
  );
}
