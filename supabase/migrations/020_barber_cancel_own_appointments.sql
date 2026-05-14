create or replace function public.barber_cancel_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_barber_id uuid;
begin
  select a.barber_id into v_barber_id
  from public.appointments a
  join public.barbers b on b.id = a.barber_id
  where a.id = p_appointment_id
    and b.user_id = v_user_id
    and a.status in ('pending', 'confirmed');

  if v_barber_id is null then
    raise exception 'No tienes permiso para cancelar esta cita.';
  end if;

  update public.appointments
  set status = 'cancelled',
      updated_at = now()
  where id = p_appointment_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (
    v_user_id,
    'appointment',
    p_appointment_id,
    'barber_cancelled',
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

grant execute on function public.barber_cancel_appointment(uuid, text) to authenticated;
