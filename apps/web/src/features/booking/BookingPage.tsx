import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import {
  bookAppointment,
  getAvailableSlots,
  listBarbers,
  listServices,
  type Slot,
} from "../../lib/bookingApi";
import { formatTime, money, todayISO } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { Barber, Service } from "../../lib/types";

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [localDate, setLocalDate] = useState(todayISO());
  const [slotTime, setSlotTime] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(() => services.find((service) => service.id === serviceId), [serviceId, services]);

  useEffect(() => {
    let mounted = true;

    Promise.all([listServices(), listBarbers()])
      .then(([nextServices, nextBarbers]) => {
        if (!mounted) return;
        setServices(nextServices);
        setBarbers(nextBarbers);
        setServiceId(nextServices[0]?.id ?? "");
        setBarberId(nextBarbers[0]?.id ?? "");
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!barberId || !serviceId || !localDate) return;

    let mounted = true;
    setSlotLoading(true);
    setSlotTime("");

    getAvailableSlots(barberId, serviceId, localDate)
      .then((nextSlots) => {
        if (!mounted) return;
        setSlots(nextSlots);
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => {
        if (mounted) setSlotLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [barberId, localDate, serviceId]);

  useEffect(() => {
    if (!barberId || !serviceId || !localDate) return;

    const refreshSlots = () => {
      void getAvailableSlots(barberId, serviceId, localDate)
        .then(setSlots)
        .catch((nextError: Error) => setError(nextError.message));
    };

    const channel = supabase
      .channel(`booking-slots:${barberId}:${localDate}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `barber_id=eq.${barberId}` }, refreshSlots)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_blocks", filter: `barber_id=eq.${barberId}` }, refreshSlots)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [barberId, localDate, serviceId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      await bookAppointment({ barberId, serviceId, localDate, slotTime, guestName, guestPhone, guestEmail, notes });
      setMessage("Reserva creada. Te contactaremos si necesitamos confirmar algun detalle.");
      setGuestName("");
      setGuestPhone("");
      setGuestEmail("");
      setNotes("");
      setSlots((current) => current.filter((slot) => slot.slot_time !== slotTime));
      setSlotTime("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos crear la reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section>
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Reservas</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">Reserva simple, validada en Supabase.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-smoke/70">
          El horario se calcula por RPC y la cita se crea en base de datos con exclusion de cruces. Si dos clientes toman el mismo cupo, solo una reserva entra.
        </p>

        <div className="mt-8 space-y-3 border-l border-white/10 pl-5 text-sm text-smoke/70">
          <p>Dominio objetivo: barberappstudio.com</p>
          <p>n8n queda fuera del camino critico de reserva.</p>
          <p>La cuenta es opcional para reservar; el panel cliente requiere acceso.</p>
        </div>
      </section>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        {loading ? <p className="text-sm text-smoke/70">Cargando agenda...</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-smoke/70">Servicio</span>
            <select className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {money(service.price_cents)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-smoke/70">Barbero</span>
            <select className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" value={barberId} onChange={(event) => setBarberId(event.target.value)} required>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.display_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="text-smoke/70">Fecha</span>
          <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" min={todayISO()} type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} required />
        </label>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Horarios disponibles</p>
            {selectedService ? <p className="text-xs text-smoke/55">{selectedService.duration_min + selectedService.buffer_min} min con margen</p> : null}
          </div>
          {slotLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-smoke/70">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando cupos
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  className={`rounded-xl border px-3 py-3 text-sm transition ${slotTime === slot.slot_time ? "border-gold bg-gold text-ink" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                  key={slot.slot_time}
                  type="button"
                  onClick={() => setSlotTime(slot.slot_time)}
                >
                  {formatTime(slot.starts_at)}
                </button>
              ))}
              {!slots.length ? <p className="col-span-full text-sm text-smoke/60">No hay cupos para esta combinacion.</p> : null}
            </div>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre" value={guestName} onChange={(event) => setGuestName(event.target.value)} required />
          <input className="rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Celular" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} required />
        </div>
        <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Email opcional" type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} />
        <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Notas opcionales" value={notes} onChange={(event) => setNotes(event.target.value)} />

        {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        {message ? (
          <p className="inline-flex w-full items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="h-4 w-4" /> {message}
          </p>
        ) : null}

        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60" disabled={!slotTime || submitting} type="submit">
          <CalendarDays className="h-4 w-4" />
          {submitting ? "Reservando..." : "Confirmar reserva"}
        </button>
      </form>
    </main>
  );
}
