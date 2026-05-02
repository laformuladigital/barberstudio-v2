import { CalendarDays, Home, LogIn, Scissors, Shield, UserRound } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useSessionContext } from "../providers/SessionProvider";
import type { AppRole } from "../../lib/types";

const publicNavItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/reservar", label: "Reservar", icon: CalendarDays },
];

function getPrivateNavItems(role: AppRole | null) {
  if (!role) return [];

  const items = [{ to: "/cliente", label: "Mi cuenta", icon: UserRound }];

  if (role === "barbero" || role === "admin") {
    items.push({ to: "/barbero", label: "Agenda", icon: Scissors });
  }

  if (role === "admin") {
    items.push({ to: "/admin", label: "Admin", icon: Shield });
  }

  return items;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useSessionContext();
  const privateNavItems = getPrivateNavItems(role);
  const navItems = [...publicNavItems, ...privateNavItems];

  return (
    <div className="min-h-screen bg-ink text-smoke">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 bg-gold/10">
              <Scissors className="h-5 w-5 text-gold" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">Barber Studio</p>
              <p className="text-xs text-smoke/60">barberappstudio.com</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Navegacion principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${
                    isActive ? "bg-gold text-ink" : "bg-white/5 text-smoke/80 hover:bg-white/10"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user && role ? (
              <span className="hidden rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-smoke/55 md:inline">
                {role}
              </span>
            ) : null}
            {user ? (
              <button className="rounded-full bg-white/5 px-4 py-2 text-sm text-smoke/85 hover:bg-white/10" onClick={() => void signOut()}>
                Salir
              </button>
            ) : (
              <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-smoke/85 hover:bg-white/10">
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
