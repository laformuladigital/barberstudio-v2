import { supabase } from "./supabase";
import type { AppointmentStatus, Barber, BlockStatus, Service } from "./types";

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

export async function listBarbers() {
  const { data, error } = await supabase
    .from("barbers")
    .select("id,user_id,display_name,bio,specialties,rating,is_active")
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
