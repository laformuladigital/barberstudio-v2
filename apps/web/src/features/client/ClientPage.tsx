import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Save, XCircle } from "lucide-react";
import { useSessionContext } from "../../app/providers/SessionProvider";
import { cancelAppointment, getMyProfile, listAppointments, updateMyProfile, uploadAvatar, type AppointmentRow, type ProfileRow } from "../../lib/bookingApi";
import { formatTime } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";

export default function ClientPage() {
  const { user } = useSessionContext();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextAppointments, nextProfile] = await Promise.all([
        listAppointments("client"),
        user ? getMyProfile(user.id) : Promise.resolve(null),
      ]);
      setAppointments(nextAppointments);
      setProfile(nextProfile);
      setFullName(nextProfile?.full_name ?? "");
      setPhone(nextProfile?.phone ?? "");
      setAvatarUrl(nextProfile?.avatar_url ?? null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cargar tus citas.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("client-appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  async function handleCancel(id: string) {
    setError(null);
    try {
      await cancelAppointment(id, "Cancelada desde panel cliente");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cancelar la cita.");
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setSavingProfile(true);
    setError(null);
    setProfileMessage(null);
    try {
      const nextAvatarUrl = await uploadAvatar(user.id, file);
      setAvatarUrl(nextAvatarUrl);
      await updateMyProfile({ userId: user.id, fullName, phone, avatarUrl: nextAvatarUrl });
      setProfileMessage("Foto actualizada.");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos subir la foto.");
    } finally {
      setSavingProfile(false);
      event.target.value = "";
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setError(null);
    setProfileMessage(null);
    try {
      await updateMyProfile({ userId: user.id, fullName, phone, avatarUrl });
      setProfileMessage("Perfil actualizado.");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos actualizar tu perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Cliente</p>
        <h1 className="mt-3 text-4xl font-semibold">Mi cuenta</h1>
      </header>

      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
      {profileMessage ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{profileMessage}</p> : null}
      {loading ? <p className="text-sm text-smoke/70">Cargando historial...</p> : null}

      <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:grid-cols-[240px_1fr]">
        <div className="flex flex-col items-start gap-4">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-ink">
            {avatarUrl ? (
              <img className="h-full w-full object-cover" src={avatarUrl} alt={profile?.full_name ?? "Foto de perfil"} />
            ) : (
              <span className="text-3xl font-semibold text-gold">{(fullName || profile?.email || "U").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm hover:bg-white/10">
            <Camera className="h-4 w-4" />
            Cambiar foto
            <input className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif" type="file" onChange={(event) => void handleAvatarChange(event)} disabled={savingProfile} />
          </label>
          <p className="text-xs leading-5 text-smoke/45">Imagen publica. Maximo 1 MB.</p>
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleProfileSubmit(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-smoke/65">
              <span>Nombre</span>
              <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3 text-smoke" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Tu nombre" />
            </label>
            <label className="space-y-2 text-sm text-smoke/65">
              <span>Celular</span>
              <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3 text-smoke" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Tu celular" />
            </label>
          </div>
          <label className="space-y-2 text-sm text-smoke/65">
            <span>Email</span>
            <input className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-smoke/55" value={profile?.email ?? user?.email ?? ""} disabled />
          </label>
          <button className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-medium text-ink disabled:opacity-60" type="submit" disabled={savingProfile || !user}>
            <Save className="h-4 w-4" />
            {savingProfile ? "Guardando..." : "Guardar perfil"}
          </button>
        </form>
      </section>

      <h2 className="text-2xl font-semibold">Mis reservas</h2>
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
