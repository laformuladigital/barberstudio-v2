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
    <main className="mx-auto max-w-3xl">
      <section className="glass-panel rounded-[2rem] p-6 md:p-10">
        <div className="relative z-10 mx-auto mb-9 flex max-w-sm flex-col items-center text-center">
          <div className="grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_45px_rgba(255,255,255,0.12)]">
            <span className="font-display text-6xl font-semibold silver-text">S</span>
          </div>
          <p className="mt-4 font-display text-3xl font-semibold leading-none silver-text">BARBERSTUDIO</p>
        </div>

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.42em] text-silver/70">Acceso</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight md:text-6xl">
            {mode === "login" ? "Entrar al panel" : mode === "register" ? "Crear cuenta" : "Restablecer contraseña"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-smoke/62">
            Inicio seguro con Supabase Auth. Los permisos reales se validan con roles y politicas RLS.
          </p>
        </div>

      <div className="relative z-10 mt-8 grid grid-cols-3 rounded-2xl border border-white/14 bg-black/30 p-1 text-sm">
        <button className={`rounded-xl px-3 py-3 transition ${mode === "login" ? "glass-button border-white/45 text-white" : "text-smoke/62 hover:text-white"}`} type="button" onClick={() => setMode("login")}>
          Entrar
        </button>
        <button className={`rounded-xl px-3 py-3 transition ${mode === "register" ? "glass-button border-white/45 text-white" : "text-smoke/62 hover:text-white"}`} type="button" onClick={() => setMode("register")}>
          Registro
        </button>
        <button className={`rounded-xl px-3 py-3 transition ${mode === "reset" ? "glass-button border-white/45 text-white" : "text-smoke/62 hover:text-white"}`} type="button" onClick={() => setMode("reset")}>
          Recuperar
        </button>
      </div>

      <form className="relative z-10 mt-8 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        {mode === "register" ? (
          <input className="glass-input w-full rounded-2xl px-5 py-4" placeholder="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        ) : null}
        <input className="glass-input w-full rounded-2xl px-5 py-4" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        {mode !== "reset" ? (
          <input className="glass-input w-full rounded-2xl px-5 py-4" minLength={6} placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        ) : null}

        {error ? (
          <div className="space-y-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            <p>{needsConfirmation ? "Tu correo aun no esta confirmado." : error}</p>
            {needsConfirmation ? (
              <button className="glass-button rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60" disabled={!email || resending} type="button" onClick={() => void handleResendConfirmation()}>
                {resending ? "Reenviando..." : "Reenviar confirmacion"}
              </button>
            ) : null}
          </div>
        ) : null}
        {message ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

        <button className="glass-button inline-flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-semibold disabled:opacity-60" disabled={loading} type="submit">
          {mode === "login" ? <LogIn className="h-4 w-4" /> : mode === "register" ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          {loading ? "Procesando..." : mode === "login" ? "Entrar" : mode === "register" ? "Crear cuenta" : "Enviar enlace"}
        </button>
      </form>
      </section>
    </main>
  );
}
