import { CalendarDays, Home, LogIn, LogOut, Scissors, Shield, UserRound } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  const { pathname } = useLocation();
  const privateNavItems = getPrivateNavItems(role);
  const navItems = [...publicNavItems, ...privateNavItems];
  const isBookingFlow = pathname === "/reservar";
  const isAuthPage = pathname === "/login" || pathname === "/reset-password";

  return (
    <div className="min-h-screen bg-ink text-smoke">
      <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className={`relative z-10 mx-auto ${isBookingFlow ? "max-w-none px-0 py-0" : "max-w-7xl px-4 pb-28 pt-4 md:py-6"}`}>
        {!isBookingFlow ? (
          <>
            <header className="glass-panel sticky top-3 z-40 mb-7 rounded-[1.65rem] px-4 py-3 md:px-5">
              <div className="relative z-10 flex items-center justify-between gap-3">
                <Link to="/" className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/25 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_22px_rgba(255,255,255,0.09)]">
                    <img className="h-8 w-8 object-contain" src="/logo-barberstudio-blanco.png" alt="" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl font-semibold leading-none silver-text md:text-2xl">Barber Studio</p>
                    <p className="truncate text-xs text-smoke/55">barberappstudio.com</p>
                  </div>
                </Link>

                <nav className="hidden items-center gap-2 text-sm md:flex" aria-label="Navegacion principal">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-2 rounded-full px-4 py-2.5 transition ${
                          isActive ? "bg-white text-ink shadow-[0_0_22px_rgba(255,255,255,0.16)]" : "glass-button text-smoke/78"
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
                    <span className="hidden rounded-full border border-white/15 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.18em] text-smoke/55 lg:inline">
                      {role}
                    </span>
                  ) : null}
                  {user ? (
                    <button className="glass-button inline-flex h-10 w-10 items-center justify-center rounded-full md:w-auto md:px-4" onClick={() => void signOut()} aria-label="Salir">
                      <LogOut className="h-4 w-4 md:hidden" />
                      <span className="hidden text-sm md:inline">Salir</span>
                    </button>
                  ) : (
                    <Link to="/login" className="glass-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                      <LogIn className="h-4 w-4" />
                      Entrar
                    </Link>
                  )}
                </div>
              </div>
            </header>

            {!isAuthPage ? (
            <nav className="glass-panel fixed bottom-3 left-3 right-3 z-50 grid gap-1 rounded-[1.35rem] p-2 md:hidden" style={{ gridTemplateColumns: `repeat(${Math.min(navItems.length, 5)}, minmax(0, 1fr))` }} aria-label="Navegacion movil">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative z-10 grid place-items-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] transition ${
                      isActive ? "bg-white text-ink" : "text-smoke/70 hover:bg-white/8"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            ) : null}
          </>
        ) : null}

        {children}
      </div>
    </div>
  );
}
