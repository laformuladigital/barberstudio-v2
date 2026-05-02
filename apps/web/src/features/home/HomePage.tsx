import { ArrowRight, CalendarDays, Scissors, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { useSessionContext } from "../../app/providers/SessionProvider";

const highlights: Array<[string, string, LucideIcon]> = [
  ["Reserva publica", "Clientes reservan sin crear cuenta obligatoria.", CalendarDays],
  ["Agenda por barbero", "Cada profesional ve y opera su propio dia.", Scissors],
  ["CRM operativo", "Admin controla citas, clientes, bloqueos y servicios.", Shield],
];

export default function HomePage() {
  const { role } = useSessionContext();
  const canSeeAdmin = role === "admin";
  const canSeeBarber = role === "admin" || role === "barbero";

  return (
    <main className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Barber Studio v2</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight md:text-7xl">
            Reservas claras para barberias que necesitan operar sin cruces.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-smoke/70">
            Agenda en tiempo real, panel de barberos, control administrativo y una base lista para crecer sobre
            barberappstudio.com.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/reservar" className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 font-medium text-ink">
              <CalendarDays className="h-4 w-4" />
              Reservar ahora
            </Link>
            {canSeeAdmin ? (
              <Link to="/admin" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-3 font-medium text-smoke hover:bg-white/10">
                Panel admin
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {!canSeeAdmin && canSeeBarber ? (
              <Link to="/barbero" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-3 font-medium text-smoke hover:bg-white/10">
                Mi agenda
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          {highlights.map(([title, text, Icon]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <Icon className="h-5 w-5 text-gold" />
              <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-smoke/65">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
