import { ArrowRight, CalendarDays, Clock3, Scissors, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { useSessionContext } from "../../app/providers/SessionProvider";

const highlights: Array<[string, string, LucideIcon]> = [
  ["Reserva precisa", "El cliente toma un cupo real, sin cruces ni doble agenda.", CalendarDays],
  ["Agenda clara", "Cada profesional opera su dia con estados y bloqueos.", Scissors],
  ["Control premium", "Admin gestiona servicios, accesos, barberos y operacion.", Shield],
];

export default function HomePage() {
  const { role } = useSessionContext();
  const canSeeAdmin = role === "admin";
  const canSeeBarber = role === "admin" || role === "barbero";

  return (
    <main className="space-y-8">
      <section className="glass-panel min-h-[calc(100vh-9.5rem)] rounded-[2rem] lg:rounded-[2.5rem]">
        <picture>
          <source media="(min-width: 768px)" srcSet="/home-horizontal.png" />
          <img
            className="absolute inset-0 h-full w-full object-cover opacity-75"
            src="/home-vertical.png"
            alt="Barber Studio luxury experience"
          />
        </picture>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.10),transparent_18rem),linear-gradient(90deg,rgba(0,0,0,0.88),rgba(0,0,0,0.56)_43%,rgba(0,0,0,0.20))] md:bg-[linear-gradient(90deg,rgba(0,0,0,0.92),rgba(0,0,0,0.64)_38%,rgba(0,0,0,0.12))]" />
        <div className="relative z-10 flex min-h-[calc(100vh-9.5rem)] flex-col justify-between p-6 md:p-12 lg:p-16">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.48em] text-silver/80">Precision. Style. Presence.</p>
            <h1 className="mt-8 font-display text-6xl font-semibold uppercase leading-[0.85] tracking-wide md:text-8xl lg:text-[8.5rem]">
              <span className="block text-white">Barber</span>
              <span className="block silver-text">Studio</span>
            </h1>
            <div className="mt-8 h-px w-56 bg-gradient-to-r from-transparent via-white/75 to-transparent" />
            <p className="mt-8 max-w-xl text-base leading-8 text-smoke/72 md:text-lg">
              Eleva cada corte a una experiencia premium. Reserva con claridad, agenda sin cruces y una operacion
              sobria para profesionales que cuidan cada detalle.
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid max-w-3xl gap-3 md:grid-cols-3">
              {highlights.map(([title, text, Icon]) => (
                <article key={title} className="rounded-3xl border border-white/14 bg-black/35 p-4 backdrop-blur-md">
                  <Icon className="h-4 w-4 text-silver" />
                  <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">{title}</h2>
                  <p className="mt-2 text-xs leading-5 text-smoke/58">{text}</p>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/reservar" className="glass-button inline-flex items-center justify-center gap-3 rounded-none px-7 py-4 text-sm font-semibold uppercase tracking-[0.25em] md:min-w-72">
                Reserva tu cita
                <ArrowRight className="h-5 w-5" />
              </Link>
              {canSeeAdmin ? (
                <Link to="/admin" className="glass-button inline-flex items-center justify-center gap-2 rounded-none px-5 py-4 text-sm uppercase tracking-[0.18em]">
                  Panel
                  <Shield className="h-4 w-4" />
                </Link>
              ) : null}
              {!canSeeAdmin && canSeeBarber ? (
                <Link to="/barbero" className="glass-button inline-flex items-center justify-center gap-2 rounded-none px-5 py-4 text-sm uppercase tracking-[0.18em]">
                  Agenda
                  <Clock3 className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
