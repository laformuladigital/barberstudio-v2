import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSessionContext } from "../app/providers/SessionProvider";
import type { AppRole } from "./types";

export function RoleRoute({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { user, role, loading } = useSessionContext();

  if (loading) {
    return <div className="py-20 text-center text-sm text-smoke/70">Cargando acceso...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allow.includes(role)) {
    return (
      <main className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Acceso pendiente</p>
        <h1 className="mt-3 text-3xl font-semibold">Tu cuenta no tiene permiso para este panel</h1>
        <p className="mt-3 text-sm leading-7 text-smoke/70">
          La sesion existe, pero Supabase no devolvio un rol permitido. Para entrar aqui, el usuario debe existir en
          `profiles` y tener un registro en `user_roles`.
        </p>
        <p className="mt-4 rounded-xl border border-white/10 bg-ink px-4 py-3 text-sm text-smoke/70">
          Rol actual: {role ?? "sin rol"}
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
