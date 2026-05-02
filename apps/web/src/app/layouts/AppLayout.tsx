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
      <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 md:py-6">
        <header className="glass-panel mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] px-5 py-4 md:px-7">
          <Link to="/" className="flex items-center gap-3">
            <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_26px_rgba(255,255,255,0.10)]">
              <Scissors className="h-5 w-5 text-silver" />
            </span>
            <div className="relative z-10">
              <p className="font-display text-2xl font-semibold leading-none silver-text">Barber Studio</p>
              <p className="text-xs text-smoke/60">barberappstudio.com</p>
            </div>
          </Link>

          <nav className="relative z-10 flex flex-wrap items-center gap-2 text-sm" aria-label="Navegacion principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full px-4 py-2.5 transition ${
                    isActive ? "glass-button border-white/60 bg-white/15 text-white shadow-[0_0_22px_rgba(255,255,255,0.16)]" : "glass-button text-smoke/78"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="relative z-10 flex items-center gap-2">
            {user && role ? (
              <span className="hidden rounded-full border border-white/15 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.18em] text-smoke/55 md:inline">
                {role}
              </span>
            ) : null}
            {user ? (
              <button className="glass-button rounded-full px-4 py-2 text-sm" onClick={() => void signOut()}>
                Salir
              </button>
            ) : (
              <Link to="/login" className="glass-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
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
