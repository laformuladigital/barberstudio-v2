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
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

