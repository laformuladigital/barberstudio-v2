import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import { cancelAppointment, listAppointments, type AppointmentRow } from "../../lib/bookingApi";
import { formatTime } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";

export default function ClientPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setAppointments(await listAppointments("client"));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cargar tus citas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("client-appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function handleCancel(id: string) {
    setError(null);
    try {
      await cancelAppointment(id, "Cancelada desde panel cliente");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cancelar la cita.");
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Cliente</p>
        <h1 className="mt-3 text-4xl font-semibold">Mis reservas</h1>
      </header>

      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
      {loading ? <p className="text-sm text-smoke/70">Cargando historial...</p> : null}

      <section className="overflow-hidden rounded-2xl border border-white/10">
        {appointments.map((appointment) => (
          <article className="grid gap-3 border-b border-white/10 bg-white/[0.03] p-4 last:border-b-0 md:grid-cols-[1fr_auto]" key={appointment.id}>
            <div>
              <p className="font-medium">{appointment.services?.name ?? "Servicio"}</p>
              <p className="mt-1 text-sm text-smoke/65">
                {appointment.local_date} · {formatTime(appointment.starts_at)} · {appointment.barbers?.display_name ?? "Barbero"}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gold">{appointment.status}</p>
            </div>
            {appointment.status === "pending" || appointment.status === "confirmed" ? (
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10" type="button" onClick={() => void handleCancel(appointment.id)}>
                <XCircle className="h-4 w-4" /> Cancelar
              </button>
            ) : null}
          </article>
        ))}
        {!appointments.length && !loading ? <p className="bg-white/[0.03] p-5 text-sm text-smoke/60">Aun no tienes reservas asociadas a esta cuenta.</p> : null}
      </section>
    </main>
  );
}
