import { Link } from "wouter";
import { ArrowLeft, Compass, Hexagon } from "lucide-react";

export default function NotFound() {
  return (
    <main className="gg-not-found min-h-[100dvh] flex items-center justify-center px-6 py-16">
      <div className="relative z-10 max-w-xl w-full text-center">
        <div className="gg-brand-symbol mx-auto !h-14 !w-14 !rounded-2xl">
          <Hexagon className="w-7 h-7" strokeWidth={1.5} />
        </div>
        <p className="mt-8 font-mono text-[11px] tracking-[.28em] uppercase text-[var(--gg-ice)]">
          GuardianGrid / Lost sector
        </p>
        <h1 className="mt-3 font-display text-[clamp(4.5rem,18vw,9rem)] leading-none font-semibold text-white tracking-tight">
          404
        </h1>
        <h2 className="mt-4 font-display text-2xl md:text-3xl text-white">Signal verloren.</h2>
        <p className="text-[var(--gg-muted)] text-sm md:text-base mt-4 max-w-sm mx-auto leading-relaxed">
          Dieser Bereich existiert nicht oder wurde verschoben. Dein Guardian ist sicher.
        </p>
        <div className="flex justify-center mt-8">
          <Link href="/" className="inline-flex items-center gap-3 py-3 px-6 bg-[var(--gg-ice-bright)] text-[#0a1422] rounded-xl font-semibold text-sm hover:bg-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Orbit
            <Compass className="w-4 h-4 opacity-60" />
          </Link>
        </div>
      </div>
    </main>
  );
}
