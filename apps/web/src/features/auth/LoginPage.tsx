import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { env } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import type { AppRole } from "../../lib/types";

function panelPathForRole(role: AppRole | null) {
  if (role === "admin") return "/admin";
  if (role === "barbero") return "/barbero";
  return "/cliente";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const needsConfirmation = error?.toLowerCase().includes("email not confirmed") ?? false;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        setMessage("Cuenta creada. Si Supabase exige confirmacion, revisa tu correo antes de entrar.");
      } else if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${env.appDomain}/reset-password`,
        });
        if (resetError) throw resetError;
        setMessage("Te enviamos un enlace para restablecer tu contraseña. Revisa inbox y spam.");
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signInData.user.id);

        const roles = (roleData ?? []).map((item) => item.role as AppRole);
        const nextRole = roles.includes("admin") ? "admin" : roles.includes("barbero") ? "barbero" : roles.includes("cliente") ? "cliente" : null;
        navigate(panelPathForRole(nextRole));
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos completar el acceso.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    setResending(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) throw resendError;
      setMessage("Te reenviamos el correo de confirmacion. Revisa inbox y spam.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos reenviar la confirmacion.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-gold">Acceso</p>
      <h1 className="mt-3 text-4xl font-semibold">{mode === "login" ? "Entrar al panel" : mode === "register" ? "Crear cuenta cliente" : "Restablecer contraseña"}</h1>
      <p className="mt-3 text-sm leading-7 text-smoke/70">
        Supabase Auth controla la sesion. Los permisos reales salen de `user_roles` y RLS.
      </p>

      <div className="mt-6 grid grid-cols-3 rounded-xl border border-white/10 bg-ink p-1 text-sm">
        <button className={`rounded-lg px-3 py-2 ${mode === "login" ? "bg-gold text-ink" : "text-smoke/70"}`} type="button" onClick={() => setMode("login")}>
          Entrar
        </button>
        <button className={`rounded-lg px-3 py-2 ${mode === "register" ? "bg-gold text-ink" : "text-smoke/70"}`} type="button" onClick={() => setMode("register")}>
          Registro
        </button>
        <button className={`rounded-lg px-3 py-2 ${mode === "reset" ? "bg-gold text-ink" : "text-smoke/70"}`} type="button" onClick={() => setMode("reset")}>
          Recuperar
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {mode === "register" ? (
          <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        ) : null}
        <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        {mode !== "reset" ? (
          <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" minLength={6} placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        ) : null}

        {error ? (
          <div className="space-y-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            <p>{needsConfirmation ? "Tu correo aun no esta confirmado." : error}</p>
            {needsConfirmation ? (
              <button className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-60" disabled={!email || resending} type="button" onClick={() => void handleResendConfirmation()}>
                {resending ? "Reenviando..." : "Reenviar confirmacion"}
              </button>
            ) : null}
          </div>
        ) : null}
        {message ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-medium text-ink disabled:opacity-60" disabled={loading} type="submit">
          {mode === "login" ? <LogIn className="h-4 w-4" /> : mode === "register" ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          {loading ? "Procesando..." : mode === "login" ? "Entrar" : mode === "register" ? "Crear cuenta" : "Enviar enlace"}
        </button>
      </form>
    </main>
  );
}
