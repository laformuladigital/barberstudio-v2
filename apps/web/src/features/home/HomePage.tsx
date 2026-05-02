import { ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useSessionContext } from "../../app/providers/SessionProvider";

function entryPathForRole(role: string | null) {
  if (role === "admin") return "/admin";
  if (role === "barbero") return "/barbero";
  if (role === "cliente") return "/cliente";
  return "/login";
}

export default function HomePage() {
  const { role } = useSessionContext();
  const entryPath = entryPathForRole(role);

  return (
    <main>
      <section className="relative min-h-[calc(100vh-9.5rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.62)] lg:rounded-[2.5rem]">
        <picture>
          <source media="(min-width: 768px)" srcSet="/home-horizontal-clean.png" />
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src="/home-vertical-clean.png"
            alt="Barber Studio luxury experience"
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.30),rgba(0,0,0,0.10)_38%,rgba(0,0,0,0.78)),radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.10),transparent_18rem)] md:bg-[linear-gradient(90deg,rgba(0,0,0,0.88),rgba(0,0,0,0.55)_36%,rgba(0,0,0,0.06)),radial-gradient(circle_at_28%_34%,rgba(255,255,255,0.10),transparent_20rem)]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/65 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 to-transparent" />

        <div className="relative z-10 flex min-h-[calc(100vh-9.5rem)] flex-col items-center justify-between px-6 py-8 text-center md:items-start md:px-14 md:py-12 md:text-left lg:px-20">
          <img className="h-auto w-36 object-contain opacity-95 md:w-44" src="/logo-barberstudio-blanco.png" alt="BarberStudio" />

          <div className="mx-auto flex w-full max-w-3xl flex-col items-center md:mx-0 md:items-start">
            <p className="text-xs uppercase tracking-[0.42em] text-white/64 md:text-sm">Precision. Style. Presence.</p>
            <h1 className="mt-5 max-w-[12ch] font-display text-5xl font-semibold uppercase leading-[0.92] tracking-[0.06em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] sm:text-6xl md:text-7xl lg:text-8xl">
              Barber Studio
            </h1>
            <div className="mt-6 h-px w-44 bg-gradient-to-r from-transparent via-white/65 to-transparent md:w-56 md:bg-gradient-to-r md:from-white/70 md:via-white/25 md:to-transparent" />
          </div>

          <div className="flex w-full justify-center md:justify-start">
            <Link
              to={entryPath}
              className="glass-button group inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-4 rounded-none px-7 py-4 text-sm font-semibold uppercase tracking-[0.28em] md:w-auto md:min-w-80"
            >
              <LogIn className="h-5 w-5" />
              Ingresar
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
