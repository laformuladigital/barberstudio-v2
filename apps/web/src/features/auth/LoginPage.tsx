import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate("/cliente");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos completar el acceso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-gold">Acceso</p>
      <h1 className="mt-3 text-4xl font-semibold">{mode === "login" ? "Entrar al panel" : "Crear cuenta cliente"}</h1>
      <p className="mt-3 text-sm leading-7 text-smoke/70">
        Supabase Auth controla la sesion. Los permisos reales salen de `user_roles` y RLS.
      </p>

      <div className="mt-6 grid grid-cols-2 rounded-xl border border-white/10 bg-ink p-1 text-sm">
        <button className={`rounded-lg px-3 py-2 ${mode === "login" ? "bg-gold text-ink" : "text-smoke/70"}`} type="button" onClick={() => setMode("login")}>
          Entrar
        </button>
        <button className={`rounded-lg px-3 py-2 ${mode === "register" ? "bg-gold text-ink" : "text-smoke/70"}`} type="button" onClick={() => setMode("register")}>
          Registro
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {mode === "register" ? (
          <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        ) : null}
        <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" minLength={6} placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />

        {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-medium text-ink disabled:opacity-60" disabled={loading} type="submit">
          {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
    </main>
  );
}
