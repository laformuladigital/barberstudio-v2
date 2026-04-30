create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;

  insert into public.user_roles (user_id, role)
  values (new.id, 'cliente')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.local_slot_to_timestamptz(p_local_date date, p_slot_time time)
returns timestamptz
language sql
immutable
as $$
  select (p_local_date + p_slot_time) at time zone 'America/Bogota';
$$;

create or replace function public.get_available_slots(
  p_barber_id uuid,
  p_service_id uuid,
  p_local_date date
)
returns table(slot_time time, starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duration integer;
  v_buffer integer;
  v_interval integer;
  v_total integer;
  v_day integer;
begin
  select s.duration_min, coalesce(s.buffer_min, 0)
  into v_duration, v_buffer
  from public.services s
  where s.id = p_service_id and s.active = true;

  if v_duration is null then
    raise exception 'Servicio no disponible.';
  end if;

  v_total := v_duration + v_buffer;
  v_day := extract(dow from p_local_date)::integer;

  return query
  with windows as (
    select r.start_time, r.end_time, r.slot_interval_min
    from public.availability_rules r
    join public.barbers b on b.id = r.barber_id
    where r.barber_id = p_barber_id
      and r.day_of_week = v_day
      and r.is_active = true
      and b.is_active = true
  ),
  candidates as (
    select
      gs::time as slot_time,
      public.local_slot_to_timestamptz(p_local_date, gs::time) as starts_at,
      public.local_slot_to_timestamptz(p_local_date, (gs + make_interval(mins => v_total))::time) as ends_at
    from windows w,
    lateral generate_series(
      p_local_date::timestamp + w.start_time,
      p_local_date::timestamp + (w.end_time - make_interval(mins => v_total)),
      make_interval(mins => w.slot_interval_min)
    ) gs
  )
  select c.slot_time, c.starts_at, c.ends_at
  from candidates c
  where c.starts_at > now()
    and not exists (
      select 1 from public.appointments a
      where a.barber_id = p_barber_id
        and a.status in ('pending', 'confirmed')
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)')
    )
    and not exists (
      select 1 from public.schedule_blocks b
      where b.barber_id = p_barber_id
        and b.status = 'approved'
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)')
    )
    and not exists (
      select 1 from public.availability_exceptions e
      where e.barber_id = p_barber_id
        and e.local_date = p_local_date
        and (
          e.is_closed = true or
          tstzrange(
            public.local_slot_to_timestamptz(p_local_date, e.start_time),
            public.local_slot_to_timestamptz(p_local_date, e.end_time),
            '[)'
          ) && tstzrange(c.starts_at, c.ends_at, '[)')
        )
    )
  order by c.starts_at;
end;
$$;

create or replace function public.book_appointment(
  p_barber_id uuid,
  p_service_id uuid,
  p_local_date date,
  p_slot_time time,
  p_guest_name text default null,
  p_guest_phone text default null,
  p_guest_email text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_duration integer;
  v_buffer integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_id uuid;
begin
  if v_client_id is null and (nullif(trim(coalesce(p_guest_name, '')), '') is null or nullif(trim(coalesce(p_guest_phone, '')), '') is null) then
    raise exception 'Nombre y celular son obligatorios para reservar sin cuenta.';
  end if;

  select duration_min, coalesce(buffer_min, 0)
  into v_duration, v_buffer
  from public.services
  where id = p_service_id and active = true;

  if v_duration is null then
    raise exception 'Servicio no disponible.';
  end if;

  v_starts_at := public.local_slot_to_timestamptz(p_local_date, p_slot_time);
  v_ends_at := v_starts_at + make_interval(mins => v_duration + v_buffer);

  if not exists (
    select 1 from public.get_available_slots(p_barber_id, p_service_id, p_local_date) s where s.slot_time = p_slot_time
  ) then
    raise exception 'Ese horario ya no esta disponible.';
  end if;

  insert into public.appointments (
    client_id,
    barber_id,
    service_id,
    guest_name,
    guest_phone,
    guest_email,
    starts_at,
    ends_at,
    local_date,
    notes,
    created_by
  ) values (
    v_client_id,
    p_barber_id,
    p_service_id,
    nullif(trim(coalesce(p_guest_name, '')), ''),
    nullif(trim(coalesce(p_guest_phone, '')), ''),
    nullif(trim(coalesce(p_guest_email, '')), ''),
    v_starts_at,
    v_ends_at,
    p_local_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_client_id
  ) returning id into v_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (v_client_id, 'appointment', v_id, 'booked', jsonb_build_object('barber_id', p_barber_id, 'service_id', p_service_id));

  return v_id;
exception
  when exclusion_violation then
    raise exception 'Ese horario ya no esta disponible.';
end;
$$;

create or replace function public.confirm_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para confirmar esta cita.';
  end if;

  update public.appointments set status = 'confirmed' where id = p_appointment_id;
  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action) values (v_user_id, 'appointment', p_appointment_id, 'confirmed');
end;
$$;

create or replace function public.complete_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para completar esta cita.';
  end if;

  update public.appointments set status = 'completed' where id = p_appointment_id;
  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action) values (v_user_id, 'appointment', p_appointment_id, 'completed');
end;
$$;

create or replace function public.mark_no_show(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para marcar esta cita.';
  end if;

  update public.appointments set status = 'no_show' where id = p_appointment_id;
  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action) values (v_user_id, 'appointment', p_appointment_id, 'no_show');
end;
$$;

create or replace function public.cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.appointments a where a.id = p_appointment_id and a.client_id = v_user_id) or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para cancelar esta cita.';
  end if;

  update public.appointments set status = 'cancelled' where id = p_appointment_id;
  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (v_user_id, 'appointment', p_appointment_id, 'cancelled', jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_local_date date,
  p_slot_time time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_barber_id uuid;
  v_service_id uuid;
  v_duration integer;
  v_buffer integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  select a.barber_id, a.service_id, s.duration_min, coalesce(s.buffer_min, 0)
  into v_barber_id, v_service_id, v_duration, v_buffer
  from public.appointments a
  join public.services s on s.id = a.service_id
  where a.id = p_appointment_id
    and a.status in ('pending', 'confirmed');

  if v_barber_id is null then
    raise exception 'Cita no disponible para reprogramar.';
  end if;

  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.appointments a where a.id = p_appointment_id and a.client_id = v_user_id) or
    exists (select 1 from public.barbers b where b.id = v_barber_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para reprogramar esta cita.';
  end if;

  if not exists (
    select 1 from public.get_available_slots(v_barber_id, v_service_id, p_local_date) s where s.slot_time = p_slot_time
  ) then
    raise exception 'Ese horario ya no esta disponible.';
  end if;

  v_starts_at := public.local_slot_to_timestamptz(p_local_date, p_slot_time);
  v_ends_at := v_starts_at + make_interval(mins => v_duration + v_buffer);

  update public.appointments
  set starts_at = v_starts_at, ends_at = v_ends_at, local_date = p_local_date
  where id = p_appointment_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action)
  values (v_user_id, 'appointment', p_appointment_id, 'rescheduled');
exception
  when exclusion_violation then
    raise exception 'Ese horario ya no esta disponible.';
end;
$$;

create or replace function public.request_schedule_block(
  p_barber_id uuid,
  p_local_date date,
  p_start_time time,
  p_end_time time,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_minutes integer;
  v_status public.block_status;
  v_id uuid;
begin
  if p_end_time <= p_start_time then
    raise exception 'La hora final debe ser mayor a la inicial.';
  end if;

  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers where id = p_barber_id and user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso sobre esta agenda.';
  end if;

  v_starts_at := public.local_slot_to_timestamptz(p_local_date, p_start_time);
  v_ends_at := public.local_slot_to_timestamptz(p_local_date, p_end_time);
  v_minutes := extract(epoch from (v_ends_at - v_starts_at))::integer / 60;
  v_status := case when public.has_role(v_user_id, 'admin') or v_minutes <= 90 then 'approved'::public.block_status else 'pending'::public.block_status end;

  insert into public.schedule_blocks (barber_id, starts_at, ends_at, local_date, reason, status, requested_by)
  values (p_barber_id, v_starts_at, v_ends_at, p_local_date, nullif(trim(coalesce(p_reason, '')), ''), v_status, v_user_id)
  returning id into v_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action)
  values (v_user_id, 'schedule_block', v_id, 'requested');

  return v_id;
exception
  when exclusion_violation then
    raise exception 'Ese bloqueo cruza con otro bloqueo aprobado.';
end;
$$;

create or replace function public.approve_schedule_block(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not public.has_role(v_user_id, 'admin') then
    raise exception 'Solo admin puede aprobar bloqueos.';
  end if;

  update public.schedule_blocks
  set status = 'approved', decided_by = v_user_id
  where id = p_block_id and status = 'pending';

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action)
  values (v_user_id, 'schedule_block', p_block_id, 'approved');
exception
  when exclusion_violation then
    raise exception 'Ese bloqueo cruza con otro bloqueo aprobado.';
end;
$$;

create or replace function public.reject_schedule_block(p_block_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not public.has_role(v_user_id, 'admin') then
    raise exception 'Solo admin puede rechazar bloqueos.';
  end if;

  update public.schedule_blocks
  set status = 'rejected', decided_by = v_user_id
  where id = p_block_id and status = 'pending';

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (v_user_id, 'schedule_block', p_block_id, 'rejected', jsonb_build_object('reason', p_reason));
end;
$$;

grant execute on function public.get_available_slots(uuid, uuid, date) to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, date, time, text, text, text, text) to anon, authenticated;
grant execute on function public.confirm_appointment(uuid) to authenticated;
grant execute on function public.complete_appointment(uuid) to authenticated;
grant execute on function public.mark_no_show(uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, date, time) to authenticated;
grant execute on function public.request_schedule_block(uuid, date, time, time, text) to authenticated;
grant execute on function public.approve_schedule_block(uuid) to authenticated;
grant execute on function public.reject_schedule_block(uuid, text) to authenticated;
