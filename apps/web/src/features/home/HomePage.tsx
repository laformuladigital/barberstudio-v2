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
      <section className="glass-panel relative grid min-h-[calc(100vh-9.5rem)] place-items-center overflow-hidden rounded-[2rem] px-6 py-12 text-center shadow-[0_30px_90px_rgba(0,0,0,0.62)] lg:rounded-[2.5rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.18),transparent_16rem),radial-gradient(circle_at_50%_72%,rgba(255,255,255,0.07),transparent_18rem),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_42%,rgba(255,255,255,0.045))]" />
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="absolute bottom-8 left-1/2 h-px w-44 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent" />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
          <img className="h-auto w-48 object-contain opacity-95 drop-shadow-[0_0_36px_rgba(255,255,255,0.16)] sm:w-60 md:w-72" src="/logo-barberstudio-blanco.png" alt="BarberStudio" />

          <p className="mt-8 text-xs uppercase tracking-[0.42em] text-white/52 md:text-sm">Precision. Style. Presence.</p>
          <h1 className="mt-5 font-display text-5xl font-semibold uppercase leading-[0.9] tracking-[0.07em] silver-text sm:text-6xl md:text-8xl">
            Barber Studio
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-smoke/62 md:text-base">
            Reserva tu experiencia o entra a tu panel con una interfaz limpia, privada y directa.
          </p>

          <Link
            to={entryPath}
            className="glass-button group mt-10 inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-4 rounded-full px-7 py-4 text-sm font-semibold uppercase tracking-[0.24em] md:w-auto md:min-w-80"
          >
            <LogIn className="h-5 w-5" />
            Ingresar
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </main>
  );
}
