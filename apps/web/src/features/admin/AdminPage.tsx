import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Blocks, CalendarDays, Check, RefreshCw, Scissors, Settings2, ShieldCheck, Users, X } from "lucide-react";
import {
  approveScheduleBlock,
  cancelAppointment,
  linkBarber,
  listAdminBarbers,
  listAdminServices,
  listAppointments,
  listProfiles,
  listScheduleBlocks,
  listUserRoles,
  removeUserRole,
  rejectScheduleBlock,
  setUserRole,
  upsertBarber,
  upsertService,
  type AppointmentRow,
  type ProfileRow,
  type ScheduleBlockRow,
  type UserRoleRow,
} from "../../lib/bookingApi";
import { formatTime, money, todayISO } from "../../lib/formatters";
import { supabase } from "../../lib/supabase";
import type { AppRole, Barber, Service } from "../../lib/types";

type AdminSection = "operacion" | "agenda" | "catalogo" | "accesos" | "bloqueos";

const sections: Array<{ id: AdminSection; label: string; icon: typeof CalendarDays }> = [
  { id: "operacion", label: "Operacion", icon: Settings2 },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "catalogo", label: "Catalogo", icon: Scissors },
  { id: "accesos", label: "Accesos", icon: Users },
  { id: "bloqueos", label: "Bloqueos", icon: Blocks },
];

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("operacion");
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
  const [catalogServiceId, setCatalogServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDuration, setServiceDuration] = useState(45);
  const [serviceBuffer, setServiceBuffer] = useState(10);
  const [servicePrice, setServicePrice] = useState(45000);
  const [serviceActive, setServiceActive] = useState(true);
  const [serviceOrder, setServiceOrder] = useState(1);
  const [catalogBarberId, setCatalogBarberId] = useState("");
  const [catalogBarberName, setCatalogBarberName] = useState("");
  const [catalogBarberBio, setCatalogBarberBio] = useState("");
  const [catalogBarberSpecialties, setCatalogBarberSpecialties] = useState("");
  const [catalogBarberActive, setCatalogBarberActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const revenue = useMemo(
    () => appointments.filter((appointment) => appointment.status !== "cancelled").reduce((sum, appointment) => sum + (appointment.services?.price_cents ?? 0), 0),
    [appointments],
  );

  const activeServices = useMemo(() => services.filter((service) => service.active).length, [services]);
  const activeBarbers = useMemo(() => barbers.filter((barber) => barber.is_active).length, [barbers]);
  const pendingBlocks = useMemo(() => blocks.filter((block) => block.status === "pending").length, [blocks]);

  const rolesByUser = useMemo(() => {
    return roles.reduce<Record<string, AppRole[]>>((acc, role) => {
      acc[role.user_id] = [...(acc[role.user_id] ?? []), role.role];
      return acc;
    }, {});
  }, [roles]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextAppointments, nextBlocks, nextServices, nextBarbers, nextProfiles, nextRoles] = await Promise.all([
        listAppointments("admin", localDate),
        listScheduleBlocks(),
        listAdminServices(),
        listAdminBarbers(),
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
    setError(null);
    try {
      await action();
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos completar la accion.");
    }
  }

  async function handleAssignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(() => setUserRole(selectedUserId, selectedRole));
  }

  async function handleLinkBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const specialties = splitList(barberSpecialties);
    await run(() => linkBarber({ userId: selectedUserId, displayName: barberName, bio: barberBio, specialties }));
    setBarberName("");
    setBarberBio("");
    setBarberSpecialties("");
  }

  function loadServiceForEdit(serviceId: string) {
    setCatalogServiceId(serviceId);
    const service = services.find((item) => item.id === serviceId);
    if (!service) return;
    setServiceName(service.name);
    setServiceDescription(service.description ?? "");
    setServiceDuration(service.duration_min);
    setServiceBuffer(service.buffer_min);
    setServicePrice(Math.round(service.price_cents / 100));
    setServiceActive(service.active);
    setServiceOrder(service.order_index);
  }

  function resetServiceForm() {
    setCatalogServiceId("");
    setServiceName("");
    setServiceDescription("");
    setServiceDuration(45);
    setServiceBuffer(10);
    setServicePrice(45000);
    setServiceActive(true);
    setServiceOrder(services.length + 1);
  }

  async function handleSaveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(() =>
      upsertService({
        serviceId: catalogServiceId || null,
        name: serviceName,
        description: serviceDescription,
        durationMin: serviceDuration,
        bufferMin: serviceBuffer,
        priceCents: Math.max(0, Math.round(servicePrice * 100)),
        active: serviceActive,
        orderIndex: serviceOrder,
      }),
    );
    resetServiceForm();
  }

  function loadBarberForEdit(barberId: string) {
    setCatalogBarberId(barberId);
    const barber = barbers.find((item) => item.id === barberId);
    if (!barber) return;
    setCatalogBarberName(barber.display_name);
    setCatalogBarberBio(barber.bio ?? "");
    setCatalogBarberSpecialties(barber.specialties.join(", "));
    setCatalogBarberActive(barber.is_active);
  }

  function resetBarberForm() {
    setCatalogBarberId("");
    setCatalogBarberName("");
    setCatalogBarberBio("");
    setCatalogBarberSpecialties("");
    setCatalogBarberActive(true);
  }

  async function handleSaveBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(() =>
      upsertBarber({
        barberId: catalogBarberId || null,
        displayName: catalogBarberName,
        bio: catalogBarberBio,
        specialties: splitList(catalogBarberSpecialties),
        active: catalogBarberActive,
      }),
    );
    resetBarberForm();
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Admin</p>
          <h1 className="mt-3 text-4xl font-semibold">Panel operativo</h1>
          <p className="mt-2 text-sm text-smoke/60">Agenda, catalogo, accesos y bloqueos en un solo lugar.</p>
        </div>
        <div className="flex gap-2">
          <input className="rounded-xl border border-white/10 bg-ink px-3 py-3" type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} />
          <button className="rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10" onClick={() => void load()} type="button" aria-label="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Citas" value={appointments.length.toString()} />
        <Metric label="Ingresos" value={money(revenue)} />
        <Metric label="Servicios" value={`${activeServices}/${services.length}`} />
        <Metric label="Barberos" value={`${activeBarbers}/${barbers.length}`} />
        <Metric label="Bloqueos" value={pendingBlocks.toString()} />
      </section>

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
        {sections.map((item) => (
          <button key={item.id} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition ${section === item.id ? "bg-gold text-ink" : "bg-white/5 text-smoke/75 hover:bg-white/10"}`} onClick={() => setSection(item.id)} type="button">
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {section === "operacion" ? (
        <section className="grid gap-5 lg:grid-cols-3">
          <Summary title="Agenda de hoy" value={`${appointments.length} citas`} detail={`${money(revenue)} proyectados`} />
          <Summary title="Catalogo activo" value={`${activeServices} servicios`} detail={`${activeBarbers} barberos disponibles`} />
          <Summary title="Pendientes" value={`${pendingBlocks} bloqueos`} detail="Solicitudes por revisar" />
        </section>
      ) : null}

      {section === "agenda" ? <AgendaSection appointments={appointments} onCancel={(id) => void run(() => cancelAppointment(id, "Cancelada por admin"))} /> : null}

      {section === "catalogo" ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <CatalogServices
            services={services}
            form={{ catalogServiceId, serviceName, serviceDescription, serviceDuration, serviceBuffer, servicePrice, serviceActive, serviceOrder }}
            setters={{ setServiceName, setServiceDescription, setServiceDuration, setServiceBuffer, setServicePrice, setServiceActive, setServiceOrder }}
            onEdit={loadServiceForEdit}
            onReset={resetServiceForm}
            onSubmit={handleSaveService}
          />
          <CatalogBarbers
            barbers={barbers}
            form={{ catalogBarberId, catalogBarberName, catalogBarberBio, catalogBarberSpecialties, catalogBarberActive }}
            setters={{ setCatalogBarberName, setCatalogBarberBio, setCatalogBarberSpecialties, setCatalogBarberActive }}
            onEdit={loadBarberForEdit}
            onReset={resetBarberForm}
            onSubmit={handleSaveBarber}
          />
        </section>
      ) : null}

      {section === "accesos" ? (
        <AccessSection
          profiles={profiles}
          rolesByUser={rolesByUser}
          selectedUserId={selectedUserId}
          selectedRole={selectedRole}
          barberName={barberName}
          barberBio={barberBio}
          barberSpecialties={barberSpecialties}
          onUserChange={setSelectedUserId}
          onRoleChange={setSelectedRole}
          onBarberNameChange={setBarberName}
          onBarberBioChange={setBarberBio}
          onBarberSpecialtiesChange={setBarberSpecialties}
          onAssignRole={handleAssignRole}
          onLinkBarber={handleLinkBarber}
          onRemoveRole={(userId, role) => void run(() => removeUserRole(userId, role))}
        />
      ) : null}

      {section === "bloqueos" ? (
        <BlocksSection
          blocks={blocks}
          onApprove={(id) => void run(() => approveScheduleBlock(id))}
          onReject={(id) => void run(() => rejectScheduleBlock(id, "Rechazado por admin"))}
        />
      ) : null}
    </main>
  );
}

function AgendaSection({ appointments, onCancel }: { appointments: AppointmentRow[]; onCancel: (id: string) => void }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10">
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
            <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => onCancel(appointment.id)} type="button">
              <X className="h-4 w-4" /> Cancelar
            </button>
          ) : null}
        </article>
      ))}
      {!appointments.length ? <p className="bg-white/[0.03] p-5 text-sm text-smoke/60">No hay citas para esta fecha.</p> : null}
    </section>
  );
}

function CatalogServices({
  services,
  form,
  setters,
  onEdit,
  onReset,
  onSubmit,
}: {
  services: Service[];
  form: {
    catalogServiceId: string;
    serviceName: string;
    serviceDescription: string;
    serviceDuration: number;
    serviceBuffer: number;
    servicePrice: number;
    serviceActive: boolean;
    serviceOrder: number;
  };
  setters: {
    setServiceName: (value: string) => void;
    setServiceDescription: (value: string) => void;
    setServiceDuration: (value: number) => void;
    setServiceBuffer: (value: number) => void;
    setServicePrice: (value: number) => void;
    setServiceActive: (value: boolean) => void;
    setServiceOrder: (value: number) => void;
  };
  onEdit: (id: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10">
      <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 font-medium">Servicios</div>
      <div className="space-y-4 p-4">
        <div className="grid gap-2">
          {services.map((service) => (
            <button className="rounded-xl bg-white/[0.03] p-3 text-left text-sm hover:bg-white/[0.07]" key={service.id} onClick={() => onEdit(service.id)} type="button">
              <span className="block font-medium">{service.name}</span>
              <span className="text-xs text-smoke/55">
                {money(service.price_cents)} · {service.duration_min}+{service.buffer_min} min · {service.active ? "activo" : "inactivo"}
              </span>
            </button>
          ))}
        </div>
        <form className="space-y-3 border-t border-white/10 pt-4" onSubmit={onSubmit}>
          <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre del servicio" value={form.serviceName} onChange={(event) => setters.setServiceName(event.target.value)} required />
          <textarea className="min-h-16 w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Descripcion" value={form.serviceDescription} onChange={(event) => setters.setServiceDescription(event.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <NumberInput value={form.serviceDuration} min={15} max={360} onChange={setters.setServiceDuration} />
            <NumberInput value={form.serviceBuffer} min={0} max={120} onChange={setters.setServiceBuffer} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput value={form.servicePrice} min={0} onChange={setters.setServicePrice} />
            <NumberInput value={form.serviceOrder} min={0} onChange={setters.setServiceOrder} />
          </div>
          <label className="flex items-center gap-2 text-sm text-smoke/70">
            <input checked={form.serviceActive} onChange={(event) => setters.setServiceActive(event.target.checked)} type="checkbox" />
            Servicio activo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-xl bg-gold px-4 py-3 font-medium text-ink" type="submit">{form.catalogServiceId ? "Actualizar" : "Crear"} servicio</button>
            <button className="rounded-xl bg-white/5 px-4 py-3 font-medium hover:bg-white/10" onClick={onReset} type="button">Nuevo</button>
          </div>
        </form>
      </div>
    </section>
  );
}

function CatalogBarbers({
  barbers,
  form,
  setters,
  onEdit,
  onReset,
  onSubmit,
}: {
  barbers: Barber[];
  form: {
    catalogBarberId: string;
    catalogBarberName: string;
    catalogBarberBio: string;
    catalogBarberSpecialties: string;
    catalogBarberActive: boolean;
  };
  setters: {
    setCatalogBarberName: (value: string) => void;
    setCatalogBarberBio: (value: string) => void;
    setCatalogBarberSpecialties: (value: string) => void;
    setCatalogBarberActive: (value: boolean) => void;
  };
  onEdit: (id: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10">
      <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 font-medium">Barberos</div>
      <div className="space-y-4 p-4">
        <div className="grid gap-2">
          {barbers.map((barber) => (
            <button className="rounded-xl bg-white/[0.03] p-3 text-left text-sm hover:bg-white/[0.07]" key={barber.id} onClick={() => onEdit(barber.id)} type="button">
              <span className="block font-medium">{barber.display_name}</span>
              <span className="text-xs text-smoke/55">{barber.specialties.join(", ") || "Sin especialidades"} · {barber.is_active ? "activo" : "inactivo"}</span>
            </button>
          ))}
        </div>
        <form className="space-y-3 border-t border-white/10 pt-4" onSubmit={onSubmit}>
          <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre publico" value={form.catalogBarberName} onChange={(event) => setters.setCatalogBarberName(event.target.value)} required />
          <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Especialidades separadas por coma" value={form.catalogBarberSpecialties} onChange={(event) => setters.setCatalogBarberSpecialties(event.target.value)} />
          <textarea className="min-h-16 w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Bio" value={form.catalogBarberBio} onChange={(event) => setters.setCatalogBarberBio(event.target.value)} />
          <label className="flex items-center gap-2 text-sm text-smoke/70">
            <input checked={form.catalogBarberActive} onChange={(event) => setters.setCatalogBarberActive(event.target.checked)} type="checkbox" />
            Barbero activo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-xl bg-gold px-4 py-3 font-medium text-ink" type="submit">{form.catalogBarberId ? "Actualizar" : "Crear"} barbero</button>
            <button className="rounded-xl bg-white/5 px-4 py-3 font-medium hover:bg-white/10" onClick={onReset} type="button">Nuevo</button>
          </div>
        </form>
      </div>
    </section>
  );
}

function AccessSection({
  profiles,
  rolesByUser,
  selectedUserId,
  selectedRole,
  barberName,
  barberBio,
  barberSpecialties,
  onUserChange,
  onRoleChange,
  onBarberNameChange,
  onBarberBioChange,
  onBarberSpecialtiesChange,
  onAssignRole,
  onLinkBarber,
  onRemoveRole,
}: {
  profiles: ProfileRow[];
  rolesByUser: Record<string, AppRole[]>;
  selectedUserId: string;
  selectedRole: AppRole;
  barberName: string;
  barberBio: string;
  barberSpecialties: string;
  onUserChange: (value: string) => void;
  onRoleChange: (value: AppRole) => void;
  onBarberNameChange: (value: string) => void;
  onBarberBioChange: (value: string) => void;
  onBarberSpecialtiesChange: (value: string) => void;
  onAssignRole: (event: FormEvent<HTMLFormElement>) => void;
  onLinkBarber: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveRole: (userId: string, role: AppRole) => void;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-3 font-medium">
            <ShieldCheck className="h-4 w-4 text-gold" /> Roles
          </div>
          <form className="space-y-3 p-4" onSubmit={onAssignRole}>
            <UserSelect profiles={profiles} selectedUserId={selectedUserId} onUserChange={onUserChange} />
            <select className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" value={selectedRole} onChange={(event) => onRoleChange(event.target.value as AppRole)}>
              <option value="cliente">Cliente</option>
              <option value="barbero">Barbero</option>
              <option value="admin">Admin</option>
            </select>
            <button className="w-full rounded-xl bg-gold px-4 py-3 font-medium text-ink" type="submit">Asignar rol</button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 font-medium">Vincular cuenta a barbero</div>
          <form className="space-y-3 p-4" onSubmit={onLinkBarber}>
            <UserSelect profiles={profiles} selectedUserId={selectedUserId} onUserChange={onUserChange} />
            <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Nombre publico del barbero" value={barberName} onChange={(event) => onBarberNameChange(event.target.value)} required />
            <input className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Especialidades separadas por coma" value={barberSpecialties} onChange={(event) => onBarberSpecialtiesChange(event.target.value)} />
            <textarea className="min-h-20 w-full rounded-xl border border-white/10 bg-ink px-3 py-3" placeholder="Bio corta" value={barberBio} onChange={(event) => onBarberBioChange(event.target.value)} />
            <button className="w-full rounded-xl bg-white/5 px-4 py-3 font-medium hover:bg-white/10" type="submit">Vincular como barbero</button>
          </form>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10">
        <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 font-medium">Usuarios</div>
        <div className="grid gap-2 p-4 md:grid-cols-2">
          {profiles.map((profile) => (
            <div className="rounded-xl bg-white/[0.03] p-3 text-sm" key={profile.id}>
              <p className="font-medium">{profile.full_name || profile.email || "Usuario"}</p>
              <p className="mt-1 text-xs text-smoke/55">{(rolesByUser[profile.id] ?? ["sin rol"]).join(", ")}</p>
              {(rolesByUser[profile.id] ?? []).map((role) => (
                <button className="mt-2 mr-2 rounded-lg bg-white/5 px-2 py-1 text-xs hover:bg-white/10" key={role} onClick={() => onRemoveRole(profile.id, role)} type="button">
                  Quitar {role}
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function BlocksSection({ blocks, onApprove, onReject }: { blocks: ScheduleBlockRow[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
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
              <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => onApprove(block.id)} type="button">
                <Check className="h-4 w-4" /> Aprobar
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => onReject(block.id)} type="button">
                <X className="h-4 w-4" /> Rechazar
              </button>
            </div>
          ) : null}
        </article>
      ))}
      {!blocks.length ? <p className="bg-white/[0.03] p-5 text-sm text-smoke/60">No hay bloqueos registrados.</p> : null}
    </section>
  );
}

function UserSelect({ profiles, selectedUserId, onUserChange }: { profiles: ProfileRow[]; selectedUserId: string; onUserChange: (value: string) => void }) {
  return (
    <select className="w-full rounded-xl border border-white/10 bg-ink px-3 py-3" value={selectedUserId} onChange={(event) => onUserChange(event.target.value)} required>
      {profiles.map((profile) => (
        <option key={profile.id} value={profile.id}>
          {profile.full_name || profile.email || profile.id}
        </option>
      ))}
    </select>
  );
}

function NumberInput({ value, min, max, onChange }: { value: number; min: number; max?: number; onChange: (value: number) => void }) {
  return <input className="rounded-xl border border-white/10 bg-ink px-3 py-3" min={min} max={max} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-smoke/50">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Summary({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-smoke/55">{title}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-smoke/60">{detail}</p>
    </article>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
