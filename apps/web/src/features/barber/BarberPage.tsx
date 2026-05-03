import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Ban, Camera, Check, Clock, Plus, Save, Scissors, X } from "lucide-react";
import { useSessionContext } from "../../app/providers/SessionProvider";
import {
  completeAppointment,
  confirmAppointment,
  getMyBarberProfile,
  listAppointments,
  listBarbers,
  markNoShow,
  requestScheduleBlock,
  updateMyBarberProfile,
  uploadBarberMedia,
  type AppointmentRow,
} from "../../lib/bookingApi";
import { formatTime, todayISO } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { Barber } from "../../lib/types";

export default function BarberPage() {
  const { user } = useSessionContext();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [myBarber, setMyBarber] = useState<Barber | null>(null);
  const [localDate, setLocalDate] = useState(todayISO());
  const [barberId, setBarberId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [blockStart, setBlockStart] = useState("13:00");
  const [blockEnd, setBlockEnd] = useState("14:00");
  const [blockReason, setBlockReason] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextAppointments, nextBarbers, nextMyBarber] = await Promise.all([
        listAppointments("barber", localDate),
        listBarbers(),
        user ? getMyBarberProfile(user.id) : Promise.resolve(null),
      ]);
      setAppointments(nextAppointments);
      setBarbers(nextBarbers);
      setMyBarber(nextMyBarber);
      setBarberId((current) => nextMyBarber?.id || current || nextBarbers[0]?.id || "");
      if (nextMyBarber) {
        setDisplayName(nextMyBarber.display_name);
        setBio(nextMyBarber.bio ?? "");
        setSpecialties(nextMyBarber.specialties.join(", "));
        setAvatarUrl(nextMyBarber.avatar_url);
        setGalleryUrls(nextMyBarber.gallery_urls ?? []);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cargar la agenda.");
    }
  }, [localDate, user]);

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
    setMessage(null);
    try {
      await action();
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos completar la accion.");
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!myBarber) return;

    setSavingProfile(true);
    setError(null);
    setMessage(null);
    try {
      await updateMyBarberProfile({
        barberId: myBarber.id,
        displayName,
        bio,
        specialties: splitList(specialties),
        avatarUrl,
        galleryUrls,
      });
      setMessage("Perfil de barbero actualizado.");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos guardar tu perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleMediaUpload(event: ChangeEvent<HTMLInputElement>, kind: "avatar" | "gallery") {
    const file = event.target.files?.[0];
    if (!file || !user || !myBarber) return;

    setSavingProfile(true);
    setError(null);
    setMessage(null);
    try {
      const url = await uploadBarberMedia(user.id, file);
      const nextAvatar = kind === "avatar" ? url : avatarUrl;
      const nextGallery = kind === "gallery" ? [...galleryUrls, url] : galleryUrls;
      setAvatarUrl(nextAvatar);
      setGalleryUrls(nextGallery);
      await updateMyBarberProfile({
        barberId: myBarber.id,
        displayName,
        bio,
        specialties: splitList(specialties),
        avatarUrl: nextAvatar,
        galleryUrls: nextGallery,
      });
      setMessage(kind === "avatar" ? "Foto principal actualizada." : "Foto agregada a tus trabajos.");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos subir la foto.");
    } finally {
      setSavingProfile(false);
      event.target.value = "";
    }
  }

  async function removeGalleryImage(url: string) {
    if (!myBarber) return;
    const nextGallery = galleryUrls.filter((item) => item !== url);
    setGalleryUrls(nextGallery);
    await run(() =>
      updateMyBarberProfile({
        barberId: myBarber.id,
        displayName,
        bio,
        specialties: splitList(specialties),
        avatarUrl,
        galleryUrls: nextGallery,
      }),
    );
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
      {message ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {appointments.map((appointment) => (
            <article className="grid gap-4 border-b border-white/10 bg-white/[0.03] p-4 last:border-b-0 md:grid-cols-[1fr_auto]" key={appointment.id}>
              <div>
                <p className="font-medium">{formatTime(appointment.starts_at)} · {appointment.services?.name ?? "Servicio"}</p>
                <p className="mt-1 text-sm text-smoke/65">
                  {appointment.client?.full_name ?? appointment.guest_name ?? "Cliente registrado"} · {appointment.client?.phone ?? appointment.guest_phone ?? "Sin celular visible"}
                </p>
                {appointment.client?.description ? <p className="mt-2 text-sm text-smoke/55">{appointment.client.description}</p> : null}
                {appointment.client?.no_show_count ? <p className="mt-2 text-xs text-red-100/80">Inasistencias: {appointment.client.no_show_count}</p> : null}
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

        <aside className="space-y-5">
          <form className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5" onSubmit={(event) => void handleProfileSubmit(event)}>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-gold" />
              <h2 className="font-medium">Mi perfil</h2>
            </div>
            {myBarber ? (
              <>
                <div className="grid h-32 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-ink">
                  {avatarUrl ? <img className="h-full w-full object-cover" src={avatarUrl} alt={displayName} /> : <span className="text-sm text-smoke/45">Sin foto principal</span>}
                </div>
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm hover:bg-white/10">
                  <Camera className="h-4 w-4" />
                  Cambiar foto
                  <input className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif" type="file" onChange={(event) => void handleMediaUpload(event, "avatar")} disabled={savingProfile} />
                </label>
                <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre publico" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
                <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Especialidades separadas por coma" value={specialties} onChange={(event) => setSpecialties(event.target.value)} />
                <textarea className="min-h-20 w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Bio corta" value={bio} onChange={(event) => setBio(event.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  {galleryUrls.map((url) => (
                    <button className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]" key={url} onClick={() => void removeGalleryImage(url)} type="button" title="Quitar foto">
                      <img className="h-full w-full object-cover" src={url} alt="" />
                      <span className="absolute right-1 top-1 rounded-full bg-black/70 p-1"><X className="h-3 w-3" /></span>
                    </button>
                  ))}
                  <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] hover:bg-white/[0.07]">
                    <Plus className="h-5 w-5" />
                    <input className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif" type="file" onChange={(event) => void handleMediaUpload(event, "gallery")} disabled={savingProfile} />
                  </label>
                </div>
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 font-medium text-ink disabled:opacity-60" type="submit" disabled={savingProfile}>
                  <Save className="h-4 w-4" /> {savingProfile ? "Guardando..." : "Guardar perfil"}
                </button>
              </>
            ) : (
              <p className="text-sm leading-6 text-smoke/60">Tu cuenta todavia no esta vinculada a un perfil de barbero. Un admin debe vincularla en Accesos.</p>
            )}
          </form>

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
            <button className="w-full rounded-xl bg-white px-4 py-3 font-medium text-ink" type="submit">Enviar bloqueo</button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
