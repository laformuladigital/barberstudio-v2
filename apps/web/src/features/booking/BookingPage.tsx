import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock, ImageIcon, Loader2, LogIn, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
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
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(() => services.find((service) => service.id === serviceId), [serviceId, services]);
  const selectedBarber = useMemo(() => barbers.find((barber) => barber.id === barberId), [barberId, barbers]);
  const selectedSlot = useMemo(() => slots.find((slot) => slot.slot_time === slotTime), [slotTime, slots]);

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
    setSubmitting(true);

    try {
      await bookAppointment({ barberId, serviceId, localDate, slotTime, guestName, guestPhone, guestEmail, notes });
      setCompleted(true);
      setSlots((current) => current.filter((slot) => slot.slot_time !== slotTime));
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

  function resetFlow() {
    setCompleted(false);
    setStage(0);
    setServiceId("");
    setBarberId("");
    setSlotTime("");
    setGuestName("");
    setGuestPhone("");
    setGuestEmail("");
    setNotes("");
    setAcceptPolicy(false);
  }

  return (
    <main className="min-h-[100svh] overflow-x-hidden px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-6xl flex-col">
        <BookingTopBar stage={stage} serviceId={serviceId} barberId={barberId} slotTime={slotTime} onStageChange={goTo} />

        {error ? <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

        {completed ? (
          <SuccessScreen selectedBarber={selectedBarber} selectedService={selectedService} selectedSlot={selectedSlot} onReset={resetFlow} />
        ) : (
          <form className="flex flex-1 flex-col" onSubmit={(event) => void handleSubmit(event)}>
            {stage === 0 ? (
              <TypeformStep title="Que servicio quieres reservar?" detail="Elige una opcion. En el siguiente paso seleccionas el profesional.">
                {loading ? <LoadingLine label="Cargando servicios" /> : null}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {services.map((service) => (
                    <OptionCard key={service.id} selected={serviceId === service.id} onClick={() => {
                      setServiceId(service.id);
                      setBarberId("");
                      setSlotTime("");
                    }}>
                      <Media imageUrl={service.image_url} fallback={<ImageIcon className="h-6 w-6 text-white/45" />} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-base font-semibold">{service.name}</p>
                          <p className="text-sm text-white/70">{money(service.price_cents)}</p>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-smoke/60">{service.description || "Servicio BarberStudio"}</p>
                        <p className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          <Clock className="h-3.5 w-3.5" /> {service.duration_min + service.buffer_min} min
                        </p>
                      </div>
                    </OptionCard>
                  ))}
                  {!loading && !services.length ? <EmptyState text="No hay servicios activos para reservar." /> : null}
                </div>
                <ActionBar canContinue={Boolean(serviceId)} continueLabel="Elegir barbero" onContinue={() => goTo(1)} />
              </TypeformStep>
            ) : null}

            {stage === 1 ? (
              <TypeformStep title="Con quien quieres atenderte?" detail={selectedService ? selectedService.name : "Selecciona primero un servicio."}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {barbers.map((barber) => (
                    <OptionCard key={barber.id} selected={barberId === barber.id} onClick={() => {
                      setBarberId(barber.id);
                      setSlotTime("");
                    }}>
                      <Media imageUrl={barber.avatar_url || barber.gallery_urls?.[0] || null} fallback={<UserRound className="h-6 w-6 text-white/45" />} />
                      <div className="p-4">
                        <p className="text-base font-semibold">{barber.display_name}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-smoke/60">{barber.bio || "Profesional BarberStudio"}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">{barber.specialties.join(" · ") || "Cortes"}</p>
                      </div>
                    </OptionCard>
                  ))}
                  {!barbers.length ? <EmptyState text="No hay barberos activos para reservar." /> : null}
                </div>
                <ActionBar canContinue={Boolean(barberId)} continueLabel="Elegir horario" onBack={() => goTo(0)} onContinue={() => goTo(2)} />
              </TypeformStep>
            ) : null}

            {stage === 2 ? (
              <TypeformStep title="Que horario te sirve?" detail={selectedBarber ? `${selectedBarber.display_name} · ${selectedService?.name ?? "Servicio"}` : "Selecciona barbero para calcular cupos."}>
                <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
                  <label className="space-y-2 text-sm">
                    <span className="text-smoke/70">Fecha de la cita</span>
                    <input className="glass-input w-full rounded-2xl px-4 py-4" min={todayISO()} type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} required />
                  </label>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-smoke/80">Horas disponibles</p>
                    {slotLoading ? (
                      <LoadingLine label="Calculando cupos" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {slots.map((slot) => (
                          <button
                            className={`rounded-2xl border px-3 py-4 text-sm transition ${
                              slotTime === slot.slot_time ? "border-white bg-white text-ink" : "border-white/10 bg-white/5 hover:border-white/35 hover:bg-white/10"
                            }`}
                            key={slot.slot_time}
                            type="button"
                            onClick={() => setSlotTime(slot.slot_time)}
                          >
                            {formatTime(slot.starts_at)}
                          </button>
                        ))}
                        {!slots.length ? <EmptyState text="No hay cupos para esta combinacion." /> : null}
                      </div>
                    )}
                  </div>
                </div>
                <ActionBar canContinue={Boolean(slotTime)} continueLabel="Completar datos" onBack={() => goTo(1)} onContinue={() => goTo(3)} />
              </TypeformStep>
            ) : null}

            {stage === 3 ? (
              <TypeformStep title="Confirma tu reserva" detail="El cupo queda bloqueado al confirmar y desaparece de la agenda publica.">
                <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:grid-cols-3">
                  <Summary label="Servicio" value={selectedService?.name ?? "-"} />
                  <Summary label="Barbero" value={selectedBarber?.display_name ?? "-"} />
                  <Summary label="Horario" value={selectedSlot ? `${localDate} · ${formatTime(selectedSlot.starts_at)}` : "-"} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="glass-input w-full rounded-2xl px-4 py-4" placeholder="Nombre" value={guestName} onChange={(event) => setGuestName(event.target.value)} required />
                  <input className="glass-input w-full rounded-2xl px-4 py-4" placeholder="Celular" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} required />
                  <input className="glass-input w-full rounded-2xl px-4 py-4 md:col-span-2" placeholder="Email opcional" type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} />
                  <textarea className="glass-input min-h-28 w-full rounded-2xl px-4 py-4 md:col-span-2" placeholder="Notas opcionales" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </div>
                <label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-smoke/72">
                  <input className="mt-1 h-4 w-4 accent-white" checked={acceptPolicy} onChange={(event) => setAcceptPolicy(event.target.checked)} type="checkbox" required />
                  <span>Acepto la politica de reservas: cancelacion minimo 2 horas antes y el espacio se bloquea para otros clientes.</span>
                </label>
                <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                  <button className="glass-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-medium" type="button" onClick={() => goTo(2)}>
                    <ArrowLeft className="h-4 w-4" /> Volver
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-semibold text-ink shadow-[0_18px_60px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-50" disabled={!slotTime || !acceptPolicy || submitting} type="submit">
                    <CalendarDays className="h-4 w-4" />
                    {submitting ? "Reservando..." : "Confirmar reserva"}
                  </button>
                </div>
              </TypeformStep>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}

function BookingTopBar({
  stage,
  serviceId,
  barberId,
  slotTime,
  onStageChange,
}: {
  stage: number;
  serviceId: string;
  barberId: string;
  slotTime: string;
  onStageChange: (stage: number) => void;
}) {
  return (
    <header className="sticky top-3 z-30">
      <div className="glass-panel mx-auto max-w-5xl rounded-full px-3 py-2 md:px-4">
      <div className="relative z-10 flex items-center justify-between gap-3">
        <Link className="flex min-w-0 items-center gap-3" to="/">
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-black">
            <img className="h-7 w-7 object-contain" src="/logo-barberstudio-blanco.png" alt="" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate font-display text-lg font-semibold silver-text">Barber Studio</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" aria-label={`Paso ${stage + 1} de ${steps.length}`}>
            {steps.map((label, index) => {
              const enabled =
                index === 0 ||
                (index === 1 && Boolean(serviceId)) ||
                (index === 2 && Boolean(serviceId && barberId)) ||
                (index === 3 && Boolean(serviceId && barberId && slotTime));
              return (
                <button
                  className={`h-2.5 rounded-full transition-all ${stage === index ? "w-8 bg-white" : enabled ? "w-2.5 bg-white/45" : "w-2.5 bg-white/15"}`}
                  disabled={!enabled}
                  key={label}
                  type="button"
                  aria-label={label}
                  onClick={() => onStageChange(index)}
                />
              );
            })}
          </div>
          <Link className="glass-button inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm" to="/login">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Entrar</span>
          </Link>
        </div>
      </div>
      <div className="relative z-10 mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-white transition-all duration-500" style={{ width: `${((stage + 1) / steps.length) * 100}%` }} />
      </div>
      </div>
    </header>
  );
}

function TypeformStep({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="booking-step-enter grid flex-1 content-center gap-6 py-6 md:gap-8 md:py-10">
      <div className="max-w-3xl">
        <h1 className="text-balance text-4xl font-semibold leading-[1.02] silver-text md:text-6xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-smoke/65 md:text-base">{detail}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className={`liquid-card group overflow-hidden rounded-[1.6rem] border text-left transition ${
        selected ? "border-white/75 bg-white/[0.12] shadow-[0_0_36px_rgba(255,255,255,0.12)]" : "border-white/10 bg-white/[0.035] hover:border-white/35 hover:bg-white/[0.07]"
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActionBar({
  canContinue,
  continueLabel,
  onBack,
  onContinue,
}: {
  canContinue: boolean;
  continueLabel: string;
  onBack?: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="grid gap-2 pt-2 sm:grid-cols-[180px_1fr]">
      {onBack ? (
        <button className="glass-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-medium" type="button" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
      ) : (
        <span className="hidden sm:block" />
      )}
      <button
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-semibold text-ink shadow-[0_18px_60px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!canContinue}
        type="button"
        onClick={onContinue}
      >
        {continueLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuccessScreen({
  selectedBarber,
  selectedService,
  selectedSlot,
  onReset,
}: {
  selectedBarber?: Barber;
  selectedService?: Service;
  selectedSlot?: Slot;
  onReset: () => void;
}) {
  return (
    <section className="booking-step-enter grid flex-1 content-center gap-6 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-emerald-100">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <p className="mt-6 text-xs uppercase tracking-[0.34em] text-white/42">Reserva confirmada</p>
        <h1 className="mt-4 text-4xl font-semibold silver-text md:text-6xl">Tu cita quedo lista</h1>
        <p className="mt-4 text-sm leading-7 text-smoke/65">
          El horario queda ocupado y ya no aparece disponible para otra persona.
        </p>
      </div>
      <div className="mx-auto grid w-full max-w-3xl gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:grid-cols-3">
        <Summary label="Servicio" value={selectedService?.name ?? "-"} />
        <Summary label="Barbero" value={selectedBarber?.display_name ?? "-"} />
        <Summary label="Hora" value={selectedSlot ? formatTime(selectedSlot.starts_at) : "-"} />
      </div>
      <div className="mx-auto grid w-full max-w-3xl gap-2 sm:grid-cols-2">
        <Link className="glass-button inline-flex items-center justify-center rounded-2xl px-5 py-4 font-medium" to="/">
          Inicio
        </Link>
        <button className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-4 font-semibold text-ink" type="button" onClick={onReset}>
          Nueva reserva
        </button>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.035] p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-smoke/42">{label}</p>
      <p className="mt-2 text-sm font-medium text-smoke">{value}</p>
    </div>
  );
}

function LoadingLine({ label }: { label: string }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-smoke/70">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </p>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-smoke/60">{text}</p>;
}

function Media({ imageUrl, fallback }: { imageUrl?: string | null; fallback: ReactNode }) {
  return (
    <div className="grid aspect-[16/10] place-items-center bg-black/35">
      {imageUrl ? <img className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" src={imageUrl} alt="" loading="lazy" /> : fallback}
    </div>
  );
}
