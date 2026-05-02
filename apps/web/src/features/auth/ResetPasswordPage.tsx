import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Contraseña actualizada. Ya puedes entrar con la nueva clave.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="glass-panel mx-auto max-w-xl rounded-[2rem] p-6 md:p-9">
      <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.42em] text-silver/70">Seguridad</p>
        <h1 className="mt-4 font-display text-5xl font-semibold">Nueva contraseña</h1>
        <p className="mt-4 text-sm leading-7 text-smoke/65">Escribe una nueva contraseña para tu cuenta.</p>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <input className="glass-input w-full rounded-2xl px-5 py-4" minLength={6} placeholder="Nueva contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          {message ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
          <button className="glass-button inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-medium disabled:opacity-60" disabled={loading} type="submit">
            <KeyRound className="h-4 w-4" />
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </main>
  );
}
