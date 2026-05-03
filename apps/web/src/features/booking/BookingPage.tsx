import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, ImageIcon, Loader2, UserRound } from "lucide-react";
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
  const selectedBarber = useMemo(() => barbers.find((barber) => barber.id === barberId), [barberId, barbers]);
  const directLink = "https://barberappstudio.com/reservar";

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
      setMessage("Reserva creada. Tu horario queda bloqueado y no aparecera disponible para otro cliente.");
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
    <main className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/55">Reservas</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">Reserva tu cita</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-smoke/70">
            Elige servicio, profesional y hora disponible. Cuando confirmas, ese espacio queda ocupado y sale de la agenda publica.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-smoke/70">
          <p className="font-medium text-smoke">Link directo de reservas</p>
          <a className="mt-2 block break-all text-white/80 hover:text-white" href="/reservar">
            {directLink}
          </a>
        </div>
      </section>

      {loading ? <p className="text-sm text-smoke/70">Cargando agenda...</p> : null}
      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
      {message ? (
        <p className="inline-flex w-full items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </p>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <Step title="1. Servicio" detail="Ordenados A-Z con foto descriptiva.">
            <div className="grid gap-3 md:grid-cols-2">
              {services.map((service) => (
                <button
                  className={`group overflow-hidden rounded-2xl border text-left transition ${serviceId === service.id ? "border-white/70 bg-white/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/30"}`}
                  key={service.id}
                  type="button"
                  onClick={() => setServiceId(service.id)}
                >
                  <Media imageUrl={service.image_url} fallback={<ImageIcon className="h-6 w-6 text-white/45" />} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-white/65">{money(service.price_cents)}</p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-smoke/60">{service.description || "Servicio BarberStudio"}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">{service.duration_min + service.buffer_min} min</p>
                  </div>
                </button>
              ))}
            </div>
          </Step>

          <Step title="2. Barbero" detail="Elige el profesional viendo su perfil y trabajos.">
            <div className="grid gap-3 md:grid-cols-2">
              {barbers.map((barber) => (
                <button
                  className={`overflow-hidden rounded-2xl border text-left transition ${barberId === barber.id ? "border-white/70 bg-white/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/30"}`}
                  key={barber.id}
                  type="button"
                  onClick={() => setBarberId(barber.id)}
                >
                  <Media imageUrl={barber.avatar_url || barber.gallery_urls?.[0] || null} fallback={<UserRound className="h-6 w-6 text-white/45" />} />
                  <div className="p-4">
                    <p className="font-medium">{barber.display_name}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-smoke/60">{barber.bio || "Profesional BarberStudio"}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">{barber.specialties.join(" · ") || "Cortes"}</p>
                  </div>
                </button>
              ))}
            </div>
          </Step>
        </section>

        <aside className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 xl:sticky xl:top-4 xl:self-start">
          <Step title="3. Horario" detail={selectedService && selectedBarber ? `${selectedService.name} con ${selectedBarber.display_name}` : "Selecciona servicio y barbero."}>
            <label className="block space-y-2 text-sm">
              <span className="text-smoke/70">Fecha</span>
              <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" min={todayISO()} type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} required />
            </label>
            {slotLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-smoke/70">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando cupos
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => (
                  <button
                    className={`rounded-xl border px-3 py-3 text-sm transition ${slotTime === slot.slot_time ? "border-white bg-white text-ink" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
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
          </Step>

          <Step title="4. Tus datos" detail="La cuenta es opcional para reservar.">
            <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre" value={guestName} onChange={(event) => setGuestName(event.target.value)} required />
            <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Celular" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} required />
            <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Email opcional" type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} />
            <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Notas opcionales" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60" disabled={!slotTime || submitting} type="submit">
              <CalendarDays className="h-4 w-4" />
              {submitting ? "Reservando..." : "Confirmar reserva"}
            </button>
          </Step>
        </aside>
      </form>
    </main>
  );
}

function Step({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-smoke/55">{detail}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Media({ imageUrl, fallback }: { imageUrl?: string | null; fallback: ReactNode }) {
  return (
    <div className="grid aspect-[16/9] place-items-center bg-black/35">
      {imageUrl ? <img className="h-full w-full object-cover" src={imageUrl} alt="" loading="lazy" /> : fallback}
    </div>
  );
}
