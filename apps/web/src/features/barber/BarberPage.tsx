import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Clock, Scissors } from "lucide-react";
import {
  completeAppointment,
  confirmAppointment,
  listAppointments,
  listBarbers,
  markNoShow,
  requestScheduleBlock,
  type AppointmentRow,
} from "../../lib/bookingApi";
import { formatTime, todayISO } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { Barber } from "../../lib/types";

export default function BarberPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [localDate, setLocalDate] = useState(todayISO());
  const [barberId, setBarberId] = useState("");
  const [blockStart, setBlockStart] = useState("13:00");
  const [blockEnd, setBlockEnd] = useState("14:00");
  const [blockReason, setBlockReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextAppointments, nextBarbers] = await Promise.all([listAppointments("barber", localDate), listBarbers()]);
      setAppointments(nextAppointments);
      setBarbers(nextBarbers);
      setBarberId((current) => current || nextBarbers[0]?.id || "");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cargar la agenda.");
    }
  }, [localDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`barber-agenda:${localDate}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_blocks" }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, localDate]);

  async function run(action: () => Promise<void>) {
    setError(null);
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
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Barbero</p>
          <h1 className="mt-3 text-4xl font-semibold">Agenda diaria</h1>
        </div>
        <input className="rounded-xl border border-white/10 bg-ink px-3 py-3" type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} />
      </header>

      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {appointments.map((appointment) => (
            <article className="grid gap-4 border-b border-white/10 bg-white/[0.03] p-4 last:border-b-0 md:grid-cols-[1fr_auto]" key={appointment.id}>
              <div>
                <p className="font-medium">{formatTime(appointment.starts_at)} · {appointment.services?.name ?? "Servicio"}</p>
                <p className="mt-1 text-sm text-smoke/65">{appointment.guest_name ?? "Cliente registrado"} · {appointment.guest_phone ?? "Sin celular visible"}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gold">{appointment.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => void run(() => confirmAppointment(appointment.id))} type="button">
                  <Clock className="h-4 w-4" /> Confirmar
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => void run(() => completeAppointment(appointment.id))} type="button">
                  <Check className="h-4 w-4" /> Completar
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => void run(() => markNoShow(appointment.id))} type="button">
                  <Ban className="h-4 w-4" /> No show
                </button>
              </div>
            </article>
          ))}
          {!appointments.length ? <p className="bg-white/[0.03] p-5 text-sm text-smoke/60">No hay citas visibles para esta fecha.</p> : null}
        </div>

        <form
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => requestScheduleBlock({ barberId, localDate, startTime: blockStart, endTime: blockEnd, reason: blockReason }));
          }}
        >
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-gold" />
            <h2 className="font-medium">Solicitar bloqueo</h2>
          </div>
          <select className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" value={barberId} onChange={(event) => setBarberId(event.target.value)} required>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>{barber.display_name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-xl border border-white/10 bg-ink px-3 py-3" type="time" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} required />
            <input className="rounded-xl border border-white/10 bg-ink px-3 py-3" type="time" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} required />
          </div>
          <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Motivo" value={blockReason} onChange={(event) => setBlockReason(event.target.value)} />
          <button className="w-full rounded-xl bg-gold px-4 py-3 font-medium text-ink" type="submit">Enviar bloqueo</button>
        </form>
      </section>
    </main>
  );
}
