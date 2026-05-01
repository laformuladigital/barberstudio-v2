/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { AppRole } from "../../lib/types";

type SessionContextValue = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRole = async (nextUser: User | null) => {
      let nextRole: AppRole | null = null;

      if (nextUser) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", nextUser.id);

        const roles = (roleData ?? []).map((item) => item.role as AppRole);

        if (roles.includes("admin")) {
          nextRole = "admin";
        } else if (roles.includes("barbero")) {
          nextRole = "barbero";
        } else if (roles.includes("cliente")) {
          nextRole = "cliente";
        }
      }

      return nextRole;
    };

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const nextUser = sessionData.session?.user ?? null;
      const nextRole = await loadRole(nextUser);

      if (!mounted) return;
      setSession(sessionData.session ?? null);
      setUser(nextUser);
      setRole(nextRole);
      setLoading(false);
    };

    void load();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void loadRole(nextSession?.user ?? null).then((nextRole) => {
        if (mounted) setRole(nextRole);
      });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      user,
      role,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [loading, role, session, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error("useSessionContext must be used inside SessionProvider");
  }

  return value;
}
