import { supabase } from "./supabase";
import type { AppointmentStatus, Barber, BlockStatus, Service } from "./types";
import type { AppRole } from "./types";

export type Slot = {
  slot_time: string;
  starts_at: string;
  ends_at: string;
};

export type AppointmentRow = {
  id: string;
  client_id: string | null;
  barber_id: string;
  service_id: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  starts_at: string;
  ends_at: string;
  local_date: string;
  status: AppointmentStatus;
  notes: string | null;
  services?: Pick<Service, "name" | "duration_min" | "price_cents"> | null;
  barbers?: Pick<Barber, "display_name"> | null;
};

export type ScheduleBlockRow = {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  local_date: string;
  reason: string | null;
  status: BlockStatus;
  barbers?: Pick<Barber, "display_name"> | null;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

export type UserRoleRow = {
  user_id: string;
  role: AppRole;
};

function raise(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listServices() {
  const { data, error } = await supabase
    .from("services")
    .select("id,name,description,duration_min,buffer_min,price_cents,active,order_index")
    .eq("active", true)
    .order("order_index", { ascending: true });

  raise(error);
  return (data ?? []) as Service[];
}

export async function listAdminServices() {
  const { data, error } = await supabase
    .from("services")
    .select("id,name,description,duration_min,buffer_min,price_cents,active,order_index")
    .order("order_index", { ascending: true });

  raise(error);
  return (data ?? []) as Service[];
}

export async function listBarbers() {
  const { data, error } = await supabase
    .from("barbers")
    .select("id,display_name,bio,specialties,rating,is_active")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  raise(error);
  return (data ?? []) as Barber[];
}

export async function getAvailableSlots(barberId: string, serviceId: string, localDate: string) {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_barber_id: barberId,
    p_service_id: serviceId,
    p_local_date: localDate,
  });

  raise(error);
  return (data ?? []) as Slot[];
}

export async function bookAppointment(input: {
  barberId: string;
  serviceId: string;
  localDate: string;
  slotTime: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc("book_appointment", {
    p_barber_id: input.barberId,
    p_service_id: input.serviceId,
    p_local_date: input.localDate,
    p_slot_time: input.slotTime,
    p_guest_name: input.guestName,
    p_guest_phone: input.guestPhone,
    p_guest_email: input.guestEmail || null,
    p_notes: input.notes || null,
  });

  raise(error);
  return data as string;
}

export async function listAppointments(scope: "client" | "barber" | "admin", localDate?: string) {
  let query = supabase
    .from("appointments")
    .select("id,client_id,barber_id,service_id,guest_name,guest_phone,guest_email,starts_at,ends_at,local_date,status,notes,services(name,duration_min,price_cents),barbers(display_name)")
    .order("starts_at", { ascending: true });

  if (localDate) query = query.eq("local_date", localDate);
  if (scope === "admin") query = query.limit(200);

  const { data, error } = await query;
  raise(error);
  return (data ?? []) as unknown as AppointmentRow[];
}

export async function listScheduleBlocks() {
  const { data, error } = await supabase
    .from("schedule_blocks")
    .select("id,barber_id,starts_at,ends_at,local_date,reason,status,barbers(display_name)")
    .order("starts_at", { ascending: true })
    .limit(100);

  raise(error);
  return (data ?? []) as unknown as ScheduleBlockRow[];
}

export async function cancelAppointment(id: string, reason?: string) {
  const { error } = await supabase.rpc("cancel_appointment", { p_appointment_id: id, p_reason: reason ?? null });
  raise(error);
}

export async function confirmAppointment(id: string) {
  const { error } = await supabase.rpc("confirm_appointment", { p_appointment_id: id });
  raise(error);
}

export async function completeAppointment(id: string) {
  const { error } = await supabase.rpc("complete_appointment", { p_appointment_id: id });
  raise(error);
}

export async function markNoShow(id: string) {
  const { error } = await supabase.rpc("mark_no_show", { p_appointment_id: id });
  raise(error);
}

export async function requestScheduleBlock(input: {
  barberId: string;
  localDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
}) {
  const { error } = await supabase.rpc("request_schedule_block", {
    p_barber_id: input.barberId,
    p_local_date: input.localDate,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_reason: input.reason ?? null,
  });
  raise(error);
}

export async function approveScheduleBlock(id: string) {
  const { error } = await supabase.rpc("approve_schedule_block", { p_block_id: id });
  raise(error);
}

export async function rejectScheduleBlock(id: string, reason?: string) {
  const { error } = await supabase.rpc("reject_schedule_block", { p_block_id: id, p_reason: reason ?? null });
  raise(error);
}

export async function listProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,phone,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  raise(error);
  return (data ?? []) as ProfileRow[];
}

export async function listUserRoles() {
  const { data, error } = await supabase.from("user_roles").select("user_id,role").limit(500);

  raise(error);
  return (data ?? []) as UserRoleRow[];
}

export async function setUserRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: role });
  raise(error);
}

export async function removeUserRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc("admin_remove_user_role", { p_user_id: userId, p_role: role });
  raise(error);
}

export async function linkBarber(input: { userId: string; displayName: string; bio?: string; specialties: string[] }) {
  const { error } = await supabase.rpc("admin_link_barber", {
    p_user_id: input.userId,
    p_display_name: input.displayName,
    p_bio: input.bio ?? null,
    p_specialties: input.specialties,
  });
  raise(error);
}

export async function upsertService(input: {
  serviceId?: string | null;
  name: string;
  description?: string | null;
  durationMin: number;
  bufferMin: number;
  priceCents: number;
  active: boolean;
  orderIndex: number;
}) {
  const { error } = await supabase.rpc("admin_upsert_service", {
    p_service_id: input.serviceId ?? null,
    p_name: input.name,
    p_description: input.description ?? null,
    p_duration_min: input.durationMin,
    p_buffer_min: input.bufferMin,
    p_price_cents: input.priceCents,
    p_active: input.active,
    p_order_index: input.orderIndex,
  });
  raise(error);
}

export async function upsertBarber(input: {
  barberId?: string | null;
  displayName: string;
  bio?: string | null;
  specialties: string[];
  active: boolean;
}) {
  const { error } = await supabase.rpc("admin_upsert_barber", {
    p_barber_id: input.barberId ?? null,
    p_display_name: input.displayName,
    p_bio: input.bio ?? null,
    p_specialties: input.specialties,
    p_is_active: input.active,
  });
  raise(error);
}
