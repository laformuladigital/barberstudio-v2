import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import {
  approveScheduleBlock,
  cancelAppointment,
  listAppointments,
  listBarbers,
  listScheduleBlocks,
  listServices,
  rejectScheduleBlock,
  type AppointmentRow,
  type ScheduleBlockRow,
} from "../../lib/bookingApi";
import { formatTime, money, todayISO } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { Barber, Service } from "../../lib/types";

export default function AdminPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlockRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [localDate, setLocalDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const revenue = useMemo(
    () => appointments.filter((appointment) => appointment.status !== "cancelled").reduce((sum, appointment) => sum + (appointment.services?.price_cents ?? 0), 0),
    [appointments],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextAppointments, nextBlocks, nextServices, nextBarbers] = await Promise.all([
        listAppointments("admin", localDate),
        listScheduleBlocks(),
        listServices(),
        listBarbers(),
      ]);
      setAppointments(nextAppointments);
      setBlocks(nextBlocks);
      setServices(nextServices);
      setBarbers(nextBarbers);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cargar el panel admin.");
    }
  }, [localDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-live:${localDate}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_blocks" }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, localDate]);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos completar la accion.");
    }
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Admin</p>
          <h1 className="mt-3 text-4xl font-semibold">CRM operativo</h1>
        </div>
        <div className="flex gap-2">
          <input className="rounded-xl border border-white/10 bg-ink px-3 py-3" type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} />
          <button className="rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10" onClick={() => void load()} type="button" aria-label="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Citas del dia" value={appointments.length.toString()} />
        <Metric label="Ingresos potenciales" value={money(revenue)} />
        <Metric label="Servicios activos" value={services.length.toString()} />
        <Metric label="Barberos activos" value={barbers.length.toString()} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 font-medium">Agenda general</div>
          {appointments.map((appointment) => (
            <article className="grid gap-3 border-b border-white/10 bg-white/[0.03] p-4 last:border-b-0 md:grid-cols-[1fr_auto]" key={appointment.id}>
              <div>
                <p className="font-medium">{formatTime(appointment.starts_at)} · {appointment.services?.name ?? "Servicio"}</p>
                <p className="mt-1 text-sm text-smoke/65">
                  {appointment.barbers?.display_name ?? "Barbero"} · {appointment.guest_name ?? "Cliente registrado"} · {appointment.guest_phone ?? "Sin celular"}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gold">{appointment.status}</p>
              </div>
              {appointment.status === "pending" || appointment.status === "confirmed" ? (
                <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => void run(() => cancelAppointment(appointment.id, "Cancelada por admin"))} type="button">
                  <X className="h-4 w-4" /> Cancelar
                </button>
              ) : null}
            </article>
          ))}
          {!appointments.length ? <p className="bg-white/[0.03] p-5 text-sm text-smoke/60">No hay citas para esta fecha.</p> : null}
        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-white/10">
            <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 font-medium">Bloqueos</div>
            {blocks.map((block) => (
              <article className="space-y-3 border-b border-white/10 bg-white/[0.03] p-4 last:border-b-0" key={block.id}>
                <div>
                  <p className="font-medium">{block.barbers?.display_name ?? "Barbero"} · {block.local_date}</p>
                  <p className="mt-1 text-sm text-smoke/65">{formatTime(block.starts_at)} - {formatTime(block.ends_at)} · {block.reason ?? "Sin motivo"}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gold">{block.status}</p>
                </div>
                {block.status === "pending" ? (
                  <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => void run(() => approveScheduleBlock(block.id))} type="button">
                      <Check className="h-4 w-4" /> Aprobar
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => void run(() => rejectScheduleBlock(block.id, "Rechazado por admin"))} type="button">
                      <X className="h-4 w-4" /> Rechazar
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-smoke/50">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
