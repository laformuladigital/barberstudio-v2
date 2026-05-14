import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, ImageIcon, Loader2, UserRound } from "lucide-react";
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

const steps = ["Servicio", "Barbero", "Horario", "Datos"];

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [stage, setStage] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [localDate, setLocalDate] = useState(todayISO());
  const [slotTime, setSlotTime] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(() => services.find((service) => service.id === serviceId), [serviceId, services]);
  const selectedBarber = useMemo(() => barbers.find((barber) => barber.id === barberId), [barberId, barbers]);

  useEffect(() => {
    let mounted = true;

    Promise.all([listServices(), listBarbers()])
      .then(([nextServices, nextBarbers]) => {
        if (!mounted) return;
        setServices(nextServices);
        setBarbers(nextBarbers);
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
      setAcceptPolicy(false);
      setSlots((current) => current.filter((slot) => slot.slot_time !== slotTime));
      setSlotTime("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos crear la reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  function goTo(nextStage: number) {
    setStage(Math.max(0, Math.min(3, nextStage)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectService(id: string) {
    setServiceId(id);
    setBarberId("");
    setSlotTime("");
    goTo(1);
  }

  function selectBarber(id: string) {
    setBarberId(id);
    setSlotTime("");
    goTo(2);
  }

  function selectSlot(time: string) {
    setSlotTime(time);
    goTo(3);
  }

  return (
    <main className="space-y-5">
      <section className="glass-panel immersive-enter sticky top-2 z-20 space-y-3 rounded-2xl p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Reservas</p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Reserva tu cita</h1>
          </div>
          <a className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-smoke/70 hover:bg-white/10" href="/reservar">
            Link directo
          </a>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((label, index) => {
            const enabled =
              index === 0 ||
              (index === 1 && Boolean(serviceId)) ||
              (index === 2 && Boolean(serviceId && barberId)) ||
              (index === 3 && Boolean(serviceId && barberId && slotTime));
            return (
              <button
                className={`rounded-xl px-3 py-3 text-xs uppercase tracking-[0.18em] transition ${
                  stage === index ? "bg-white text-ink" : enabled ? "bg-white/8 text-smoke hover:bg-white/12" : "bg-white/[0.03] text-smoke/35"
                }`}
                disabled={!enabled}
                key={label}
                type="button"
                onClick={() => goTo(index)}
              >
                {index + 1}. {label}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? <p className="text-sm text-smoke/70">Cargando agenda...</p> : null}
      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
      {message ? (
        <p className="inline-flex w-full items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </p>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)}>
        {stage === 0 ? (
          <FullscreenStep eyebrow="Paso 1" title="Elige el servicio" detail="Ordenado A-Z, con foto, precio y duracion clara.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <button
                  className={`liquid-card group overflow-hidden rounded-2xl border text-left transition ${serviceId === service.id ? "border-white/70 bg-white/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/30"}`}
                  key={service.id}
                  type="button"
                  onClick={() => selectService(service.id)}
                >
                  <Media imageUrl={service.image_url} fallback={<ImageIcon className="h-6 w-6 text-white/45" />} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-white/65">{money(service.price_cents)}</p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-smoke/60">{service.description || "Servicio BarberStudio"}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">
                      Duracion total: {service.duration_min + service.buffer_min} min
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </FullscreenStep>
        ) : null}

        {stage === 1 ? (
          <FullscreenStep eyebrow="Paso 2" title="Elige tu barbero" detail={selectedService ? `Servicio seleccionado: ${selectedService.name}` : "Primero selecciona un servicio."}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {barbers.map((barber) => (
                <button
                  className={`liquid-card overflow-hidden rounded-2xl border text-left transition ${barberId === barber.id ? "border-white/70 bg-white/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/30"}`}
                  key={barber.id}
                  type="button"
                  onClick={() => selectBarber(barber.id)}
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
            <StepActions onBack={() => goTo(0)} />
          </FullscreenStep>
        ) : null}

        {stage === 2 ? (
          <FullscreenStep
            eyebrow="Paso 3"
            title="Elige fecha y hora"
            detail={selectedService && selectedBarber ? `${selectedService.name} con ${selectedBarber.display_name}` : "Selecciona servicio y barbero para calcular cupos."}
          >
            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <label className="block space-y-2 text-sm">
                <span className="text-smoke/70">Fecha de la cita</span>
                <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-4" min={todayISO()} type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} required />
              </label>
              <div className="space-y-3">
                <p className="text-sm font-medium">Horarios disponibles</p>
                {slotLoading ? (
                  <p className="inline-flex items-center gap-2 text-sm text-smoke/70">
                    <Loader2 className="h-4 w-4 animate-spin" /> Calculando cupos
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        className={`rounded-xl border px-3 py-4 text-sm transition ${slotTime === slot.slot_time ? "border-white bg-white text-ink" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                        key={slot.slot_time}
                        type="button"
                        onClick={() => selectSlot(slot.slot_time)}
                      >
                        {formatTime(slot.starts_at)}
                      </button>
                    ))}
                    {!slots.length ? <p className="col-span-full rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-smoke/60">No hay cupos para esta combinacion.</p> : null}
                  </div>
                )}
              </div>
            </div>
            <StepActions onBack={() => goTo(1)} />
          </FullscreenStep>
        ) : null}

        {stage === 3 ? (
          <FullscreenStep eyebrow="Paso 4" title="Confirma tus datos" detail="La cuenta es opcional para reservar. El cupo queda bloqueado al confirmar.">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-4" placeholder="Nombre" value={guestName} onChange={(event) => setGuestName(event.target.value)} required />
              <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-4" placeholder="Celular" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} required />
              <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-4 md:col-span-2" placeholder="Email opcional" type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} />
              <textarea className="min-h-28 w-full rounded-xl border border-white/10 bg-ink px-3 py-4 md:col-span-2" placeholder="Notas opcionales" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-smoke/70">
              <input className="mt-1 h-4 w-4 accent-white" checked={acceptPolicy} onChange={(event) => setAcceptPolicy(event.target.checked)} type="checkbox" required />
              <span>Acepto la politica de reservas: cancelacion minimo 2 horas antes y el espacio se bloquea para otros clientes.</span>
            </label>
            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-5 py-4 font-medium hover:bg-white/10" type="button" onClick={() => goTo(2)}>
                <ArrowLeft className="h-4 w-4" /> Volver
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-4 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60" disabled={!slotTime || !acceptPolicy || submitting} type="submit">
                <CalendarDays className="h-4 w-4" />
                {submitting ? "Reservando..." : "Confirmar reserva"}
              </button>
            </div>
          </FullscreenStep>
        ) : null}
      </form>
    </main>
  );
}

function FullscreenStep({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail: string; children: ReactNode }) {
  return (
    <section className="immersive-enter grid min-h-[calc(100vh-210px)] content-start gap-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-7">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-white/45">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-smoke/65">{detail}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function StepActions({ onBack }: { onBack: () => void }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-3 text-sm font-medium hover:bg-white/10" type="button" onClick={onBack}>
      <ArrowLeft className="h-4 w-4" /> Volver
    </button>
  );
}

function Media({ imageUrl, fallback }: { imageUrl?: string | null; fallback: ReactNode }) {
  return (
    <div className="grid aspect-[16/10] place-items-center bg-black/35">
      {imageUrl ? <img className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]" src={imageUrl} alt="" loading="lazy" /> : fallback}
    </div>
  );
}
