import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, UserCog, X } from "lucide-react";
import {
  approveScheduleBlock,
  cancelAppointment,
  linkBarber,
  listAppointments,
  listBarbers,
  listProfiles,
  listScheduleBlocks,
  listServices,
  listUserRoles,
  removeUserRole,
  rejectScheduleBlock,
  setUserRole,
  type AppointmentRow,
  type ProfileRow,
  type ScheduleBlockRow,
  type UserRoleRow,
} from "../../lib/bookingApi";
import { formatTime, money, todayISO } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { AppRole, Barber, Service } from "../../lib/types";

export default function AdminPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlockRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [localDate, setLocalDate] = useState(todayISO());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("barbero");
  const [barberName, setBarberName] = useState("");
  const [barberBio, setBarberBio] = useState("");
  const [barberSpecialties, setBarberSpecialties] = useState("");
  const [error, setError] = useState<string | null>(null);

  const revenue = useMemo(
    () => appointments.filter((appointment) => appointment.status !== "cancelled").reduce((sum, appointment) => sum + (appointment.services?.price_cents ?? 0), 0),
    [appointments],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextAppointments, nextBlocks, nextServices, nextBarbers, nextProfiles, nextRoles] = await Promise.all([
        listAppointments("admin", localDate),
        listScheduleBlocks(),
        listServices(),
        listBarbers(),
        listProfiles(),
        listUserRoles(),
      ]);
      setAppointments(nextAppointments);
      setBlocks(nextBlocks);
      setServices(nextServices);
      setBarbers(nextBarbers);
      setProfiles(nextProfiles);
      setRoles(nextRoles);
      setSelectedUserId((current) => current || nextProfiles[0]?.id || "");
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

  const rolesByUser = useMemo(() => {
    return roles.reduce<Record<string, AppRole[]>>((acc, role) => {
      acc[role.user_id] = [...(acc[role.user_id] ?? []), role.role];
      return acc;
    }, {});
  }, [roles]);

  async function handleAssignRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(() => setUserRole(selectedUserId, selectedRole));
  }

  async function handleLinkBarber(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const specialties = barberSpecialties
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    await run(() => linkBarber({ userId: selectedUserId, displayName: barberName, bio: barberBio, specialties }));
    setBarberName("");
    setBarberBio("");
    setBarberSpecialties("");
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
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-3 font-medium">
              <UserCog className="h-4 w-4 text-gold" /> Accesos
            </div>
            <div className="space-y-4 p-4">
              <form className="space-y-3" onSubmit={(event) => void handleAssignRole(event)}>
                <select className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} required>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email || profile.id}
                    </option>
                  ))}
                </select>
                <select className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as AppRole)}>
                  <option value="cliente">Cliente</option>
                  <option value="barbero">Barbero</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="w-full rounded-xl bg-gold px-4 py-3 font-medium text-ink" type="submit">Asignar rol</button>
              </form>

              <form className="space-y-3 border-t border-white/10 pt-4" onSubmit={(event) => void handleLinkBarber(event)}>
                <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre publico del barbero" value={barberName} onChange={(event) => setBarberName(event.target.value)} required />
                <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Especialidades separadas por coma" value={barberSpecialties} onChange={(event) => setBarberSpecialties(event.target.value)} />
                <textarea className="min-h-20 w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Bio corta" value={barberBio} onChange={(event) => setBarberBio(event.target.value)} />
                <button className="w-full rounded-xl bg-white/5 px-4 py-3 font-medium hover:bg-white/10" type="submit">Vincular como barbero</button>
              </form>

              <div className="space-y-2 border-t border-white/10 pt-4">
                {profiles.slice(0, 8).map((profile) => (
                  <div className="rounded-xl bg-white/[0.03] p-3 text-sm" key={profile.id}>
                    <p className="font-medium">{profile.full_name || profile.email || "Usuario"}</p>
                    <p className="mt-1 text-xs text-smoke/55">{(rolesByUser[profile.id] ?? ["sin rol"]).join(", ")}</p>
                    {(rolesByUser[profile.id] ?? []).map((role) => (
                      <button className="mt-2 mr-2 rounded-lg bg-white/5 px-2 py-1 text-xs hover:bg-white/10" key={role} onClick={() => void run(() => removeUserRole(profile.id, role))} type="button">
                        Quitar {role}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

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
