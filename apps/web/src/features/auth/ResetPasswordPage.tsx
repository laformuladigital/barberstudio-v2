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
    <main className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-gold">Seguridad</p>
      <h1 className="mt-3 text-4xl font-semibold">Nueva contraseña</h1>
      <p className="mt-3 text-sm leading-7 text-smoke/70">Escribe una nueva contraseña para tu cuenta.</p>

      <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" minLength={6} placeholder="Nueva contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-medium text-ink disabled:opacity-60" disabled={loading} type="submit">
          <KeyRound className="h-4 w-4" />
          {loading ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </form>
    </main>
  );
}
